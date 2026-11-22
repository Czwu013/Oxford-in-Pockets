"""Compare actual 1200px offline renders produced by verify-eight.cjs (Pillow and NumPy)."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

folder = Path(sys.argv[1])


def rgb(name):
    return np.asarray(Image.open(folder / (name + '.png')).convert('RGB'), dtype=np.float32)


weights = np.array([.2126, .7152, .0722], dtype=np.float32)
report = {'units': 'display-referred 8-bit sRGB, fixed camera', 'dayNight': {}, 'sunbeams': {}, 'leaves': []}
for scene in ('portico', 'townhall'):
    day = rgb(scene + '-day') @ weights
    night = rgb(scene + '-night') @ weights
    assert float(day.mean() - night.mean()) > 46
    report['dayNight'][scene] = {'dayMean': round(float(day.mean()), 2), 'nightMean': round(float(night.mean()), 2)}

for a, b in [('portico-day', 'portico-no-rays'), ('river-spring', 'river-no-rays')]:
    diff = (rgb(a) - rgb(b)) @ weights
    changed = np.mean(diff > 4)
    quiet = np.mean(np.abs(diff) < 2)
    assert .02 < changed < .69 and quiet > .19
    report['sunbeams'][a] = {'brightenedFraction': round(float(changed), 4), 'quietFraction': round(float(quiet), 4)}

# Below the western high windows, across the diagonal shade on the same ashlar band.
wall = rgb('portico-no-rays') @ weights
shade = float(np.median(wall[506:515, 244:253]))
sun = float(np.median(wall[506:515, 306:315]))
assert sun - shade > 20
report['museumAshlar'] = {'litMedian': round(sun, 1), 'shadeMedian': round(shade, 1)}

for i in range(4):
    visible, hidden = rgb('lime-' + str(i)), rgb('lime-clear-' + str(i))
    mask = np.abs(visible - hidden).max(axis=2) > 13
    y, x = np.where(mask)
    assert 20 < len(y) < mask.size * .02
    report['leaves'].append({'pixels': len(y), 'bounds': [int(x.min()), int(y.min()), int(x.max()), int(y.max())]})
assert len({tuple(r['bounds']) for r in report['leaves']}) >= 3
(folder / 'light-pixels.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report))
