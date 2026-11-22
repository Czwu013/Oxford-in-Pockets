import * as T from 'three';
import { local, surface, ridgeRoof } from './palette.js';
import { atY, faces, frame, orientedBox, seeded } from './magdalen/architecture/geometry.js';
import { archPts, coping, lancet, pinnacle, buttress } from './magdalen/architecture/masonry.js';

// Original painted panes are used down inside an opening. Its four returns,
// sill and parapet have depth and shade each other at street level.
const swatches = {
  college: ['#dac498', '#cfb38b', '#d5c3a0'],
  classical: ['#e0cda5', '#d6c1a0', '#d6c5a8'],
  town: ['#d5b79b', '#caa58e', '#dfd1b5'],
  shop: ['#cda17d', '#dac4a9', '#c1937c', '#d6c7aa'],
  cross: ['#dcc9a4', '#cfb491', '#d8c5a6'],
  keble: ['#b67357', '#ba795c', '#b8775a'],
  scientific: ['#c8a184', '#d2b28e'],
  science: ['#c8b192', '#c89d7f', '#d7bf9e'],
  warehouse: ['#b5826b', '#b5967b', '#caac8f'],
  modern: ['#b9a88d', '#b6a491', '#bb9c85'],
};
const roofPaint = ['#788891', '#71828a', '#8a8680', '#77828b', '#7b888a'];
const shopPaint = ['#48685f', '#476272', '#895f53', '#677850', '#8c6e52'];
const brickFamilies = new Set(['keble', 'kebleChapel', 'pitt', 'warehouse']);
const classicalFamilies = new Set(['classical', 'peckwater', 'clarendon', 'county']);
function bandedBrick() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 320;
  const c = canvas.getContext('2d'),
    rand = seeded(1870);
  c.fillStyle = '#b6a28c';
  c.fillRect(0, 0, 384, 320);
  for (let r = 0; r < 20; r++)
    for (let n = -1; n < 13; n++) {
      const tile =
        r === 8 || r === 9
          ? '#e4d0a8'
          : r === 6 || r === 11
            ? '#766c68'
            : (r === 15 || r === 16) && (n + Math.floor(r / 2)) % 4 === 0
              ? '#e2c79b'
              : ['#bb7555', '#c98561', '#b97759', '#c47f5d'][Math.floor(rand() * 4)];
      c.fillStyle = tile;
      c.fillRect(n * 32 + (r % 2) * 16 + 0.7, r * 16 + 0.8, 30.9, 14.5);
    }
  const t = new T.CanvasTexture(canvas);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.repeat.set(1.75, 1.5);
  t.anisotropy = 4;
  return t;
}
function panePaint() {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const c = canvas.getContext('2d'),
    r = seeded(129);
  c.fillStyle = '#b3b8ab';
  c.fillRect(0, 0, 192, 256);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 3; x++) {
      const g = c.createLinearGradient(0, y * 64, 63, y * 64 + 70);
      g.addColorStop(0, ['#637a7e', '#738984', '#81989a'][Math.floor(r() * 3)]);
      g.addColorStop(0.52, '#98aaa4');
      g.addColorStop(1, '#6e807b');
      c.fillStyle = g;
      c.fillRect(5 + x * 61, 5 + y * 61, 57, 57);
      c.fillStyle = '#626e64';
      c.fillRect(5 + x * 61, 5 + y * 61, 57, 3);
    }
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
local.polychrome = surface('Polychrome Keble brick');
local.polychrome.map = bandedBrick();
local['quarter-pane'] = surface('Set-back lead and sash lights', { interior: true });
local['quarter-pane'].map = panePaint();

