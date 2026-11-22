"""Compile mapped street blocks, college parcels and their public realm."""
import gzip
import json
import math
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from shapely import constrained_delaunay_triangles, make_valid, set_precision
from shapely.geometry import LineString, Point, Polygon, box
from shapely.affinity import affine_transform
from shapely.ops import polygonize, unary_union
from shapely.strtree import STRtree
from prepare import project, rings, components, xy, numerical

root = Path(__file__).resolve().parents[1]
directory = root / 'src/data'
city = json.loads((directory/'city.json').read_text('utf8'))
with gzip.open(root/'geo/central-oxford.osm.gz') as stream:
    xml = ET.parse(stream).getroot()

def properties(el):
    return {p.get('k'):p.get('v') for p in el.findall('tag')}

nodes = {p.get('id'):project(p.get('lon'),p.get('lat')) for p in xml.iterfind('node')}
tags, lines, areas, named = {}, {}, {}, defaultdict(list)
for way in xml.iterfind('way'):
    key = 'w'+way.get('id')
    points = [nodes[n.get('ref')] for n in way.findall('nd') if n.get('ref') in nodes]
    tags[key] = tag = properties(way)
    if len(points)<2: continue
    lines[key] = path = LineString(points)
    if tag.get('highway') and tag.get('name'): named[tag['name']].append(path)
    if len(points)>3 and path.is_closed: areas[key] = make_valid(Polygon(points))
for rel in xml.iterfind('relation'):
    key = 'r'+rel.get('id')
    tags[key] = tag = properties(rel)
    if tag.get('type')!='multipolygon': continue
    def shells(inner):
        edges = [lines['w'+m.get('ref')] for m in rel.findall('member') if m.get('type')=='way'
                 and (m.get('role')=='inner')==inner and 'w'+m.get('ref') in lines]
        return unary_union(list(polygonize(edges)))
    areas[key] = make_valid(shells(False).difference(shells(True)))

def polygonal(g): return unary_union(list(components(make_valid(g),'Polygon')))
def encode(g):
    polys = sorted(components(make_valid(g),'Polygon'), key=lambda x:(-x.area,x.bounds))
    return [rings(p.simplify(.13,preserve_topology=True)) for p in polys if p.area>.16]
extent = box(*city['bounds'])
major = {'primary','secondary','tertiary','residential','unclassified','living_street','pedestrian','trunk'}
micro = major | {'service','footway','cycleway'}
def street_cells(types):
    network = [line for key,line in lines.items() if tags[key].get('highway') in types
               and tags[key].get('area')!='yes' and tags[key].get('indoor')!='yes' and tags[key].get('tunnel')!='yes']
    return list(polygonize(unary_union([extent.boundary,*network])))
blocks, campus_blocks = street_cells(major),street_cells(micro)
def block_at(cells,point):
    p = next(p for p in cells if p.contains(Point(point)))
    return Polygon(p.exterior)
def parcel(key):
    return max(components(areas[key],'Polygon'),key=lambda p:p.area)
def named_strip(name,near,width):
    return unary_union(named[name]).intersection(near).buffer(width/2,cap_style='flat',join_style='mitre')

# Street-block probes select closed faces of the mapped road network. They do
# not specify radii for building ownership. College boundaries follow OSM land parcels.
market_block=block_at(blocks,(-708,-88))
square=block_at(blocks,(-516,-204))
castle_block=block_at(blocks,(-1133,0))
museum_block=block_at(campus_blocks,(-629,-756))
meadow_paths=unary_union([lines['w'+i] for i in
    ['1480620281','1480620282','1026364373','1026370096','1408666578']]).buffer(2.05,join_style='round')
meadow_apron=block_at(street_cells(micro|{'path'}),(-646,307))
meadow_walk=named_strip('Broad Walk',unary_union([parcel('w24450278'),parcel('w875889495')]).buffer(32),4.1)
# The shared street is divided at the colleges' common frontage. The side
# pavements, small shops and Weston forecourt are included at their true scale.
broad_square=parcel('w960751646')
broad_pavement=unary_union([broad_square.buffer(3.25),lines['w1149488307'].buffer(2.15)])
west_side=Polygon([(-1500,-600),(-793,-600),(-604,200),(-1500,200)])
front_shops=['w277042419','w277042424','w311883837','w311883838','w311883839','w311883840',
             'w325337534','w988287249','w988287250',*('w'+str(i) for i in range(988287256,988287265))]
