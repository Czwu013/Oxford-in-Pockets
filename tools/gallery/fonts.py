import os
from pathlib import Path

from PIL import ImageFont


FALLBACKS = {
    'georgia.ttf': ('Georgia.ttf', 'DejaVuSerif.ttf', 'LiberationSerif-Regular.ttf'),
    'georgiai.ttf': ('Georgia Italic.ttf', 'DejaVuSerif-Italic.ttf', 'LiberationSerif-Italic.ttf'),
    'segoeui.ttf': ('DejaVuSans.ttf', 'LiberationSans-Regular.ttf', 'Arial.ttf'),
    'segoeuib.ttf': ('DejaVuSans-Bold.ttf', 'LiberationSans-Bold.ttf', 'Arial Bold.ttf'),
}


def font(name, size):
    roots = [Path(p) for p in (os.environ.get('POCKET_FONT_DIR'), 'C:/Windows/Fonts',
             '/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/truetype/liberation2',
             '/System/Library/Fonts/Supplemental') if p]
    for family in (name, *FALLBACKS[name]):
        for root in roots:
            file = root / family
            if file.is_file():
                return ImageFont.truetype(str(file), size)
        try:
            return ImageFont.truetype(family, size)
        except OSError:
            pass
    raise FileNotFoundError(f'Install {name} or one of {FALLBACKS[name]}, or set POCKET_FONT_DIR.')