// A small original shop-window atlas. The shelves, hanging prints and vases
// are drawn in canvas space and sit behind the three-dimensional shop frames.
function shopAtlas() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const p = c.getContext('2d'),
    r = seeded(1912);
  const paint = ['#ab7762', '#c4ab79', '#8b9b86', '#c8b29c', '#a2abad', '#8b7363'];
  for (let tile = 0; tile < 4; tile++) {
    p.save();
    p.translate(tile * 256, 0);
    const wash = p.createLinearGradient(0, 0, 83, 192);
    wash.addColorStop(0, '#748983');
    wash.addColorStop(0.48, '#51675e');
    wash.addColorStop(1, '#3f4d46');
    p.fillStyle = wash;
    p.fillRect(0, 0, 256, 192);
    for (const y of [85, 154]) {
      p.fillStyle = '#aa906f';
      p.fillRect(7, y, 242, 4);
      for (let x = 13; x < 233; ) {
        const w = 5 + r() * (tile === 1 ? 24 : 11),
          h = 12 + r() * 25;
        p.fillStyle = paint[Math.floor(r() * paint.length)];
        if (tile === 0 || tile === 2) {
          p.fillRect(x, y - h, w, h);
          p.fillStyle = '#d6c498';
          p.fillRect(x + 1, y - h + 4, w - 2, 2);
        } else if (tile === 1) {
          p.fillRect(x, y - h, w, h);
          p.fillStyle = '#687b76';
          p.fillRect(x + 3, y - h + 3, Math.max(2, w - 6), h - 7);
        } else {
          p.beginPath();
          p.ellipse(x + w / 2, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          p.fill();
          p.fillRect(x + w * 0.3, y - h - 3, w * 0.4, 7);
        }
        x += w + 2 + r() * 4;
      }
    }
    p.fillStyle = 'rgba(219,228,213,.10)';
    p.beginPath();
    p.moveTo(12, 0);
    p.lineTo(96, 0);
    p.lineTo(16, 192);
    p.lineTo(0, 192);
    p.fill();
    p.restore();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
local['shop-display'] = surface('Painted goods behind shop windows', { lamp: true });
local['shop-display'].map = shopAtlas();

function colour(palette, seed) {
  return palette[seed % palette.length];
}
const outsideSide = (f) => (f.nx * f.uz - f.nz * f.ux >= 0 ? 1 : -1);
function facing(rings) {
  return rings.map((ring, i) =>
    i === 0 ? faces(ring) : faces(ring).map((f) => frame(f.a, f.b, -outsideSide(f))),
  );
}
function planFrame(b, u, v, w, d) {
  return [
    b.at(u - w / 2, v - d / 2),
    b.at(u + w / 2, v - d / 2),
    b.at(u + w / 2, v + d / 2),
    b.at(u - w / 2, v + d / 2),
  ];
}
function opening(g, f, a, b, y, top, d, wallKey, wall, trim, kind, display = -1) {
  const back = d - 0.24;
  const points = (l, r, h, q, off) => [
    f.point(l, h, off),
    f.point(r, h, off),
    f.point(r, q, off),
    f.point(l, q, off),
  ];
  const left = display < 0 ? 0 : (display + 0.002) / 4,
    right = display < 0 ? 1 : (display + 0.998) / 4;
  g.mappedQuad(
    display < 0 ? 'quarter-pane' : 'shop-display',
    display < 0 ? '#b9c8bd' : '#ebe5d2',
    points(a, b, y, top, back),
    [
      [left, 0],
      [right, 0],
      [right, 1],
      [left, 1],
    ],
  );
  for (const u of [a, b])
    g.quad(wallKey, trim, f.point(u, y, d), f.point(u, top, d), f.point(u, top, back), f.point(u, y, back));
  for (const v of [y, top])
    g.quad(
      wallKey,
      v === top ? wall : trim,
      f.point(a, v, d),
      f.point(b, v, d),
      f.point(b, v, back),
      f.point(a, v, back),
    );
  g.block('trim', trim, f, a - 0.1, b + 0.1, y - 0.1, y - 0.018, d - 0.02, d + 0.12);
  if (kind === 'college' || kind === 'keble' || kind === 'classical')
    g.panel('fine', trim, f, (a + b) / 2 - 0.044, (a + b) / 2 + 0.044, y, top, d - 0.085);
}
function pediment(g, f, a, b, y, rise, tint, d = 0.14) {
  g.tri('fine', tint, f.point(a, y, d), f.point(b, y, d), f.point((a + b) / 2, y + rise, d));
  g.bar('fine', tint, f.point(a - 0.1, y, d), f.point((a + b) / 2, y + rise, d), 0.12, 5);
  g.bar('fine', tint, f.point((a + b) / 2, y + rise, d), f.point(b + 0.1, y, d), 0.12, 5);
}
function bay(g, fw, f, j, step, floors, h, kind, wallKey, stone, seed) {
  const a = j * step,
    b = a + step,
    mid = (a + b) / 2;
  const trim = kind === 'keble' ? '#e1c49a' : '#ddccab';
  const shop = (kind === 'shop' || kind === 'cross') && fw;
  const isDoor = fw && j === Math.floor(f.l / step / 2) && f.l > 6;
  for (let floor = 0; floor < floors; floor++) {
    const y0 = (h * floor) / floors,
      y1 = (h * (floor + 1)) / floors;
    const isShop = shop && floor === 0,
      door = isDoor && !floor;
    const width =
      door && isShop
        ? Math.min(step * 0.67, 1.32)
        : Math.min(step * (isShop ? 0.83 : kind === 'modern' ? 0.67 : 0.46), isShop ? 3.75 : 2.5);
    const left = mid - width / 2,
      right = mid + width / 2;
    const sill = door ? 0.035 : y0 + (y1 - y0) * (isShop ? 0.17 : 0.27),
      head = y0 + (y1 - y0) * 0.84;
    const wk = isShop ? 'trim' : wallKey,
      st = isShop ? colour(shopPaint, seed) : stone;
    for (const [u, v, lo, hi] of [
      [a, left, y0, y1],
      [right, b, y0, y1],
      [left, right, y0, sill],
      [left, right, head, y1],
    ]) {
      if (hi - lo > 0.025) g.panel(wk, st, f, u, v, lo, hi);
    }
    if (door) {
      g.panel('trim', '#675544', f, left, right, sill, head, -0.27);
      for (const u of [left, right])
        g.quad(
          'fine',
          trim,
          f.point(u, sill, 0),
          f.point(u, head, 0),
          f.point(u, head, -0.28),
          f.point(u, sill, -0.28),
        );
      g.block('fine', trim, f, left - 0.13, right + 0.13, head - 0.01, head + 0.12, -0.02, 0.13);
      if (isShop) {
        opening(g, f, left + 0.12, right - 0.12, 0.83, head - 0.16, 0.035, 'trim', st, st, 'door');
        g.block('trim', '#d1b17e', f, right - 0.18, right - 0.11, 0.67, 0.82, -0.23, -0.17);
      }
    } else
      opening(
        g,
        f,
        left,
        right,
        sill,
        head,
        0,
        wk,
        st,
        isShop ? st : trim,
        kind,
        isShop ? (seed + j) % 4 : -1,
      );
    if (isShop) {
      g.block('trim', st, f, a, b, head + 0.02, Math.min(y1, head + 0.46), 0.01, 0.17);
      g.panel('trim', '#daccac', f, a + 0.16, b - 0.16, head + 0.085, head + 0.13, 0.18);
    } else if (kind === 'classical' && floor === 1 && j % 3 === 1)
      pediment(g, f, left - 0.11, right + 0.11, head + 0.1, 0.37, trim);
  }
}
function slopedRoof(g, r, h, rise, tint, wall) {
  ridgeRoof(g, r, h, rise, tint, wall);
}
const specialHeights = {
  pitt: 12.1,
  kebleChapel: 17.2,
  exeterChapel: 15.6,
  clarendon: 12.25,
  peckwater: 14.4,
  meadow: 14.3,
  twins: 12.5,
  abbot: 7.2,
  canterburyGate: 7.8,
  soulsLibrary: 12.9,
  divinity: 10.9,
};
export const fabricHeight = (record, style) => specialHeights[style.family] || record[2];

function archPortal(g, f, mid, w, y, h, shade) {
  const rise = w * 0.43,
    spring = y + h - rise;
  let prev;
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (i * Math.PI) / 12,
      p = f.point(mid + Math.cos(a) * w * 0.5, spring + Math.sin(a) * rise, 0.1);
    if (prev) g.bar('fine', shade, prev, p, 0.14, 5);
    prev = p;
  }
  for (const s of [-1, 1])
    g.block('fine', shade, f, mid + (s * w) / 2 - 0.12, mid + (s * w) / 2 + 0.12, y, spring, -0.09, 0.15);
}
function skinWithPassages(g, detail, f, style, h, wallKey, stone, trim, exposed, seed) {
  // Intersect each covered route with this facade and cut the passage all the
  // way through the ground storey. The paved mapped route runs below the roof.
  const doors = [];
  for (const path of style.passages || []) {
    for (let j = 1; j < path.length; j++) {
      const a = path[j - 1],
        b = path[j];
      const normal = (p) => (p[0] - f.a[0]) * f.nx + (p[1] - f.a[1]) * f.nz;
      const na = normal(a),
        nb = normal(b);
      if (na * nb > 0 || Math.abs(na - nb) < 0.001) continue;
      const t = na / (na - nb),
        x = a[0] + t * (b[0] - a[0]),
        z = a[1] + t * (b[1] - a[1]);
      const u = (x - f.a[0]) * f.ux + (z - f.a[1]) * f.uz;
      if (u > 0.15 && u < f.l - 0.15) doors.push([Math.max(0, u - 1.2), Math.min(f.l, u + 1.2)]);
    }
  }
  doors.sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  const paint = (a, b) => {
    if (b - a < 0.08) return;
    const edge = frame(f.plan(a), f.plan(b), outsideSide(f));
    g.panel(wallKey, stone, edge, 0, edge.l, 0, h, -0.32);
    if (!exposed || edge.l < 3) {
      g.panel(wallKey, stone, edge, 0, edge.l, 0, h);
      return;
    }
    const material = style.family,
      shop = material === 'shop' || material === 'cross';
    const floors = Math.max(1, Math.min(5, Math.round(style.levels || h / (shop ? 3.3 : 3.65))));
    const bays = Math.max(
      1,
      Math.min(28, Math.round(edge.l / (material === 'modern' ? 4.25 : shop ? 3.75 : 4.1))),
    );
    const step = edge.l / bays;
    for (let j = 0; j < bays; j++)
      bay(detail, true, edge, j, step, floors, h, material, wallKey, stone, seed);
    coping(g, edge, h, { height: 0.15, width: 0.16, color: trim });
  };
  for (const [a, b] of doors) {
    if (b <= cursor) continue;
    paint(cursor, Math.max(cursor, a));
    const top = Math.min(3.4, h * 0.55);
    g.panel(wallKey, stone, f, a, b, top, h);
    archPortal(g, f, (a + b) / 2, b - a, 0, top, trim);
    for (const u of [a, b])
      g.quad(
        wallKey,
        trim,
        f.point(u, 0, 0),
        f.point(u, top, 0),
        f.point(u, top, -1.24),
        f.point(u, 0, -1.24),
      );
    g.quad(
      wallKey,
      trim,
      f.point(a, top, 0),
      f.point(b, top, 0),
      f.point(b, top, -1.24),
      f.point(a, top, -1.24),
    );
    cursor = b;
  }
  paint(cursor, f.l);
}
function arcadedFacade(g, f, h, n, kind) {
  const count = n || Math.max(2, Math.round(f.l / 4.2)),
    step = f.l / count,
    trim = '#d8c4a0';
  for (let j = 0; j < count; j++) {
    const u = (j + 0.5) * step,
      w = Math.min(step * 0.72, 3.56);
    if (kind === 'meadow') {
      for (const base of [1.02, 6.1, 10.3]) {
        lancet(g, f, u, base, w, base > 9 ? 2.6 : 3.4, base > 9 ? 2 : 3, { glass: '#788b86', trim, n: 6 });
      }
    } else if (kind === 'pitt') {
      // A continuous yellow-brick blind arcade on the northern gable wall.
      archPortal(g, f, u, step * 0.78, 0.63, h * 0.68, '#ac8d74');
      g.block('brick', '#bc9c75', f, j * step + 0.06, j * step + 0.5, 0.04, h * 0.79, -0.01, 0.25);
    } else {
      lancet(g, f, u, 1.45, w, h - 3.1, 3, { glass: '#77888a', trim, n: 8 });
      buttress(g, f, j * step + 0.3, 0, h * 0.82, 0.36, 0.52);
    }
  }
}
function finials(g, ring, h) {
  for (const p of ring) pinnacle(g, p, h, 2.1, 0.32, { color: '#d9c7a7' });
}
function peckwaterLibrary(g, detail, r, fs, h, stone, trim) {
  const quad = fs.filter((f) => f.nz < -0.55).sort((a, b) => b.l - a.l)[0];
  for (const f of fs) {
    g.panel('stone', stone, f, 0, f.l, 0, h, -0.32);
    const front = f === quad,
      n = front ? 7 : Math.max(1, Math.round(f.l / 5.0)),
      bayWidth = f.l / n;
    for (let j = 0; j < n; j++) {
      const a = j * bayWidth,
        b = a + bayWidth,
        mid = (a + b) / 2;
      const half = Math.min(front ? 1.42 : 0.89, bayWidth * 0.28),
        left = mid - half,
        right = mid + half;
      const door = front && j === 3;
      for (const [u, v, bottom, top] of [
        [a, left, 0, h],
        [right, b, 0, h],
        [left, right, 0, door ? 0 : 1.14],
        [left, right, 4.71, 6.6],
        [left, right, 11.6, h],
      ]) {
        if (top > bottom) g.panel('stone', stone, f, u, v, bottom, top);
      }
      if (door) {
        g.panel('trim', '#69503f', f, left, right, 0.02, 4.71, -0.2);
        archPortal(detail, f, mid, half * 2, 0, 4.68, trim);
        g.block('trim', '#ac936e', f, mid - 0.03, mid + 0.03, 0.09, 3.57, -0.19, -0.16);
      } else opening(detail, f, left, right, 1.14, 4.71, 0, 'stone', stone, trim, 'classical');
      opening(detail, f, left, right, 6.6, 11.6, 0, 'stone', stone, trim, 'classical');
      for (const y of [2.85, 8.4, 10.05]) detail.panel('fine', trim, f, left, right, y, y + 0.092, -0.08);
      if (front && j % 2 === 1) pediment(detail, f, left - 0.23, right + 0.23, 11.7, 0.5, trim);
    }
    if (!front) continue;
    const margin = 0.72,
      spacing = (f.l - 2 * margin) / 7;
    for (let j = 0; j <= 7; j++) {
      const u = margin + spacing * j,
        p = f.plan(u, 0.34);
      g.block('fine', trim, f, u - 0.72, u + 0.72, 0.04, 0.55, -0.1, 0.99);
      for (const [lo, hi, r0, r1] of [
        [0.53, 0.71, 0.67, 0.59],
        [0.7, 0.86, 0.6, 0.54],
        [0.85, 1.08, 0.58, 0.53],
        [1.07, 12.02, 0.51, 0.43],
        [12.0, 12.23, 0.46, 0.53],
        [12.2, 12.7, 0.48, 0.64],
      ]) {
        g.frustum('fine', trim, p, lo, hi, r0, r1, 14);
      }
      for (let k = 0; k < 8; k++) {
        const angle = (k * Math.PI) / 4,
          dx = Math.sin(angle),
          dz = Math.cos(angle);
        detail.bar(
          'fine',
          '#bfad8e',
          atY([p[0] + dx * 0.51, p[1] + dz * 0.51], 1.16),
          atY([p[0] + dx * 0.43, p[1] + dz * 0.43], 11.96),
          0.022,
          5,
        );
        detail.frustum('fine', '#e2d1ad', [p[0] + dx * 0.5, p[1] + dz * 0.5], 12.16, 12.59, 0.1, 0.042, 5);
      }
      g.block('fine', trim, f, u - 0.68, u + 0.68, 12.68, 12.93, -0.29, 1.0);
    }
    for (const [lo, hi, out] of [
      [12.94, 13.18, 0.83],
      [13.18, 13.72, 0.68],
      [13.72, 13.88, 0.92],
      [13.88, h, 1.05],
    ]) {
      g.block('fine', trim, f, -0.06, f.l + 0.06, lo, hi, -0.15, out);
    }
  }
  ridgeRoof(g, r, h, 0.95, '#7b8789', stone);
}
function goldenCrossGallery(g, f) {
  const n = Math.max(2, Math.round(f.l / 2.22)),
    step = f.l / n,
    timber = '#665345',
    plaster = '#e1d2ad';
  g.block('fine', plaster, f, 0, f.l, 3.44, 6.06, 0.03, 0.62);
  for (const y of [3.37, 5.93]) g.block('trim', timber, f, -0.06, f.l + 0.06, y, y + 0.15, -0.02, 0.73);
  for (let j = 0; j < n; j++) {
    const a = j * step,
      b = a + step;
    g.block('trim', timber, f, a, a + 0.11, 3.47, 5.94, 0.58, 0.73);
    if (j % 3 !== 0) {
      opening(g, f, a + 0.27, b - 0.22, 4.0, 5.66, 0.9, 'trim', timber, timber, 'gallery');
      const mid = (a + b) / 2;
      g.panel('trim', timber, f, mid - 0.054, mid + 0.054, 4.0, 5.66, 0.74);
    } else {
      g.bar('trim', timber, f.point(a + 0.1, 3.55, 0.71), f.point(b - 0.08, 5.88, 0.71), 0.073, 4);
    }
    g.bar('trim', timber, f.point(a + 0.13, 2.77, 0.02), f.point(a + 0.13, 3.43, 0.61), 0.091, 4);
  }
}
function chapelDress(g, f, h, kind) {
  if (f.l < 7.5) return;
  const n = Math.max(2, Math.round(f.l / 4.2)),
    step = f.l / n;
  if (kind === 'kebleChapel') {
    for (const y of [1.2, 2.84, 10.64, h - 0.47])
      g.block('trim', '#dec39e', f, 0, f.l, y, y + 0.12, -0.028, 0.075);
    for (let j = 0; j < n; j++) {
      const mid = (j + 0.5) * step,
        w = Math.min(step * 0.72, 3.56),
        top = h - 1.65,
        rise = w * 0.64;
      const a = archPts(mid, w + 0.04, top - rise, rise, 0.4, 12),
        b = archPts(mid, w + 0.59, top - rise, rise + 0.31, 0.4, 12);
      for (let k = 1; k < a.length; k++)
        g.quad(
          'trim',
          k % 2 ? '#d8bb96' : '#9c6754',
          f.point(...a[k - 1], 0.139),
          f.point(...a[k], 0.139),
          f.point(...b[k], 0.139),
          f.point(...b[k - 1], 0.139),
        );
    }
  }
}
function signature(g, detail, record, style, stone, trim, h) {
  const [id, r] = record,
    kind = style.family,
    outer = r[0],
    box = orientedBox(outer),
    fs = faces(outer);
  const front = fs.slice().sort((a, b) => b.l - a.l)[0];
  if (kind === 'theatre' || kind === 'bridge') return;
  if (kind === 'peckwater') {
    peckwaterLibrary(g, detail, r, fs, h, stone, trim);
    return;
  }
  if (kind === 'twins') {
    // The two western projecting squares belong to one mapped gatehouse.
    g.prism('stone', stone, outer, 0.02, h);
    for (const start of [0, 6]) {
      const i = fs
        .slice()
        .sort((a, b) => a.nx - b.nx)
        .filter((f) => f.l > 3 && f.l < 7)
        .sort((a, b) => a.a[1] - b.a[1]);
      const edge = i[start ? i.length - 1 : 0];
      if (!edge) continue;
      const p = edge.plan(edge.l * 0.5, -2.15),
        base = planFrame(box, ...box.uv(p), 4.32, 4.62);
      g.prism('fine', trim, base, h - 0.1, 24.0);
      for (const f of faces(base)) {
        lancet(detail, f, f.l * 0.5, 16.2, 2.05, 4.55, 2, { n: 6, glass: '#5c7371' });
        coping(g, f, 22.12);
        coping(g, f, 24.0);
      }
      finials(g, base, 24);
      for (const [y0, y1, r0, r1] of [
        [24, 25.1, 2.8, 2.2],
        [25.1, 28.1, 2.1, 1.25],
        [28.1, 29.8, 1.25, 0.32],
      ])
        g.frustum('fine', trim, p, y0, y1, r0, r1, 8, 0.16);
      pinnacle(g, p, 29.6, 1.9, 0.38, { color: trim });
    }
    return;
  }
  if (kind === 'abbot') {
    g.prism('stone', '#b6a78f', outer, 0, 7.2);
    const p = box.at(box.L / 2, box.W / 2);
    for (const f of fs) g.tri('roof', '#74838a', atY(f.a, 7.2), atY(f.b, 7.2), atY(p, 14.2));
    g.frustum('stone', trim, p, 12.6, 15.5, 1.18, 1.05, 8);
    g.frustum('roof', '#707d7d', p, 15.5, 16.55, 1.4, 0.22, 8);
    return;
  }
  const wk = kind === 'kebleChapel' ? 'polychrome' : kind === 'pitt' ? 'brick' : 'stone';
  if (['pitt', 'kebleChapel', 'exeterChapel', 'meadow', 'soulsLibrary', 'divinity'].includes(kind)) {
    const wall = kind === 'kebleChapel' ? '#f2e7d7' : kind === 'pitt' ? '#cfb08d' : stone;
    for (const f of fs) {
      g.panel(wk, wall, f, 0, f.l, 0, h);
      coping(g, f, h, { color: trim });
      if (kind === 'pitt') {
        if (f.nz < -0.45 && f.l > 10) arcadedFacade(detail, f, h, 0, 'pitt');
      } else if (f.l > 7.5) {
        if (kind === 'meadow' && f.nz < 0.12) {
          const n = Math.max(1, Math.round(f.l / 4.1));
          for (let j = 0; j < n; j++)
            for (const y of [1.05, 5.8, 10.1])
              lancet(detail, f, ((j + 0.5) * f.l) / n, y, 2.23, 2.7, 2, { n: 5 });
        } else {
          arcadedFacade(detail, f, h, null, kind);
          chapelDress(detail, f, h, kind);
        }
      }
    }
    ridgeRoof(
      g,
      r,
      h,
      kind === 'kebleChapel' ? 8.0 : kind === 'exeterChapel' ? 9.1 : kind === 'pitt' ? 5.8 : 4.05,
      colour(roofPaint, 1),
      wall,
      'roof',
      wk,
    );
    if (kind === 'kebleChapel') {
      const p = box.at(box.L * 0.36, box.W / 2);
      g.frustum('trim', '#6b7778', p, h + 6.8, h + 9.1, 0.52, 0.41, 8);
      g.frustum('roof', '#71848a', p, h + 9, h + 12, 0.55, 0.02, 8);
    }
    if (kind === 'exeterChapel') {
      const p = box.at(box.L * 0.39, box.W / 2);
      for (const [lo, hi, rb, rt] of [
        [8.61, 9.55, 1.07, 0.86],
        [9.54, 11.45, 0.72, 0.76],
        [11.44, 11.92, 0.94, 0.75],
        [11.91, 18.48, 0.72, 0.04],
      ])
        g.frustum('lead', '#788d8b', p, h + lo, h + hi, rb, rt, 8);
    }
    return;
  }
  for (const [i, ring] of facing(r).entries())
    for (const [j, f] of ring.entries())
      skinWithPassages(
        g,
        detail,
        f,
        style,
        h,
        wk,
        stone,
        trim,
        style.edges[i]?.includes(j),
        Number(id.slice(1)),
      );
  if (style.facets) {
    for (const tri of style.facets)
      g.tri('roof', colour(roofPaint, Number(id.slice(1))), ...tri.map(([x, z, dy]) => [x, h + dy, z]));
  } else slopedRoof(g, r, h, Math.min(box.W * 0.23, 4.15), colour(roofPaint, Number(id.slice(1))), stone);
  if (kind === 'clarendon') {
    const street = fs.filter((f) => f.nz < -0.55).sort((a, b) => b.l - a.l)[0] || front;
    const mid = street.l / 2,
      w = Math.min(14.5, street.l * 0.94);
    for (let j = 0; j < 6; j++) {
      const p = street.plan(mid - w / 2 + (w * j) / 5, 1.77);
      g.frustum('fine', trim, p, 0.33, 0.61, 0.6, 0.52, 12);
      g.frustum('fine', trim, p, 0.61, h - 1.25, 0.48, 0.41, 12);
      g.frustum('fine', trim, p, h - 1.25, h - 0.8, 0.51, 0.61, 12);
    }
    g.block('fine', trim, street, mid - w * 0.55, mid + w * 0.55, h - 0.82, h + 0.12, -0.12, 2.48);
    pediment(g, street, mid - w * 0.55, mid + w * 0.55, h + 0.13, 2.05, trim, 2.5);
  }
}
const signatureFamilies = new Set([
  'twins',
  'abbot',
  'pitt',
  'kebleChapel',
  'exeterChapel',
  'meadow',
  'soulsLibrary',
  'divinity',
  'theatre',
  'bridge',
  'clarendon',
  'peckwater',
]);
export function drawFabric(g, detail, record, style) {
  const [id, r] = record,
    kind = style.family,
    seed = Number(id.slice(1)),
    h = fabricHeight(record, style);
  const set =
    swatches[kind] ||
    (brickFamilies.has(kind)
      ? swatches.keble
      : classicalFamilies.has(kind)
        ? swatches.classical
        : swatches.college);
  const stone = kind === 'keble' ? '#f0e4d5' : colour(set, seed),
    trim = brickFamilies.has(kind) ? '#dcbd96' : '#d9c7a5';
  if (signatureFamilies.has(kind)) {
    signature(g, detail, record, style, stone, trim, h);
    return;
  }
  const wk =
    kind === 'keble' ? 'polychrome' : kind === 'warehouse' ? 'brick' : kind === 'modern' ? 'trim' : 'stone';
  for (const [i, ring] of facing(r).entries())
    for (const [j, f] of ring.entries()) {
      skinWithPassages(g, detail, f, style, h, wk, stone, trim, style.edges[i]?.includes(j), seed);
      if (kind === 'keble' && f.l > 3)
        for (const y of [h * 0.32, h * 0.67]) g.panel('fine', '#cba98b', f, 0, f.l, y, y + 0.12, 0.017);
      if (kind === 'cross' && f.l > 3 && f.l < 37) {
        g.block('trim', '#796757', f, 0, f.l, h * 0.51, h * 0.51 + 0.17, 0.018, 0.24);
        for (let u = 0.28; u < f.l - 0.12; u += 3.1)
          g.panel('trim', '#826d59', f, u, u + 0.12, h * 0.51, h - 0.16, 0.023);
        if ((id === 'w311136298' || id === 'w311136300') && f.nz > 0.65 && f.l > 6)
          goldenCrossGallery(detail, f);
      }
    }
  const box = orientedBox(r[0]),
    roof = kind === 'warehouse' && seed % 3 === 0 ? '#a36f56' : colour(roofPaint, seed);
  if (style.roof === 'flat' || kind === 'modern') g.cap('roof', roof, r[0], h + 0.01, r.slice(1));
  else if (style.facets)
    for (const tri of style.facets) g.tri('roof', roof, ...tri.map(([x, z, dy]) => [x, h + dy, z]));
  else slopedRoof(g, r, h, Math.min(box.W * (kind === 'keble' ? 0.47 : 0.3), 5.3), roof, stone);
  if (
    kind !== 'modern' &&
    kind !== 'outbuilding' &&
    kind !== 'nuffield' &&
    box.L > 6 &&
    r.length === 1 &&
    r[0].length <= 6
  ) {
    for (let j = 0; j < Math.min(3, Math.ceil(box.L / 23)); j++) {
      const u = (box.L * (j + 0.45)) / Math.min(3, Math.ceil(box.L / 23)),
        p = box.at(u, box.W * 0.5);
      const top = h + Math.min(box.W * (kind === 'keble' ? 0.47 : 0.3), 5.3) + 1.05;
      g.prism('stone', stone, planFrame(box, u, box.W * 0.5, 1.2, 0.7), top - 1.65, top);
      g.frustum('trim', '#ad7c5e', p, top, top + 0.48, 0.19, 0.16, 6);
    }
  }
}
export function nuffieldSpire(g, [ring, total]) {
  const box = orientedBox(ring),
    p = box.at(box.L / 2, box.W / 2);
  g.prism('fine', '#d8c8a8', ring, 8.2, 26.5);
  for (const f of faces(ring)) {
    coping(g, f, 21.2);
    coping(g, f, 26.5);
    const n = Math.max(2, Math.round(f.l / 2.0));
    for (let j = 0; j < n; j++)
      g.panel('ink', '#58635c', f, ((j + 0.26) * f.l) / n, ((j + 0.71) * f.l) / n, 21.7, 25.55, 0.025);
  }
  g.frustum(
    'lead',
    '#88a296',
    p,
    26.44,
    total - 1.0,
    box.W * 0.69,
    0.16,
    4,
    Math.atan2(box.uz, box.ux) + Math.PI / 4,
  );
  g.frustum('trim', '#91886f', p, total - 1.05, total, 0.09, 0.016, 7);
}