pieces={
    'market':[market_block,parcel('w23680440'),parcel('w23680168')],
    'radcliffe':[square,*map(parcel,['w114320051','w113969416','w23678932','w23680177','w556632295','w23680304','w230240248'])],
    'museum':[museum_block,*map(parcel,['w25999878','w23679616','w928237437','w99873920'])],
    'christ':[parcel('r15595647'),meadow_apron,meadow_paths,meadow_walk,*map(parcel,['r18237593','r12589914','r12589915','w875889495'])],
    'castle':[castle_block,parcel('r11641571'),parcel('w29089712'),parcel('r12555898'),parcel('w569976793')],
    'ashmolean':[block_at(blocks,(-955,-450)),block_at(campus_blocks,(-951,-322)),
                 block_at(blocks,(-852,-294)),parcel('w1296636046')],
    'carfax':[block_at(blocks,(-830,69)),block_at(campus_blocks,(-715,24)),
              block_at(campus_blocks,(-868,-81))],
    'newcollege':[parcel('w130536383')],
    'merton':[parcel('r4007477'),*map(parcel,['w60860866','w204275577','w226227823',
              'w297525296','w297525297','w297525299','w297525300','w297525301'])],
    'balliol':[parcel('w187925177'),broad_pavement.intersection(west_side),*map(parcel,front_shops)],
    'trinity':[parcel('w113575673'),broad_pavement.difference(west_side),parcel('w110348115'),parcel('w29390262')],
    'queens':[parcel('w23679234'),parcel('w112466246'),parcel('w295792411'),areas['r3934095']],
    'univ':[parcel('w112557739'),parcel('w850114256')],
}
street_edges={
    'market':{'High Street':11,'Cornmarket Street':10,'Turl Street':7,'Market Street':7,'Ship Street':6},
    'radcliffe':{'High Street':12,'Catte Street':7,'New College Lane':6,'Broad Street':13,'Brasenose Lane':4,'Holywell Street':7},
    'museum':{'Parks Road':12,'Museum Road':7,'Keble Road':8,'South Parks Road':9},
    'christ':{"St Aldate's":12,'Blue Boar Street':6,'St Frideswide’s Lane':4,'Merton Street':7,'Broad Walk':5},
    'castle':{'New Road':11,'Castle Street':10,'Paradise Street':7,'Tidmarsh Lane':6,'Castle Yard':5},
    'ashmolean':{'Beaumont Street':14,"St Giles'":22,'Magdalen Street':11,'Magdalen Street East':9,'Pusey Lane':4,'Pusey Street':6,'Friars Entry':4},
    'carfax':{'High Street':13,'Carfax':14,'Queen Street':13,'Cornmarket Street':11,"St Aldate's":13,'Blue Boar Street':6,'Pembroke Street':6,'St Ebbes Street':8},
    'newcollege':{'New College Lane':6,"Queen's Lane":5,'Holywell Street':8,'Longwall Street':9},
    'merton':{'Merton Street':8,'Rose Lane':5,'Magpie Lane':4,'Logic Lane':4},
    'balliol':{'Broad Street':13,'Magdalen Street East':9,'Magdalen Street':9},
    'trinity':{'Broad Street':13,'Parks Road':10},
    'queens':{'High Street':22,"Queen's Lane":5.5,'New College Lane':4},
    'univ':{'High Street':22,'Logic Lane':4,'Magpie Lane':4,'Merton Street':7},
}
held = json.loads((root/'src/magdalen/data/site.json').read_text('utf8'))
magdalen = Polygon(held['boundary']['outer'])
mask={}
for name,raw in pieces.items():
    inside=unary_union(raw)
    edges=[named_strip(s,inside.buffer(7),w) for s,w in street_edges[name].items()]
    joined=unary_union([inside,*edges])
    # Close narrow separations at a pavement or gate. Outer street turns and
    # lawn limits are inherited from the source polygon, not from a convex hull.
    closed=joined.buffer(4.8,join_style='mitre').buffer(-4.8,join_style='mitre')
    # Enclosed squares between adjacent college parcels (such as the Catte
    # Street frontage) belong to the same public realm. Outsider footprints
    # are subtracted below so a separate whole building always keeps its owner.
    continuous=unary_union([Polygon(p.exterior,[r for r in p.interiors if Polygon(r).area>1800])
                            for p in components(closed,'Polygon')])
    mask[name]=polygonal(continuous.intersection(extent).difference(magdalen))
mask['balliol']=mask['balliol'].difference(parcel('w113575673'))
mask['trinity']=mask['trinity'].difference(parcel('w187925177'))
# Join pavement to parcel along the actual curve of the High, then divide the
# public realm at its surveyed centreline. The crossing is continuous in the city.
high_line=sorted({p for k in ['w1160879673','w2987999','w8117964','w977420095','w27895984']
                  for p in lines[k].coords})
north_side=Polygon([*high_line,(high_line[-1][0],-910),(high_line[0][0],-910)])
for place,western,eastern in [('queens',-403,-180),('univ',-450,-207)]:
    road=LineString(high_line).intersection(box(western,-170,eastern,0)).buffer(11,cap_style='flat')
    apron=road.intersection(north_side) if place=='queens' else road.difference(north_side)
    mask[place]=polygonal(mask[place].union(apron))
