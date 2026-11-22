"""Check the exported plan against the bundled OSM data independently of the renderer."""
import argparse
import gzip
import json
import math
from pathlib import Path
from xml.etree import ElementTree

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union, polygonize

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=Path)
options = parser.parse_args()
city = json.loads((root / 'src/data/city.json').read_text('utf-8'))
quad = json.loads((root / 'src/data/quad.json').read_text('utf-8'))
district = json.loads((root / 'src/data/districts.json').read_text('utf-8'))
with gzip.open(root / 'geo/central-oxford.osm.gz', 'rb') as stream:
    xml = ElementTree.parse(stream).getroot()
lon, lat = city['origin']
nodes = {
    el.get('id'): ((float(el.get('lon'))-lon)*111320*math.cos(math.radians(lat)),
                   (lat-float(el.get('lat')))*111260)
    for el in xml.findall('node')
}
ways = {el.get('id'): el for el in xml.findall('way')}
relations = {el.get('id'): el for el in xml.findall('relation')}

def osm_line(key):
    return LineString([nodes[nd.get('ref')] for nd in ways[key].findall('nd')])

def osm_ring(key):
    return Polygon(osm_line(key))

def osm_footprint(key):
    if key[0]=='w':
        return osm_ring(key[1:])
    members=relations[key[1:]].findall('member')
    def shells(inner):
        lines=[osm_line(m.get('ref')) for m in members if m.get('type')=='way' and (m.get('role')=='inner')==inner]
        return unary_union(list(polygonize(lines)))
    return shells(False).difference(shells(True))

markers = [('Radcliffe Camera','4884600',quad['cameraBase']),
           ('Tom Tower','146574165',quad['tomBase']),
           ('Mercury Fountain','569971017',city['anchors']['mercury'])]
errors = {label: round(osm_ring(key).centroid.distance(Point(pos)),3) for label,key,pos in markers}
assert max(errors.values()) < .12, errors
records = {b[0]: b for b in city['buildings']}
assert 'w243977516' not in records and 'r3369170' not in records, 'Underground Gladstone Link appeared above ground'
assert len(records['r62123'][1]) > 1, 'The Old Schools Quadrangle must be open'
assert {b[3] for b in city['buildings'] if b[3]} == {'radcliffe','christ','market','museum','castle'}
assert len({a[0] for a in city['avenues']}) == 4
assert all(b[6] for b in city['buildings'])
main = osm_ring('3663178')
for lane, sections in city['avenues']:
    assert main.buffer(1.2).covers(LineString(sections)), f'Avenue {lane} left the site outline'
tom_wings = unary_union([Polygon(r[0],r[1:]) for _,r,_ in quad['wings']])
passage = LineString([(-714.4,190.1),(-702.5,189.4),(-690.25,188.42),(-679.8,187.55)])
assert tom_wings.distance(passage) > 1.0, 'The thoroughfare must clear both wings'
church = records['w60903337'][1]
catte = LineString([(-469.3,-81.1),(-475.5,-99.7),(-482.4,-119.6),(-487.8,-134.2)])
assert Polygon(church[0],church[1:]).distance(catte) > 1.0
def footprint(key):
    rr=records[key][1]
    return Polygon(rr[0],rr[1:])

survey=district['survey']
plan_deviation={}
for role in ['museum','castleTower','dWing','debtors','oldPrison']:
    key=survey[role]
    raw=osm_footprint(key)
    plan_deviation[role]=round(footprint(key).boundary.hausdorff_distance(raw.boundary),3)
assert max(plan_deviation.values())<.5, plan_deviation
sf,wing,debt=(footprint(survey[k]) for k in ['castleTower','dWing','debtors'])
assert sf.distance(wing)<.65 and wing.distance(debt)<.65
castle=district['castle']
motte=Polygon(castle['mound'])
assert motte.contains(Point(castle['summit']))
assert motte.boundary.hausdorff_distance(osm_footprint(survey['motte']).boundary)<.15
assert records[survey['castleTower']][2]==24.4
prison_site=unary_union([footprint(v[0]) for v in records.values() if v[3]=='castle'])
yard_walk=LineString([(-1126.6,1.9),(-1136.3,8.4),(-1146.8,12.9),(-1157.3,15.7)])
assert yard_walk.distance(prison_site)>1
museum=district['museum']
origin=museum['origin'];axis=museum['axis']
def museum_point(u,v):
    return origin[0]+axis[0]*u+axis[1]*v,origin[1]+axis[1]*u-axis[0]*v
west=LineString([museum_point(-29.59,0),museum_point(29.59,0)])
main=footprint(survey['museum'])
assert max(Point(p).distance(main.boundary) for p in west.coords)<.3
a,b,c,d=museum['hallUV']
hall=Polygon([museum_point(a,c),museum_point(a,d),museum_point(b,d),museum_point(b,c)])
assert main.buffer(.1).covers(hall)
assert all(Polygon(r[0],r[1:]).intersection(hall).area<.24 for r in museum['rear'])
for name,way in [('steps','228791248')]:
    assert LineString(museum[name]).hausdorff_distance(osm_line(way))<.02
assert Point(district['marketKiosk']).distance(Point(nodes['320957309']))<.01
assert min(Point(p).distance(Point(-689.41,-749.39)) for p in city['trees'])<.02
assert len(district['quadSteps'])==10 and district['terraces']
steps=['958210045','958210047','958210051','958210053','958210055','958210057','958210058','958210061','1375310016','1375310018']
assert all(LineString(f).hausdorff_distance(osm_line(k))<.01 for f,k in zip(district['quadSteps'],steps))
report={'originWgs84':city['origin'],'extentMetres':city['bounds'],
        'buildingFootprintsOutsideMagdalen':len(city['buildings']),'roadSections':len(city['streets']),
        'centreAlignmentErrorsMetres':errors,'marketAvenues':4,'aboveGroundOnly':True,
        'tomWingClearanceMetres':round(tom_wings.distance(passage),2),
        'catteClearanceFromUniversityChurchMetres':round(Polygon(church[0],church[1:]).distance(catte),2),
        'maximumBoundaryDeviationFromBundledOsmMetres':plan_deviation,
        'castleWalkClearanceMetres':round(yard_walk.distance(prison_site),2),
        'museumWestFrontMetres':round(west.length,2),'museumGlazedCourtAreaSqMetres':round(hall.area,2),
        'distinctTomQuadStairRuns':len(steps),'castleTowerHeightTagMetres':24.4}
if options.out:
    options.out.parent.mkdir(parents=True,exist_ok=True)
    options.out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
