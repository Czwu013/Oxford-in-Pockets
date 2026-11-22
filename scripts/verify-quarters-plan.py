"""Check exclusive street-block ownership and compare every added outline with raw OSM."""
import argparse
import gzip
import json
import math
from itertools import combinations
from pathlib import Path
from xml.etree import ElementTree

from shapely import make_valid
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union

root = Path(__file__).resolve().parents[1]
args = argparse.ArgumentParser(description=__doc__)
args.add_argument('--out', type=Path)
options = args.parse_args()
def read(path):
    return json.loads((root / path).read_text(encoding='utf-8'))
def as_shape(rings):
    return make_valid(Polygon(rings[0], rings[1:]))
def union(shapes):
    return unary_union([as_shape(r) for r in shapes])

district = read('src/data/quarters.json')
city = read('src/data/city.json')
mag = read('src/magdalen/data/buildings.json')
outside = read('src/data/quarter-context.json')
lon, lat = city['origin']
with gzip.open(root / 'geo/central-oxford.osm.gz') as f:
    xml = ElementTree.parse(f).getroot()
points = {n.get('id'): ((float(n.get('lon')) - lon) * 111320 * math.cos(math.radians(lat)),
                        (lat - float(n.get('lat'))) * 111260) for n in xml.iterfind('node')}
ways = {w.get('id'): w for w in xml.iterfind('way')}
surveyed_trees = {tuple(round(v,2) for v in points[n.get('id')]) for n in xml.iterfind('node')
                  if any(t.get('k')=='natural' and t.get('v')=='tree' for t in n.findall('tag'))}
rels = {r.get('id'): r for r in xml.iterfind('relation')}
def raw_line(key):
    return LineString([points[n.get('ref')] for n in ways[key].findall('nd')])
def source(key):
    if key.startswith('w'):
        return make_valid(Polygon(raw_line(key[1:])))
    members = rels[key[1:]].findall('member')
    def parts(inner):
        return unary_union(list(polygonize([raw_line(m.get('ref')) for m in members
                                if m.get('type') == 'way' and (m.get('role') == 'inner') == inner])))
    return parts(False).difference(parts(True))

city_buildings = {}
for key, rings, *_ in city['buildings']:
    city_buildings.setdefault(key, []).append(rings)
site = {k: union(q['boundary']) for k, q in district.items()}
mag_mask = Polygon(read('src/magdalen/data/site.json')['boundary']['outer'])
seen = set()
areas = {}
anchors = {'market': ['w311136298'], 'radcliffe': ['w27582068','w62333303','w60903334'],
           'christ': ['w24448698','w24450278'], 'museum': ['w90709819','w99873920'],
           'castle': ['w310062039','w263943861'],
           'ashmolean':['r1337584','w134120759','w130731852','w110348109'],
           'carfax':['w311139684','r12885061'],
           'newcollege':['r11267','w23762392','w126369404','w23950697','w23950708','r3961794','w126369479'],
           'merton':['w39606739','w228196820','w301499001','w301498998','w301499011','w60860866'],
           'balliol':['w296615757','w296615723','w296615727','w296618260','w296618261','w988287259'],
           'queens':['w27151764','w27151753','w27042203','w27042135','w62091706','r3934095'],
           'univ':['w297913656','w297525327','w297525287','w112557741','w991999348','w60860891','w297525306'],
           'trinity':['w23184304','w23184279','w23184300','w23184387','w29390262','w61538711','w1477573300','w1477573301']}
for key, q in district.items():
    owned = set(q['core']) | set(q['buildings'])
    assert seen.isdisjoint(owned) and set(anchors[key]) <= owned
    minimum={'merton':(30,3.0),'balliol':(48,1.8),'trinity':(29,3.3),'queens':(32,2.3),'univ':(52,2.3)}.get(key,(30,3.5))
    assert len(owned)>=minimum[0] and q['hectares']>=minimum[1]
    assert abs(q['hectares'] - site[key].area/10000) < .02
    assert site[key].intersection(mag_mask).area < 1
    seen.update(owned)
    errors = {}
    cover = {}
    for osm in q['buildings']:
        b = union(city_buildings[osm])
        raw = source(osm)
        errors[osm] = b.boundary.hausdorff_distance(raw.boundary)
        cover[osm] = b.intersection(site[key]).area / b.area
        if osm=='w39607640':
            assert key=='merton' and .96<cover[osm]<.97
            assert b.difference(unary_union([site[key],mag_mask])).area<.1
        else:assert cover[osm] >= .97, (key, osm, cover[osm])
        assert errors[osm] < 1.1, (key, osm, errors[osm])
    areas[key] = {'hectares':q['hectares'], 'core':len(q['core']), 'additional':len(q['buildings']),
                  'totalDistinctOutlines':len(owned), 'worstPlanDeviationMetres':round(max(errors.values()),3),
                  'minAreaFractionInOwnPocket':round(min(cover.values()),4),
                  'mappedTrees':sum((round(x,2),round(z,2)) in surveyed_trees for x,z,*_ in q['trees']),
                  'illustratedTrees':sum((round(x,2),round(z,2)) not in surveyed_trees for x,z,*_ in q['trees']),
                  'mappedStreetFurniture':len(q['furniture'])}
