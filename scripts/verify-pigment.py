"""Compare actual offline browser frames. Requires Pillow and NumPy."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('folder', type=Path)
folder = parser.parse_args().folder
session = json.loads((folder / 'quarters-browser.json').read_text('utf-8'))
assert session['oldViews'] == session['newViews'], 'The before and after cameras must coincide.'
def frame(tag, view):
    with Image.open(folder / f'{tag}-{view}.png') as im:
        return np.asarray(im.convert('RGB')).astype('int16')
def compare(old, new):
    before = (np.ptp(old,axis=2) <= 4) & (old.min(2)>45) & (old.max(2)<232)
    colour = np.ptp(new,axis=2) >= 14
    grey = (np.ptp(new,axis=2)<=4) & (new.min(2)>45) & (new.max(2)<232)
    return {'greyToColourPixels':int((before & colour).sum()),'greyInBothPixels':int((before & grey).sum())}
rows = {}
for site in ['city', *session['oldViews']]:
    old, new = frame('old',site), frame('new',site)
    assert old.shape == new.shape
    rows[site] = compare(old,new)
    assert rows[site]['greyToColourPixels'] > 10000, site
    assert rows[site]['greyInBothPixels'] > 2000, site

# Project the centre of a mapped nearby roof into the screenshot of the
# unchanged bridge-side camera, then inspect a neighbourhood instead of a single texel.
def project(pose,w,h,xyz):
    ratio=w/h
    az,el=np.radians([pose['az'],pose['alt']]); fov=np.radians(pose['lens'])
    width=pose['span']*max(1,ratio/1.52)
    forward=np.array([-np.sin(az)*np.cos(el),-np.sin(el),-np.cos(az)*np.cos(el)])
    eye=np.array([pose['x'],pose['y'],pose['z']])-forward*width/(2*np.tan(fov/2))
    right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
    d=np.asarray(xyz)-eye
    focal=w/(2*np.tan(fov/2))
    return round(w/2+focal*np.dot(d,right)/np.dot(d,forward)),round(h/2-focal*np.dot(d,up)/np.dot(d,forward))
roofs = {"St Swithun’s Quad":(-112.80,10.2,-54.55),"Chaplain’s Quad":(-48.80,10.0,2.92),
         'Daubeny Building':(-74.72,10,51.60)}
old, new = frame('old','magdalen'),frame('new','magdalen')
h,w=old.shape[:2]
windows={}
for name,pt in roofs.items():
    x,y=project(session['oldViews']['magdalen'],w,h,pt)
    delta=compare(old[y-18:y+19,x-18:x+19],new[y-18:y+19,x-18:x+19])
    windows[name]={'pixel':[x,y],**delta}
    assert delta['greyToColourPixels'] > 65, (name,windows[name])
report={'measuredFrames':rows, 'bridgeSideRoofSamples':windows, 'paletteTest':'8-bit sRGB, before chroma <=4 and after >=14',
        'comparison':'same camera / spring, captured from both offline HTML files'}
(folder/'colour-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