mask['queens']=mask['queens'].intersection(north_side)
mask['univ']=mask['univ'].difference(north_side)
owner_order=['market','radcliffe','museum','christ','castle','ashmolean','carfax','newcollege','merton','balliol','trinity','queens','univ']
occupied=magdalen
for name in owner_order:
    mask[name]=mask[name].difference(occupied)
    occupied=unary_union([occupied,mask[name]])

geo=defaultdict(list)
core={}
for key,rr,height,owner,kind,title,source in city['buildings']:
    geo[key].append(Polygon(rr[0],rr[1:]))
    if owner: core[key]=owner
geo={k:polygonal(unary_union(v)) for k,v in geo.items()}
assignment={}
for key,p in geo.items():
    if key in core:
        assignment[key]=core[key];continue
    overlap=max(((m.intersection(p).area/max(p.area,.01),name) for name,m in mask.items()),default=(0,None))
    if overlap[0]>=.49 or (overlap[0]>=.20 and mask[overlap[1]].covers(p.representative_point())):
        assignment[key]=overlap[1]
# A straddling building is always rendered once, with a single owner; add its
# complete outline to the pocket and take outside buildings out of the colour wash.
for name in owner_order:
    own=[geo[k] for k,o in assignment.items() if o==name]
    merged=unary_union([mask[name],*own])
    adjacent=[p for k,p in geo.items() if assignment.get(k)!=name and merged.intersects(p)]
    # A small corner of Merton North Lodge overhangs the Magdalen diorama.
    # Keep the entire lodge mesh, with one owner, above the original ground.
    final_ground=merged.difference(unary_union(adjacent))
    mask[name]=polygonal(final_ground.difference(magdalen) if name=='merton' else final_ground)

building_keys=list(geo)
building_shapes=[geo[k] for k in building_keys]
index=STRtree(building_shapes)
bank=unary_union([Polygon(r[0],r[1:]) for r in city['water']])
green=unary_union([Polygon(r[0],r[1:]) for r in city['green']])
dimensions={'primary':10.3,'secondary':8.6,'tertiary':7,'residential':5.8,'unclassified':5.6,'service':3.4,
            'living_street':4,'pedestrian':5.8,'footway':1.65,'path':1.4,'cycleway':2,'steps':1.6}
covered_paths=[l for k,l in lines.items() if tags[k].get('highway') and (tags[k].get('tunnel')=='building_passage' or
               (tags[k].get('covered')=='yes' and tags[k].get('indoor')!='yes'))]
passage_tree=STRtree(covered_paths)
roof_ids={'w27582068':'theatre','w62333303':'bridge','w62118518':'soulsLibrary','w227773847':'twins',
          'w29387139':'clarendon','w90709819':'kebleChapel','w99873920':'pitt','w24450278':'meadow',
          'w310062039':'nuffield','w770743340':'abbot','w301894833':'canterburyGate',
          'w24448698':'peckwater','w263943861':'county','w114320058':'divinity','w931938854':'meadowGate',
          'w60903334':'exeterChapel','r1337584':'ashMuseum','w134120759':'taylor','w130731852':'randolph',
          'w110348109':'maryMagdalen','w311139684':'carfaxTower','r12885061':'townHall'}
gold=unary_union(named['Golden Cross'])
college_features={
    'newCloister':['r11267'],'newBell':['w126369404'],'newChapel':['w23762392'],
    'newHall':['w23950697'],'newMuniment':['w23950708'],'newOldQuad':['r3961794'],
    'newHolywell':['w126369479'],'mertonChoir':['w39606739'],
    'mobLibrary':['w228196820','w301499001'],'mobRange':['w39606975','w301498999','w301499000'],
    'mobTreasury':['w991996414'],'fellows':['w301498988','w301498989','w301498990','w301498991','w301499011'],
    'mertonGate':['w301498998'],'mertonHall':['w39607373']}
roof_ids.update({k:kind for kind,keys in college_features.items() for k in keys})
broad_features={
    'balliolGate':['w296615757'],'broadRange':['w296615763','w362249442','w296615729','w303916219','w303916220','w227664176','w296615741'],
    'butterfield':['w296615723'],'balliolHall':['w296615727'],'salvin':['w296618261'],'oldBalliol':['w296618260','w49424069'],
    'trinityTower':['w23184304'],'trinityChapel':['w23184279'],'wren':['w23184300','w23184462','w296490476'],
    'jackson':['w23184387','w23184275'],'broadIron':['w1477573300','w1477573301'],
    'weston':['w61538711'],'bookshop':['w29390262'],'levine':['w1065600614'],'stuart':['r19431945']}
