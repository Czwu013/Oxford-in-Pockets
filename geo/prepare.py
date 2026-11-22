"""Rebuild the city plan from one or more offline OSM XML / XML.GZ extracts."""
import argparse, gzip, json, math, re
from pathlib import Path
import xml.etree.ElementTree as ET
from shapely import make_valid
from shapely.geometry import LineString, Polygon, Point, box
from shapely.ops import polygonize, unary_union

ROOT=Path(__file__).resolve().parents[1]
ORIGIN=(-1.24645,51.75190)
def project(lon,lat):
    return ((float(lon)-ORIGIN[0])*111320*math.cos(math.radians(ORIGIN[1])),(ORIGIN[1]-float(lat))*111260)
def xy(p): return [round(v,2) for v in p[:2]]
def components(g,kind):
    if g.is_empty:return
    if g.geom_type==kind:yield g
    elif hasattr(g,'geoms'):
        for sub in g.geoms:yield from components(sub,kind)
def rings(g):return [list(map(xy,r.coords[:-1])) for r in [g.exterior,*g.interiors]]
def numerical(v):
    m=re.match(r'\d+(?:\.\d+)?',v or '')
    return float(m[0]) if m else None

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('sources',type=Path,nargs='+'); args=ap.parse_args()
    nodes={}; ways={};rels={}
    for p in args.sources:
        with (gzip.open(p,'rb') if p.suffix=='.gz' else p.open('rb')) as f:root=ET.parse(f).getroot()
        for el in root:
            key=el.get('id');tags={i.get('k'):i.get('v') for i in el.findall('tag')}
            if el.tag=='node':nodes[key]=project(el.get('lon'),el.get('lat'))
            elif el.tag=='way':ways[key]=([i.get('ref') for i in el.findall('nd')],tags)
            elif el.tag=='relation':rels[key]=([(i.get('ref'),i.get('role')) for i in el.findall('member') if i.get('type')=='way'],tags)
    boundary=box(-1340,-920,325,430)
    mag=json.loads((ROOT/'src/magdalen/data/site.json').read_text('utf8'))
    cut=Polygon(mag['boundary']['outer']);outside=boundary.difference(cut)
    mag_builds={b['id'] for b in json.loads((ROOT/'src/magdalen/data/buildings.json').read_text('utf8'))}
    lines={k:LineString([nodes[n] for n in ns]) for k,(ns,_) in ways.items() if len(ns)>1 and all(n in nodes for n in ns)}
    def category(t):
        if t.get('location')=='underground' or (t.get('building') and (t.get('layer','').startswith('-') or t.get('building:levels')=='0' and 'building:levels:underground' in t)):return None
        if t.get('building') and t['building']!='no':return 'building'
        if t.get('natural')=='water' or t.get('waterway')=='riverbank':return 'water'
        if t.get('landuse') in ('grass','meadow','recreation_ground','village_green','allotments') or t.get('leisure') in ('garden','park','pitch') or t.get('natural') in ('wood','grassland','scrub'):return 'green'
    skip={}; shapes=[]
    for k,(members,t) in rels.items():
        cat=category(t)
        if not cat or t.get('type')!='multipolygon':continue
        outer=[w for w,r in members if r!='inner' and w in lines]; inner=[w for w,r in members if r=='inner' and w in lines]
        if not any(lines[w].intersects(boundary) for w in outer):continue
        pol=unary_union(list(polygonize([lines[w] for w in outer])))
        if inner:pol=pol.difference(unary_union(list(polygonize([lines[w] for w in inner]))))
        if not pol.is_empty:
            shapes.append(('r'+k,t,cat,pol));skip.setdefault(cat,set()).update(outer)
    streets=[]; waters=[]; greens=[]; buildings=[]; avenues=[]; anchors={}; trees=[]
    for k,(ns,t) in ways.items():
        line=lines.get(k)
        if line is None or not line.intersects(boundary):continue
        cat=category(t)
        if k in ['146574165','569971017']:
            anchors['tom' if k=='146574165' else 'mercury']=xy(Polygon(line.coords).centroid.coords[0])
        if ns[0]==ns[-1] and len(ns)>3 and cat and k not in skip.get(cat,set()):
            shapes.append(('w'+k,t,cat,make_valid(Polygon(line.coords))))
        av=re.fullmatch(r'Avenue ([1-4])',t.get('name',''))
        if av:avenues.append([int(av[1]),[xy(pt) for pt in line.coords]])
        typ=t.get('highway');name=t.get('name','')
        if typ not in ('primary','secondary','tertiary','residential','unclassified','pedestrian','service','living_street','footway','path','cycleway','steps') or t.get('area')=='yes' or t.get('indoor')=='yes' or av or t.get('tunnel')=='yes':continue
        for ls in components(line.intersection(outside),'LineString'):
            if ls.length>1: streets.append([typ,[xy(pt) for pt in ls.simplify(.2).coords]])
    christ={'w24075773','w24077527','w146575301','w148100589','w359895136','w359895135','w849367647','w849367648','w931780661','w931780662','w931780663','w146575287','r16349512','w958210074','w958210075','w958210077','w135228306'}
    for k,t,cat,g in shapes:
        if g.is_empty or not g.intersects(boundary):continue
        if not g.is_valid:g=make_valid(g)
        if cat=='building' and (k in mag_builds or cut.covers(g.representative_point())):continue
        clip=boundary if cat=='building' else outside
        for poly in components(g.intersection(clip).simplify(.16,preserve_topology=True),'Polygon'):
            if poly.area<3:continue
            rr=rings(poly)
            if cat=='water':waters.append(rr);continue
            if cat=='green':greens.append(rr);continue
            pid='radcliffe' if k in ('w4884600','r62123','w60903337') else 'market' if k in ('w3663178','w1278860864','w1278861296','w1278861923') else 'christ' if k in christ else ''
            h=numerical(t.get('height'));levels=numerical(t.get('building:levels'));kind=t.get('building','yes')
            if not h: h=levels*3.15+1.5 if levels else min(19,5.2+math.sqrt(poly.area)*.31)+(int(k[1:])%5)*.48
            provenance='OSM height' if numerical(t.get('height')) else 'estimated from OSM levels' if levels else 'estimated from footprint'
            buildings.append([k,rr,round(max(2.3,min(h,65)),2),pid,kind,t.get('name','') if pid else '',provenance])
            if k in ('w4884600','w3663178','w60903337','r62123','w931780662'):anchors[k]=xy(poly.centroid.coords[0])
    riverland=boundary.difference(cut).difference(unary_union([Polygon(r[0],r[1:]) for r in waters]))
    pl=sorted(components(riverland.simplify(.16,preserve_topology=True),'Polygon'),key=lambda g:-g.area)
    grid={}
    for key,(refs,t) in ways.items():
        if t.get('barrier') not in ('wall','retaining_wall') or key not in lines:continue
        l=lines[key]
        if l.length>4 and l.intersects(outside):grid[key]=[xy(p) for p in l.simplify(.4).coords]
    # Surveyed tree points remain greyscale in the city context.
    for p in args.sources:
        with (gzip.open(p,'rb') if p.suffix=='.gz' else p.open('rb')) as f:
            for el in ET.parse(f).getroot().iterfind('node'):
                if any(a.get('k')=='natural' and a.get('v')=='tree' for a in el.findall('tag')):
                    q=nodes[el.get('id')];
                    if outside.contains(Point(q)):trees.append(tuple(xy(q)))
    result=dict(origin=ORIGIN,bounds=boundary.bounds,buildings=buildings,streets=streets,water=waters,green=greens,land=[rings(v) for v in pl],avenues=avenues,anchors=anchors,trees=sorted(set(trees)),walls=list(grid.values()))
    dest=ROOT/'src/data/city.json';dest.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print(len(buildings),'buildings',len(streets),'street segments',len(set(trees)),'trees',len(avenues),'avenue sections',anchors)
if __name__=='__main__':main()
