"""Compare fixed-camera seasonal browser frames from verify-ten.cjs."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('folder', type=Path)
folder = parser.parse_args().folder

def pigments(name, bounds):
    with Image.open(folder / (name + '.png')) as frame:
        w, h = frame.size
        x0, y0, x1, y1 = bounds
        region = frame.convert('RGB').crop((round(w*x0), round(h*y0), round(w*x1), round(h*y1)))
    red, green, blue = np.asarray(region, dtype=np.int16).transpose(2, 0, 1)
    return {
        'greenFraction': round(float(((green-red > 3) & (green-blue > 8)).mean()), 4),
        'amberFraction': round(float(((red-green > 10) & (green-blue > 12)).mean()), 4),
    }

# This box is entirely within the holm oak's crown in summer. With the same
# eye, the sky and cloister behind it would replace those pixels on leaf loss.
oak = [pigments('oak-'+str(i), (.07, .41, .33, .65)) for i in range(4)]
garden = [pigments('merton-season-'+str(i), (.54, .40, .74, .67)) for i in range(4)]
assert oak[1]['greenFraction'] > .7 and oak[3]['greenFraction'] > oak[1]['greenFraction']*.70
assert garden[2]['greenFraction'] < garden[1]['greenFraction']*.49
assert garden[2]['amberFraction'] > garden[1]['amberFraction']*1.35
report = {'order':['spring','summer','autumn','winter'], 'cloisterHolmOak':oak, 'mertonGarden':garden}
(folder/'college-pixels.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