roof_ids.update({k:kind for kind,keys in broad_features.items() for k in keys})
high_features={
    'queensFront':['w27151764'],'queensHall':['w27042203'],'queensChapel':['w27151753'],
    'queensBell':['w89415136'],'queensLibrary':['w27042135'],'queensBack':['w27151079'],
    'queensLodge':['w227502403'],'stPeter':['w62091706'],'carrodus':['r3934095'],
    'univFront':['w297760074','w297913656','w297525322','w297525323','w297525327','w297525330'],
    'univRange':['w297525317','w297525318','w297525320','w297525321','w297525324','w297525325','w297525328','w297914365'],
    'univChapel':['w112557741'],'univHall':['w297525287'],'logicBridge':['w991999348'],
    'durham':['w297525288','w297525289','w297525290'],'exams':['w60860891']}
roof_ids.update({k:kind for kind,keys in high_features.items() for k in keys})
frontages=unary_union([*named['High Street'],*named['Cornmarket Street'],*named['Market Street'],*named['Turl Street']])
def family(k,p,place):
    t=tags[k];title=t.get('name','')
    if k in roof_ids:return roof_ids[k]
    if place in ('queens','univ'):
        if k in ('w297525305','w297525306','w297525307','w297525284') or t.get('shop'):return 'shop'
        if re.search('Auditorium|Goodhart|Kelly Building|Emden',title):return 'modern'
    if place=='balliol' and (k in front_shops or p.centroid.y>-256):return 'shop'
    if place=='trinity' and t.get('building')=='gate':return 'outbuilding'
    if k=='w24449069':return 'classical'
    if place=='ashmolean':
        if t.get('building') in ('university','chapel','church') or 'College' in title:return 'college'
        if 'Beaumont' in title or 'Library' in title:return 'classical'
        return 'town'
    if place=='carfax':
        if t.get('building') in ('commercial','retail','terrace','bank','house') or t.get('shop') or t.get('amenity') in ('bank','pub','cafe'):return 'shop'
        if re.search('Clarendon|Carfax Quarter|North Bailey|Arts Centre',title):return 'modern'
        if t.get('building')=='brewery':return 'warehouse'
        return 'town'
    if place=='museum':
        if parcel('w23679616').covers(p.representative_point()):
            if re.search('ARCO|Hayward|O.Reilly|Newman|Sloane Robinson|Garden Room|de\s*breyne',title,re.I):return 'modern'
            return 'keble'
        if re.search('Physics|Earth Sciences|Cardiac|Le Gros|Biochemistry',title):return 'modern'
        if re.search('Chemistry|Reuben|Kitchen|Jackson|Worthington',title):return 'scientific'
        return 'science'
    if place=='market':
        if p.distance(gold)<2.2:return 'cross'
        if p.distance(frontages)<8.8 and t.get('building') not in ('university','chapel','college','library'):
            return 'shop'
    if place=='castle':
        if parcel('r11641571').covers(p.representative_point()):return 'college'
        if t.get('building')=='apartments' or re.search('Hotel|Courtyard Oxford|County Hall|Tidmarsh',title):return 'modern'
        return 'warehouse'
    if t.get('building') in ('chapel','church') or t.get('amenity')=='place_of_worship' or 'Chapel' in title:return 'chapel'
    if place=='christ' and re.search('Canterbury|Peckwater|Library|Canonr|Residential',title):return 'classical'
    if t.get('building') in ('shed','garage','garages','hut','barn','greenhouse'):return 'outbuilding'
    if t.get('building') in ('retail','commercial','terrace','house') and place=='market':return 'shop'
    return 'college' if place!='market' or t.get('building') in ('university','college','library') else 'town'

def exposed_edges(p,key):
    out=[]
    for idx,ring in enumerate([p.exterior,*p.interiors]):
        coords=list(ring.coords);good=[]
        for i,(a,b) in enumerate(zip(coords,coords[1:])):
            l=LineString([a,b]);mid=l.interpolate(.5,normalized=True)
            if l.length<1.25:continue
            neighbours=[j for j in index.query(mid.buffer(.55)) if building_keys[j]!=key]
            if not any(building_shapes[j].distance(mid)<.32 and building_shapes[j].intersection(l.buffer(.35)).area>l.length*.10 for j in neighbours):
                good.append(i)
        out.append(good)
    return out

def roof(p):
    # Inset contours generate hips and valleys around actual re-entrant wings
    # and courtyard holes; the eave, ridge height and pitches are model estimates.
    intervals=[0,1.5,3.6,6.6,11.0,80.0];result=[]
    for lo,hi in zip(intervals,intervals[1:]):
        band=(p.buffer(-lo,join_style='mitre') if lo else p).difference(p.buffer(-hi,join_style='mitre'))
        for part in components(band,'Polygon'):
            for t in constrained_delaunay_triangles(part).geoms:
                result.append([[*xy(c),round(min(5.5,p.boundary.distance(Point(c))*.61),2)] for c in list(t.exterior.coords)[:3]])
    return result
