import base64
import html
import json
from pathlib import Path

from PIL import Image, ImageDraw


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEST = ROOT / 'docs'
FRAMES = HERE / 'frames'
from fonts import font
from read_frames import unpack_missing
PLATE = 'magdalen-four-seasons.jpg'
PAGE = 'magdalen-gallery.html'
SEASONS = [
    ('spring', 'Spring', 'Pale new leaves along the river.', 'Fresh green lawns and light, scattered foliage surround the tower and the two river channels.'),
    ('summer', 'Summer', 'Full canopies shade the banks.', 'The same bridge and quadrangle with dense, dark green trees and the open New Building lawn.'),
    ('autumn', 'Autumn', 'Gold and russet follow the water.', 'Golden and copper tree crowns pick out both channels of the Cherwell.'),
    ('winter', 'Winter', 'Bare branches open up the river.', 'The bridge, water and paths through bare trees in low winter light, with the snow switched off.'),
]


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def plate(hour):
    sheet = Image.new('RGB', (3000, 2000), '#f7f5ed')
    pen = ImageDraw.Draw(sheet)
    ink, muted, green, rule = '#263f34', '#526457', '#526b54', '#c3c8b7'
    x0, right = 78, sheet.width - 78
    roman, italic = font('georgia.ttf', 78), font('georgiai.ttf', 78)
    title = 'Magdalen College'
    pen.text((x0, 103), title, font=roman, fill=ink, anchor='ls')
    pen.text((x0+pen.textlength(title+' ',font=roman), 103), 'through the seasons', font=italic, fill=green, anchor='ls')
    pen.text((right,98),'Oxford in Pockets',font=font('georgia.ttf',42),fill=ink,anchor='rs')
    pen.text((x0,155),f'Magdalen Bridge and the Great Tower, Oxford  ·  {hour} local solar time',font=font('segoeui.ttf',34),fill=muted,anchor='ls')
    pen.line((x0,181,right,181),fill=rule,width=2)
    gutter = 38
    tile_w = (sheet.width - x0 * 2 - gutter) // 2
    tile_h = round(tile_w * 9 / 16)
    seasonfont, descfont = font('georgia.ttf',49), font('segoeui.ttf',30)
    for i, (key, name, desc, _) in enumerate(SEASONS):
        x = x0 + (i % 2) * (tile_w + gutter)
        y = (202, 1077)[i//2]
        with Image.open(FRAMES / (key+'.jpg')) as image:
            assert image.width * 9 == image.height * 16
            tile = image.resize((tile_w,tile_h),Image.Resampling.LANCZOS)
        sheet.paste(tile, (x, y))
        pen.rectangle((x,y,x+tile_w-1,y+tile_h-1),outline='#cbcebf',width=1)
        baseline = y + tile_h + 51
        pen.text((x,baseline),name,font=seasonfont,fill=ink,anchor='ls')
        dx = pen.textlength(name,font=seasonfont)
        pen.text((x+dx+25,baseline-2),desc,font=descfont,fill=muted,anchor='ls')
    pen.line((x0,1949,right,1949), fill=rule,width=2)
    footer = font('segoeui.ttf',26)
    pen.text((x0,1983),'Same camera in all four frames  ·  Clear weather  ·  Snow off',font=footer,fill=muted,anchor='ls')
    pen.text((right,1983),'Map data © OpenStreetMap contributors  ·  openstreetmap.org/copyright',font=footer,fill=muted,anchor='rs')
    sheet.save(DEST / PLATE,quality=95,subsampling=0,optimize=True,dpi=(300,300))


def url(file):
    mime = 'image/png' if file.suffix == '.png' else 'image/jpeg'
    return 'data:'+mime+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')


def figure(key, title, description, alt):
    file = FRAMES / (key + ('.png' if key == 'site-plan' else '.jpg'))
    with Image.open(file) as im:
        width, height = im.size
    esc = html.escape
    return (f'<figure data-frame="{esc(key)}"><button type="button" class="zoom" aria-label="Enlarge {esc(title)}">'
            f'<img width="{width}" height="{height}" src="{url(file)}" alt="{esc(alt)}"></button>'
            f'<figcaption><strong>{esc(title)}</strong><span>{esc(description)}</span></figcaption></figure>')


def publish():
    capture = load(HERE / 'capture.json')
    plan = load(HERE / 'plan.json')
    focus = load(HERE / 'focus.json')
    assert capture['passed'] and all(capture['checks'].values())
    assert not capture['errors'] and not capture['external']
    unpack_missing(DEST / PAGE, FRAMES)
    views = capture['sheets']
    base = views['spring']
    for key, _, _, _ in SEASONS:
        assert views[key]['scope']=='magdalen'
        for prop in ('camera', 'eye', 'solarHour', 'clock', 'atmosphere', 'pixels'):
            assert views[key][prop] == base[prop], (key,prop)
    for key in ('winter-snow','after-dark'):
        assert views[key]['camera'] == base['camera']
    assert focus[RIVER]['visibleSites'] == ['magdalen']
    if COURT in focus:
        assert focus[COURT]['visibleSites'] == ['magdalen']
    mins = round(base['solarHour']*60)
    hour = f'{mins // 60:02d}:{mins % 60:02d}'
    plate(hour)
    viewpoints = [
        ('bridge','Magdalen Bridge and the Great Tower','High Street crosses both channels of the Cherwell. The tower rises beside the west approach.', 'The bridge deck, its arched openings and the Great Tower seen obliquely from across the river.'),
        (COURT,'Inside the Cloister','The covered arcade runs behind the piers. Founder’s Tower rises above the west range.', 'From the summer lawn, pale stone arches lead into the shade of the Cloister with Founder’s Tower overhead.'),
        (RIVER,'The footbridge to Addison’s Walk','A short footbridge crosses Holywell Mill Stream at the edge of the college grounds.', 'An autumn view of the footbridge, the water beneath it and trees along the stream.'),
        ('aerial','Above the college','The long New Building and its lawn lie north of the Cloister. High Street and the bridge mark the southern edge.', 'A high aerial view of the whole model showing the quadrangles, streets, bridge and both river channels.'),
    ]
    conditions = [
        ('winter-snow','After the snowfall','Snow settles on roofs and lawns while the dark line of High Street remains visible.', 'The same winter view with accumulated snow picking out the lawns, paths and pitched roofs.'),
        ('after-dark','After dark','The river catches the last light from the sky. Small lit windows trace the college ranges.', 'A winter night view with a deep blue sky and warm windows along the dark quadrangles.'),
    ]
    rows = '\n'.join(f'<tr><td class="num">{i}</td><td>{html.escape(p["name"])}</td><td>{p["differenceMetres"]:.2f} m</td></tr>'
                     for i,p in enumerate(plan['controls'],1))
    kw = {
        'HOUR':hour, 'PRINT_URL':url(DEST / PLATE), 'SEASONS':''.join(figure(*s) for s in SEASONS),
        'VIEWS':''.join(figure(*v) for v in viewpoints),'CONDITIONS':''.join(figure(*v) for v in conditions),
        'PLANFIG':figure('site-plan','North-up site plan','Numbered leaders locate the mapped centres. Pale rings mark the corresponding points on the visitor plan.', 'North-up map of Magdalen College with both branches of the river, a 50-metre scale and eight numbered landmarks listed in the table.'),
        'ROWS':rows,'EXTENT':' × '.join(f'{v:g}' for v in plan['metreExtents']),'BUILDINGS':str(plan['buildings']),
        'DISTANCE':str(plan['greatToFounderMetres']), 'VERSION':capture['edition'], 'BROWSER':capture['browser'],
        'MAYFIG':figure('may-morning','At the foot of the Great Tower','The first listeners gather beneath the pinnacles as the day breaks.', 'A crowd gathering on High Street beside the Great Tower in the May Morning scene.'),
        'PHONEFIG':figure('portrait','Portrait Photo mode','Autumn, after a touch drag and pinch.', 'The English photo-mode restore button above an autumn view of Magdalen College on a portrait phone viewport.'),
        'BRIDGE':f'{plan["mappedBridgeAxisMetres"]:.2f}','SAMPLES':f'{plan["hullSamples"]:,}','BENEATH':str(plan['underBridgeSamples'])
    }
    import re
    doc = re.sub(r'\{\{([A-Z_]+)\}\}',lambda m:kw[m.group(1)],(HERE / 'gallery.html.in').read_text(encoding='utf-8'))
    assert '{{' not in doc
    (DEST / PAGE).write_bytes(doc.encode('utf-8'))
    print(PAGE,(DEST / PAGE).stat().st_size,PLATE,(DEST / PLATE).stat().st_size)


if __name__ == '__main__':
    RIVER, COURT = 'river-south', 'court-spires'
    publish()
