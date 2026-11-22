"""Register the two new pockets and cut surveyed paving/roof areas for the detailed meshes."""
import gzip
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from shapely import make_valid
from importlib import import_module

base = import_module('prepare')
root = Path(__file__).resolve().parents[1]
datafile = root / 'src/data/city.json'
data = json.loads(datafile.read_text('utf8'))
xml = ET.parse(gzip.open(root / 'geo/central-oxford.osm.gz')).getroot()
nodes = {e.get('id'): base.project(e.get('lon'), e.get('lat')) for e in xml.iterfind('node')}
ways = {e.get('id'): [nodes[n.get('ref')] for n in e.findall('nd') if n.get('ref') in nodes] for e in xml.iterfind('way')}
def line(k): return [base.xy(p) for p in ways[k]]
def rings(g): return [base.rings(p) for p in base.components(g,'Polygon') if p.area > .2]
def poly(b): return Polygon(b[1][0], b[1][1:])
keyed = {b[0]: b for b in data['buildings']}
for id in ['w30668669', 'r12557836', 'r12557835', 'w30668671','w928211087','w928211090']:
    keyed[id][3] = 'castle'
keyed['w25999883'][3] = 'museum'
keyed['w301650408'][3] = 'radcliffe'
# A long west face runs from the north jamb to the south jamb. Depth points into the hall.
a,b = (-668.53,-771.08),(-647.94,-715.60)
L = math.dist(a,b)
ux,uz=(b[0]-a[0])/L,(b[1]-a[1])/L
ox,oz=(a[0]+b[0])/2,(a[1]+b[1])/2
def mp(u,v):return (ox+ux*u+uz*v,oz+uz*u-ux*v)
def region(x0,x1,y0,y1):return Polygon([mp(x0,y0),mp(x1,y0),mp(x1,y1),mp(x0,y1)])
hall=region(-16.76,16.76,11.1,44.62)
building=poly(keyed['w25999883'])
rear=building.difference(unary_union([region(-30.05,30.05,-2,10.03),hall]))
square=Polygon(ways['1675893']) if ways['1675893'][0]==ways['1675893'][-1] else Polygon(ways['1675893']).convex_hull
exclusions=unary_union([poly(q) for q in data['buildings'] if poly(q).distance(square)<1])
market=data['avenues']
def write(name,value):
    (root/'src/data'/name).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),'utf8')
castleYard=Polygon(ways['930688461'])
quad=json.loads((root/'src/data/quad.json').read_text('utf8'))
terrace=next(Polygon(r,holes) for _,r,holes in quad['surfaces'] if holes and Polygon(r).area>3500)
gate_axis=LineString([(-706,189.65),(-681,187.65)]).buffer(2.52,cap_style='flat')
terrace=terrace.difference(gate_axis)
stair_ids=['958210045','958210047','958210051','958210053','958210055','958210057','958210058','958210061','1375310016','1375310018']
stream_window=Polygon([(-1220,-5),(-1190,-8),(-1161,68),(-1166,80),(-1208,80)])
stream=unary_union([Polygon(r[0],r[1:]) for r in data['water']]).intersection(stream_window)
castle_wall=[l for l in data['walls'] if len(l)==5 and -1179<l[0][0]<-1134 and LineString(l).distance(Point(-1175,33))<15]
from shapely import constrained_delaunay_triangles
def roof_facets(shell):
    facets=[]
    # Mitred inward offsets follow each individual prison wing through valleys
    # and junctions. Constrain every triangle to its roof patch.
    for low,high in [(0,1),(1,2.8),(2.8,4.2),(4.2,5.8),(5.8,8.2),(8.2,80)]:
        outer=shell.buffer(-low,join_style='mitre') if low else shell
        inner=shell.buffer(-high,join_style='mitre')
        for p in base.components(outer.difference(inner),'Polygon'):
            for tri in constrained_delaunay_triangles(p).geoms:
                facets.append([[*base.xy(c),round(min(4.25,shell.boundary.distance(Point(c))*.60),2)] for c in list(tri.exterior.coords)[:3]])
    return facets
d={
    'museum':{'origin':[ox,oz],'axis':[ux,uz],'rear':rings(rear),'lawn':line('25999878')[:-1],
              'steps':line('228791248'),'hallUV':[-16.76,16.76,11.1,44.62],'roofs':roof_facets(rear)},
    'castle':{'mound':line('29088506')[:-1],'summit':[-1139.65,-34.5],'yard':rings(make_valid(castleYard)),'stream':rings(stream),'walls':castle_wall,
              'path':line('117620133'),'westPath':line('292574269'),'steps':line('927985579'),'wellSteps':line('1181877777'),'wingRoofs':{k:roof_facets(poly(keyed[k])) for k in ['w30668671','w928211090']}},
    'quadRoofs':{id:roof_facets(Polygon(rr[0],rr[1:])) for id,rr,h in json.loads((root/'src/data/quad.json').read_text('utf8'))['wings']},
    'square':rings(make_valid(square).difference(exclusions)),
    'terraces':rings(terrace),'quadSteps':[line(k) for k in stair_ids],
    'marketKiosk':base.xy(nodes['320957309']),
    'survey':{'museum':'w25999883','castleTower':'w30668669','dWing':'r12557836','debtors':'r12557835','motte':'r12555898','oldPrison':'w30668671','squareSurface':'w1675893','castleYard':'w930688461','museumLawn':'w25999878'}
}
write('districts.json',d)
write('city.json',data)
print('Museum west front %.2f m; court %.1f square metres; motte peak 18 m; sites'% (L,hall.area), {k:sum(b[3]==k for b in data['buildings']) for k in ['castle','museum']})