def raw_faces(rr):
    return Polygon(rr[0],rr[1:])
def get_passages(p):
    hits=[]
    for i in passage_tree.query(p):
        line=covered_paths[i]
        for s in components(line.intersection(p.buffer(.45)),'LineString'):
            if s.length>1.25:hits.append([xy(c) for c in s.coords])
    return hits
def tower_part(key):
    t=tags[key]
    return [rings(areas[key])[0],numerical(t.get('height'))]

records={};tree_positions=[];furniture=[]
for n in xml.iterfind('node'):
    t=properties(n)
    if t.get('natural')=='tree':
        pt=nodes[n.get('id')]
        tree_positions.append((pt,t))
    kind={'bench':'bench','bicycle_parking':'cycles','drinking_water':'fountain'}.get(t.get('amenity'))
    if t.get('highway')=='street_lamp':kind='lamp'
    if t.get('barrier')=='bollard':kind='bollard'
    if kind:furniture.append((nodes[n.get('id')],kind,t.get('direction')))
for name,m in mask.items():
    keys=[k for k,s in assignment.items() if s==name]
    district_buildings={}
    for key,r,h,old,kind,title,src in city['buildings']:
        if key not in keys or old:continue
        p=raw_faces(r);kind=family(key,p,name)
        t=tags[key]
        ends=exposed_edges(p,key)
        style={'family':kind,'name':t.get('name',''),'levels':numerical(t.get('building:levels')),
               'material':t.get('building:material',''),'roof':t.get('roof:shape',''),'edges':ends}
        routes=get_passages(p)
        if routes:style['passages']=routes
        if len(r)>1 or (len(r[0])>7 and p.area>120):
            if kind not in high_features and kind not in broad_features and (kind not in college_features or kind in ('newOldQuad','newHolywell')) and kind not in ['theatre','bridge','twins','nuffield','pitt','kebleChapel','abbot','modern','clarendon','peckwater',
                            'ashMuseum','taylor','randolph','carfaxTower','townHall','maryMagdalen']:
                style['facets']=roof(p)
        if key=='r3961794':
            style['wings']=district_buildings.get(key,{}).get('wings',[])+[
                {'start':r[0][0],'facets':style.pop('facets',[]),'edges':ends}]
        district_buildings[key]=style
    street_pieces=defaultdict(list)
    for typ,line in city['streets']:
        l=LineString(line)
        if not m.intersects(l):continue
        wd=dimensions.get(typ,2)
        isroad=typ in major-{'pedestrian'} or typ=='service'
        kind='road' if isroad else 'flags' if typ=='pedestrian' else 'walk'
        if isroad:street_pieces['pavement'].append(l.buffer(wd*.5+1.15,join_style='round',cap_style='round'))
        street_pieces[kind].append(l.buffer(wd*.5,join_style='round',cap_style='round'))
    # Some OSM passages run below street-front buildings. Their paving remains
    # visible through the doorway; the external street and the indoor market retain separate meshes.
    for l in covered_paths:
        if l.intersects(m):street_pieces['walk'].append(l.buffer(1.0))
    gardens=[];flag_areas=[];flowerbeds=[]
    for k,p in areas.items():
        t=tags[k]
        if not m.intersects(p):continue
        if t.get('landuse')=='flowerbed' or t.get('natural')=='flowerbed':flowerbeds.append(p)
        if t.get('leisure')=='garden' or t.get('landuse') in ('grass','meadow','village_green'):gardens.append(p)
        if t.get('area:highway') or (t.get('area')=='yes' and t.get('highway') in ('pedestrian','footway')):flag_areas.append(p)
    def cut(g):return encode(polygonal(g.intersection(m)).difference(bank))
    wall=[]
    fortifications=unary_union([l for k,l in lines.items() if tags[k].get('barrier')=='city_wall'] +
                 [lines[k] for k in lines if tags[k].get('name','').startswith('Bastion ')])
    for line in city['walls']:
        clipped=LineString(line).intersection(m)
        if name=='newcollege':clipped=clipped.difference(fortifications.buffer(.28))
        for seg in components(clipped,'LineString'):
            if seg.length>=2:wall.append([xy(v) for v in seg.coords])
    trees=[]
    for pos,t in tree_positions:
        if not m.contains(Point(pos)):continue
        seed=abs(round(pos[0]*17+pos[1]*31))
        hg=numerical(t.get('height')) or 6.2+seed%55/10
        evergreen=t.get('leaf_cycle')=='evergreen' or t.get('leaf_type')=='needleleaved'
        if name=='newcollege' and Point(pos).distance(Point(-438.7,-288.59))<.25:
            trees.append([*xy(pos),13.8,8.3,2])  # broad-leaved evergreen Ilex; crown dimensions estimated
        else:trees.append([*xy(pos),round(hg,1),round(min(5.6,hg*.34),2),int(evergreen)])
    seats=[]
    direction={'N':0,'E':90,'S':180,'W':270,'NE':45,'SE':135,'SW':225,'NW':315}
    for pos,kind,bearing in furniture:
        if m.contains(Point(pos)) and not any(building_shapes[j].contains(Point(pos)) for j in index.query(Point(pos))):
            deg=direction.get(bearing,numerical(bearing) if bearing else 0)
            seats.append([kind,*xy(pos),deg or 0])
    records[name]={'boundary':encode(m),'land':cut(m),'water':encode(m.intersection(bank)),
                   'grass':cut(unary_union([green,*gardens])),'beds':cut(unary_union(flowerbeds)),
                   'paved':cut(unary_union(flag_areas)),
                   'streets':{k:cut(unary_union(v)) for k,v in street_pieces.items()},
                   'walls':wall,'trees':trees,'furniture':seats,'buildings':district_buildings,
                   'hectares':round(m.area/10000,2),'core':sorted(k for k in keys if k in core)}
    records[name]['banks']=[[xy(c) for c in l.simplify(.25).coords] for l in components(bank.boundary.intersection(m.buffer(-.22)),'LineString') if l.length>2.5]
    if name=='castle':
        details=json.loads((directory/'districts.json').read_text('utf8'))
        fine_stream=unary_union([Polygon(rs[0],rs[1:]) for rs in details['castle']['stream']])
        records[name]['water']=encode(m.intersection(bank).difference(fine_stream))
        # The detailed stream continues beyond this block in the city survey.
        # Cut the miniature at the exact crossing so its water ends flush with
        # the exposed river bed. Use the very same rounded rings as the renderer.
        board=unary_union([Polygon(r[0],r[1:]) for r in records[name]['boundary']])
        wetted=fine_stream.union(bank).buffer(.015)
        def edge_lines(shape):
            return [[xy(p) for p in seg.coords] for seg in components(shape,'LineString') if seg.length>.03]
        section={'stream':encode(fine_stream.intersection(board)),
                 'wet':edge_lines(board.boundary.intersection(wetted)),
                 'dry':edge_lines(board.boundary.difference(wetted))}
        (directory/'castle-section.json').write_text(json.dumps(section,separators=(',',':')),'utf8')
