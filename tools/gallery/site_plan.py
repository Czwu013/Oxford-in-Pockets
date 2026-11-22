import json
from pathlib import Path

from PIL import Image, ImageDraw


HERE = Path(__file__).resolve().parent
DATA = HERE.parents[1] / 'src/magdalen/data'
from fonts import font


def read(file):
    return json.loads(file.read_text(encoding='utf-8'))


def make_plan():
    site = read(DATA / 'site.json')
    buildings = read(DATA / 'buildings.json')
    trees = read(DATA / 'ecology.json')['trees']
    checks = read(HERE / 'plan.json')['controls']
    size = (1220, 1230)
    paper = '#f6f3e9'
    ink = '#355446'
    outline = '#92826c'
    canvas = Image.new('RGB', size, paper)
    pen = ImageDraw.Draw(canvas)
    boundary = site['boundary']['outer']
    west, north = (min(p[i] for p in boundary) for i in range(2))
    east, south = (max(p[i] for p in boundary) for i in range(2))
    scale = min(1102 / (east - west), 1095 / (south - north))
    left = (size[0] - scale * (east - west)) / 2
    top = 46

    def point(p):
        return (round(left + (p[0] - west) * scale), round(top + (p[1] - north) * scale))

    def ring(coords):
        return [point(p) for p in coords]

    def polygon(item, colour, edge=None, stroke=2):
        outside = ring(item['outer'])
        holes = [ring(h) for h in item.get('holes', [])]
        if holes:
            mask = Image.new('L', size)
            mask_pen = ImageDraw.Draw(mask)
            mask_pen.polygon(outside, fill=255)
            for h in holes:
                mask_pen.polygon(h, fill=0)
            canvas.paste(colour, (0, 0, *size), mask)
        else:
            pen.polygon(outside, fill=colour)
        if edge:
            for r in [outside] + holes:
                pen.line(r + [r[0]], fill=edge, width=stroke, joint='curve')

    polygon(site['boundary'], '#cfd8b9', '#b2bba4')
    palette = {'road':'#b6b4a8','pavement':'#dcd4c3','path':'#e2d9bb','lawn':'#b9cba4',
               'court':'#e3d7be','bed':'#a8bc98','meadow':'#c6d4ae','grove':'#bdcba9'}
    for surface in site['surfaces']:
        polygon(surface, palette[surface['kind']])
    for water in site['water']:
        polygon(water, '#a3c4c0', '#86a9a5')
    for tree in trees:
        x, y = point([tree['x'], tree['z']])
        r = max(3, round(scale * tree['radius'] * .55))
        pen.ellipse((x-r, y-r, x+r, y+r), outline='#9dab8c', width=1)
    for building in buildings:
        col = '#c8bda5' if building['role'] == 'context' else '#cfb18a'
        polygon(building, col, outline)
    polygon(site['bridge'], '#d3c3a3', '#9a886d', 3)
    line = ring(site['addisonBridge'])
    pen.line(line, fill=outline, width=9)
    pen.line(line, fill='#e1d2ae', width=5)

    offsets = [(-32,52),(-26,-52),(-63,-9),(24,-38),(-1,43),(52,16),(-48,31),(57,-33)]
    for i, (check, (dx, dy)) in enumerate(zip(checks, offsets), 1):
        x, y = point(check['osmMetres'])
        u, v = point(check['planMetres'])
        a, b = x + dx, y + dy
        pen.line((a,b,x,y), fill='#4d6558', width=2)
        pen.ellipse((u-6,v-6,u+6,v+6), outline=paper, width=3)
        pen.ellipse((x-3,y-3,x+3,y+3), fill='#2d5444')
        pen.ellipse((a-17,b-17,a+17,b+17), fill=ink, outline=paper, width=2)
        pen.text((a,b), str(i), font=font('segoeuib.ttf',19), fill='#fffdf0', anchor='mm', stroke_width=0)

    x, y = 65, 84
    pen.text((x,y-37),'N',font=font('georgia.ttf',25),fill=ink,anchor='mm')
    pen.line((x,y-15,x,y+33),fill=ink,width=3)
    pen.polygon([(x,y-17),(x-7,y+2),(x,y-3),(x+7,y+4)],fill=ink)
    x, y = 67, 1174
    xm, xe = x + round(25*scale), x + round(50*scale)
    pen.rectangle((x,y,xm,y+6),fill=ink)
    pen.rectangle((xm,y,xe,y+6),outline=ink,width=2)
    pen.text((x,y-6),'0',font=font('segoeui.ttf',17),fill=ink,anchor='ls')
    pen.text((xe,y-6),'50 m',font=font('segoeui.ttf',17),fill=ink,anchor='rs')
    pen.text((1151,y+6),'Map data © OpenStreetMap contributors',font=font('segoeui.ttf',18),fill='#54665b',anchor='rs')
    dest = HERE / 'frames/site-plan.png'
    dest.parent.mkdir(exist_ok=True)
    canvas.save(dest,optimize=True)


if __name__ == '__main__':
    make_plan()