overlaps = {a+'/'+b:round(site[a].intersection(site[b]).area,3) for a,b in combinations(site,2)}
# Simplifying adjacent encoded boundaries to 13 cm can leave tiny slivers at the street edge.
assert max(overlaps.values()) < 3, overlaps
outside_controls = ['w1302704363','w65237631']
full = unary_union([*site.values(),mag_mask])
for key in outside_controls:
    assert key not in seen and full.distance(union(city_buildings[key]).representative_point()) > 2
near = [b['id'] for b in mag if b['role']=='context' and b['id'] not in
        {'w297556577','w77881441','w297556575'}]
assert len(mag) == 40 and len(near) == 28
assert {'r12631160','r12631157','w297560118','w38255376','w112185735'} <= set(near)
assert all(len(outside[h])>0 for h in ('streets','water','green'))
new_volumes={}
for place,field,key in [('ashmolean','museumVolumes','r1337584'),('ashmolean','taylorVolumes','w134120759'),
                        ('carfax','hallVolumes','r12885061'),('newcollege','chapelVolumes','w23762392'),
                        ('merton','chapelVolumes','w39606739'),('merton','treasuryVolumes','w991996414'),
                        ('trinity','gardenRoofs','w23184300'),('trinity','jacksonRoofs','w23184387'),
                        ('queens','frontVolumes','w27151764'),('queens','backVolumes','w27151079'),
                        ('queens','churchVolumes','w62091706'),('univ','examVolumes','w60860891')]:
    raw=union(city_buildings[key])
    assembled=unary_union([union(pieces) for pieces in district[place][field].values() if pieces])
    delta=raw.symmetric_difference(assembled).area/raw.area
    assert delta<.002, (key,delta)
    new_volumes[key]={'relativePlanAreaDifference':round(delta,6),'parts':list(district[place][field])}
memorial=Point(district['ashmolean']['memorial'])
high_gates=district['univ']['gateTowers']
for i,key in enumerate(['164759799','1036514183']):
    corridor=raw_line(key)
    gate=union(high_gates[i]['shapes'])
    assert gate.buffer(.08).covers(corridor) and corridor.distance(LineString(high_gates[i]['axis']))<.02
front_ids=['w297760074','w297913656','w297525322','w297525323','w297525327','w297525330']
survey_front=unary_union([union(city_buildings[key]) for key in front_ids])
parts=unary_union([union(district['univ']['frontRanges']),*(union(g['shapes']) for g in high_gates)])
assert parts.symmetric_difference(survey_front).area/survey_front.area<.002
crossing=Point(district['queens']['crossing'])
assert crossing.distance(Point(points['9044228868']))<.01
assert site['queens'].distance(crossing)<.12 and site['univ'].distance(crossing)<.12
assert memorial.distance(Point(points['16252895'])) < .01
assert len(district['ashmolean']['buildings'])==37 and len(district['carfax']['buildings'])==103
castle_section=read('src/data/castle-section.json')
stream=union(castle_section['stream'])
assert stream.difference(site['castle']).area<.7
wet_length=sum(LineString(l).length for l in castle_section['wet'])
assert wet_length>8 and abs(wet_length+sum(LineString(l).length for l in castle_section['dry'])-site['castle'].boundary.length)<.15
report={'districts':areas, 'originalMagdalenOutlines':len(mag), 'restoredMagdalenOutlines':near,
        'newDistrictOutlines':sum(areas[k]['totalDistinctOutlines'] for k in ('queens','univ')),
        'previousCivicDistrictOutlines':140,'newBuildingVolumes':new_volumes,'memorialOsmNode':'n16252895',
        'additionalMappedOutlines':sum(q['additional'] for q in areas.values()),
        'wholeBuildingOwnershipAcrossPockets':True,'neutralControlIds':outside_controls,
        'castleStreamAtTableEdgeMetres':round(wet_length,2),
        'boundaryOverlapSquareMetres':overlaps, 'geometryReference':'bundled OpenStreetMap extract'}
if options.out:
    options.out.parent.mkdir(parents=True,exist_ok=True)
    options.out.write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