records['castle']['towerPart']=tower_part('w1427073779')
records['market']['goldenCross']=[[xy(p) for p in l.coords] for l in named['Golden Cross']]
records['radcliffe']['theatrePoint']=xy(geo['w27582068'].centroid.coords[0])
records['radcliffe']['bridgePoint']=xy(geo['w62333303'].centroid.coords[0])
# Divide the historic façades, rear galleries and hall roofs on their actual
# outlines. Offsets separating roof volumes are estimated from photographs.
def volumes(key,origin,axis,regions,encoder=encode):
    ux,uz=axis;length=math.hypot(ux,uz);ux/=length;uz/=length
    ox,oz=origin
    forward=[ux,-uz,uz,ux,ox,oz]
    inverse=[ux,uz,-uz,ux,-ux*ox-uz*oz,uz*ox-ux*oz]
    remainder=affine_transform(geo[key],inverse)
    out={}
    for name,x0,z0,x1,z1 in regions:
        section=remainder.intersection(box(x0,z0,x1,z1))
        out[name]=encoder(affine_transform(section,forward))
        remainder=remainder.difference(section)
    out['rear']=encoder(affine_transform(remainder,forward))
    return out
records['ashmolean']['museumVolumes']=volumes('r1337584',[-938.65,-384.97],[.9732,-.2294],[
    ('portico',-7.05,-3.62,7.06,1),('west',-40,-15.0,-21.57,25),('annex',-72,-18,-40,24),
    ('gallery',-21.58,-13.3,24.2,.5)])
records['ashmolean']['taylorVolumes']=volumes('w134120759',[-938.65,-384.97],[.9732,-.2294],[
    ('wing',20,-15,40,22)])
records['ashmolean']['memorial']=xy(nodes['16252895'])
records['carfax']['hallVolumes']=volumes('r12885061',[-748.32,38.03],[.315,.949],[
    ('front',-25,-12.8,33.2,3),('assembly',-14,-32,8,-12.8),('main',3,-68,23.8,-33)])
records['newcollege']['chapelVolumes']=volumes('w23762392',[-395,-289.6],[.986,.168],[
    ('ante',-2,-3,12.8,32),('choir',12.8,6.76,49,23)])
