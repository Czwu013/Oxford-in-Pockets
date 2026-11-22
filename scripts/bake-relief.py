"""Blender background script. Bake short-range ambient occlusion into a local GLB.GZ.

Usage: blender -b -P scripts/bake-relief.py -- src/assets/tom.gz [...]
Reads geometry only. No edits to a Blender scene or external assets.
"""
import gzip
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

component = {5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}
size = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def bake(path):
    raw=gzip.decompress(path.read_bytes())
    jlen=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+jlen]);binary=bytearray(raw[28+jlen:])
    def read(index):
        a=doc['accessors'][index];view=doc['bufferViews'][a['bufferView']]
        start=view.get('byteOffset',0)+a.get('byteOffset',0)
        layout=struct.Struct('<'+component[a['componentType']]*size[a['type']])
        stride=view.get('byteStride',layout.size)
        return [layout.unpack_from(binary,start+i*stride) for i in range(a['count'])]
    primitives=[p for m in doc['meshes'] for p in m['primitives']]
    if any('_POCKET_AO' in p['attributes'] for p in primitives):return
    assert not any(any(x in n for x in ['translation','rotation','scale','matrix']) for n in doc['nodes'])
    points=[];triangles=[];items=[]
    for p in primitives:
        attr=p['attributes'];verts=read(attr['POSITION']);normals=read(attr['NORMAL']);offset=len(points)
        points.extend(verts)
        ids=[i[0]+offset for i in read(p['indices'])] if 'indices' in p else list(range(offset,offset+len(verts)))
        triangles.extend(zip(ids[0::3],ids[1::3],ids[2::3]));items.append((attr,verts,normals))
    tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
    rays=[];cache={};zs=Vector((0,0,1));ys=Vector((0,1,0))
    for i in range(12):
        rise=math.sqrt((i+.5)/12);r=math.sqrt(1-rise*rise);ang=(i+.43)*2.399963229728653
        rays.append((r*math.cos(ang),r*math.sin(ang),rise))
    def relief(point,normal):
        k=tuple(round(x,3) for x in point+normal)
        if k in cache:return cache[k]
        n=Vector(normal).normalized();o=Vector(point)+n*.023
        u=n.cross(zs if abs(n.z)<.85 else ys).normalized();v=n.cross(u)
        blocked=0.
        for x,y,z in rays:
            _,_,_,dist=tree.ray_cast(o,u*x+v*y+n*z,2.2)
            if dist is not None:blocked+=(1-dist/2.2)**1.35
        value=round(255*(1-blocked/len(rays)))
        cache[k]=value;return value
    for attr,verts,normals in items:
        values=bytes(relief(p,n) for p,n in zip(verts,normals))
        binary.extend(b'\x00'*(-len(binary)%4));off=len(binary);binary.extend(values)
        vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(values),'target':34962})
        ai=len(doc['accessors']);doc['accessors'].append({'bufferView':vi,'componentType':5121,'normalized':True,'count':len(verts),'type':'SCALAR'})
        attr['_POCKET_AO']=ai
    doc['buffers'][0]['byteLength']=len(binary)
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
    total=12+8+len(js)+8+len(binary)
    glb=struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
    path.write_bytes(gzip.compress(glb,compresslevel=9,mtime=0))
    print(path.name,len(points),'vertices',len(cache),'distinct samples',flush=True)
for arg in sys.argv[sys.argv.index('--')+1:]:bake(Path(arg))