records['merton']['chapelVolumes']=volumes('w39606739',[-434.8,96],[.972,-.235],[
    ('crossing',-9,-6.0,8.6,6.5),('north',-9,-23,8.65,-6.0),('south',-9,6.5,8.97,23),
    ('choir',8.4,-8,44,8)])
nc=records['newcollege']
nc['buildings']['r11267']['passages']=[[xy(p) for p in lines[k].coords] for k in
    ('w126369433','w126369436','w297861313')]
nc['ramparts']=[[xy(p) for p in l.coords] for key in ('w23762464','w126369476')
    for l in components(lines[key].intersection(mask['newcollege']),'LineString') if l.length>.6]
nc['bastions']=[[xy(p) for p in lines[key].coords] for key in ['w1214818216','w1214818217',
    'w1214818218','w1214818219','w1214818225','w1214818226']]
nc['mound']=encode(parcel('w295073492'))[0][0]
# The processional path encloses a lawn in Front Quad; the Mob Quad lawn
# lies within the mapped perimeter walk. Path width is a photographic estimate.
def loop_lawn(lineset,width):
    polys=list(polygonize(unary_union([lines[k] for k in lineset])))
    return encode(max(polys,key=lambda p:p.area).buffer(-width))
nc['courtLawns']=loop_lawn(['w126369420','w301805530'],1.28)
records['merton']['courtLawns']=loop_lawn(['w145078403'],.95)
records['merton']['cobbles']=encode(parcel('w296017171'))
records['merton']['treasuryVolumes']=volumes('w991996414',[-403.94,104.45],[.973,-.232],[
    ('treasury',-.45,-6.8,6.5,.5)])
library=volumes('w228196820',[-417.8,132.0],[.961,-.276],[('south',-16,-.05,28,14)])
records['merton']['buildings']['w228196820']['roofs']=[p for group in library.values() for p in group]
records['balliol']['courtLawns']=encode(unary_union([parcel('w217591073'),areas['r3945170'],areas['r3945258']]))
records['balliol']['martyrsCross']=next(xy(nodes[n.get('id')]) for n in xml.iterfind('node') if properties(n).get('name')=='Site of the Burning of the Oxford Martyrs')
for name in ('balliol','trinity'):
    records[name]['broadAsphalt']=encode(broad_square.intersection(mask[name]))
    records[name]['terraces']=encode(unary_union([parcel('w1149488308'),parcel('w1149488309')]).intersection(mask[name]))
records['balliol']['buildings']['w296615757']['passages']=[[xy(p) for p in lines['w303916221'].coords]]
records['trinity']['buildings']['w23184304']['passages']=[[xy(p) for p in lines['w1065666595'].coords]]
records['trinity']['buildings']['w23184300']['passages']=[[xy(p) for p in lines['w1065666594'].coords]]
records['trinity']['gate']=[xy(p) for p in lines['w1477573299'].coords]
records['trinity']['courtLawns']=encode(unary_union([parcel('w217591077'),parcel('w296485528')]))
records['trinity']['gardenPaving']=encode(parcel('w131445548'))
records['trinity']['durhamLawn']=encode(parcel('w296485528'))[0][0]
records['trinity']['gardenRoofs']=volumes('w23184300',[-758.57,-394.28],[.917,-.398],[
    ('west',-15,-38,.05,7),('south',.05,-2,35,10)])
records['trinity']['jacksonRoofs']=volumes('w23184387',[-666.1,-355.6],[.975,-.224],[
    ('north',-24,-30,35,-1),('west',-24,-1,4.5,55)])
# The offline extract has no tagged trees in these two college gardens.
# Illustrated planting is retained separately in source for provenance.
planting=json.loads((directory/'broad-planting.json').read_text('utf8'))
for name,items in planting.items():
    for x,z,h,r,evergreen in items:
        point=Point(x,z)
        if not mask[name].covers(point) or any(building_shapes[j].covers(point) for j in index.query(point)):
            raise ValueError(f'{name}: illustrated tree on building or beyond boundary at {(x,z)}')
        records[name]['trees'].append([x,z,h,r,evergreen])
# Resolve compound roofs before painting elevations. Subregions are photo-based
# volume estimates clipped against the actual OSM outline, in the existing CRS.
queen=records['queens']; univ=records['univ']
def fine_rings(g):
    # Do not simplify the long, almost parallel sides of a four-metre screen.
    # Snap before serialisation so a 1 cm corner cannot form an invalid ring.
    snapped=set_precision(make_valid(g),.01)
    return [rings(p) for p in sorted(components(snapped,'Polygon'),key=lambda s:(-s.area,s.bounds)) if p.area>.035]
# Split only across the actual depth of the south screen, through the four
# pairs of surveyed re-entrant corners. A long axial clipping box would cut a
# thin false wall along the inner face of the east wing.
front=geo['w27151764']
joints=[LineString([a,b]) for a,b in (
    ((-338.99,-106.02),(-339.31,-102.0)),((-321.37,-104.63),(-321.58,-100.6)),
    ((-314.25,-104.11),(-314.73,-100.09)),((-296.14,-102.67),(-296.42,-98.64)))]
screen_parts=[p for p in polygonize(unary_union([front.boundary,*joints])) if front.covers(p.representative_point())]
assert front.symmetric_difference(unary_union(screen_parts)).area<.01
west,west_screen,gate,east_screen,east=sorted(screen_parts,key=lambda p:p.centroid.x)
queen['frontVolumes']={'west':fine_rings(west),'east':fine_rings(east),'gate':fine_rings(gate),
                      'rear':fine_rings(unary_union([west_screen,east_screen]))}
queen['backVolumes']=volumes('w27151079',[-313,-182],[.998,.059],[
    ('north',-60,-40,56,-14.3),('south',-60,19.38,56,38)],fine_rings)
queen['churchVolumes']=volumes('w62091706',[-256,-187],[.970,-.242],[
    ('tower',-26,-.32,-10.0,10),('chancel',3,-12,25,11),('porch',-9.15,6.9,-5.1,14)],fine_rings)
univ['examVolumes']=volumes('w60860891',[-247,-61],[.978,.209],[
    ('front',-42,-7,42,12.1),('northSchool',-11.1,12.1,40,25),('southSchool',-19.3,55.3,40,72)],fine_rings)
def high_gates():
    source=unary_union([geo[k] for k in high_features['univFront']])
    left=source
    gates=[]
    for path_id in ('w164759799','w1036514183'):
        passage=lines[path_id]
        corridor=passage.buffer(3.50,cap_style='square')
        gate=source.intersection(corridor)
        gates.append({'shapes':fine_rings(gate),'axis':[xy(p) for p in passage.coords]})
        left=left.difference(corridor)
    return gates, [r for k in high_features['univFront'] for r in fine_rings(left.intersection(geo[k]))]
univ['gateTowers'],univ['frontRanges']=high_gates()
queen['courtLawns']=encode(unary_union([areas[k] for k in ('r3936942','r3936947','r3937062')]))
univ['courtLawns']=encode(unary_union([areas['r3958222'],areas['r11644068']]))
queen['crossing']=xy(nodes['9044228868'])
queen['backPassage']=[xy(p) for p in lines['w89415160'].coords]
univ['logicSetts']=encode(unary_union(named['Logic Lane']).buffer(1.43,cap_style='flat',join_style='round').intersection(mask['univ']))
garden_canopies={'w89415126':[(.18,.29,9.8),(.47,.23,8.1),(.77,.72,10.3)],
                 'w89415143':[(.22,.27,8.3),(.8,.68,7.6)],'w89415161':[(.27,.65,7.4),(.7,.21,6.8)]}
for key,positions in garden_canopies.items():
    garden=areas[key]
    x0,z0,x1,z1=garden.bounds
    for u,v,h in positions:
        point=Point(x0+(x1-x0)*u,z0+(z1-z0)*v)
        if garden.covers(point) and not any(building_shapes[j].distance(point)<1.4 for j in index.query(point.buffer(1.4))):
            queen['trees'].append([*xy(point.coords[0]),h,round(h*.33,2),0])
# Use mapped pavements where the centreline-only basemap leaves a gap
# between the kerb and the stone frontage.
high_flags=LineString(high_line).buffer(11,cap_style='flat').difference(LineString(high_line).buffer(7.0))
nearby_shells=unary_union([building_shapes[j] for j in index.query(high_flags)])
for name in ('queens','univ'):
    records[name]['highPaving']=encode(high_flags.intersection(mask[name]).difference(nearby_shells))
dest=directory/'quarters.json'
dest.write_text(json.dumps(records,ensure_ascii=False,separators=(',',':')),'utf8')
whole=unary_union(list(mask.values()))
outside={'green':{},'water':{},'streets':{}}
for kind in ['green','water']:
    for i,rs in enumerate(city[kind]):
        p=Polygon(rs[0],rs[1:])
        if p.intersects(whole):outside[kind][i]=encode(p.difference(whole))
for i,(kind,points) in enumerate(city['streets']):
    line=LineString(points);w=dimensions.get(kind,2.0)
    apron=line.buffer((w+1.55)/2,cap_style='flat',join_style='mitre')
    if apron.intersects(whole):
        lane=line.buffer(w/2,cap_style='flat',join_style='mitre')
        outside['streets'][i]=[encode(apron.difference(whole)),encode(lane.difference(whole))]
(directory/'quarter-context.json').write_text(json.dumps(outside,separators=(',',':')),'utf8')
for k,v in records.items():print(k,v['hectares'],'ha;',len(v['core']),'+',len(v['buildings']),'mapped buildings;',len(v['trees']),'trees')
