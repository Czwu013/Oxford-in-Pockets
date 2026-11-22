import { frame, faces, mix, atY, orientedBox, clean } from './geometry.js';
import {
  palette as C,
  archPts,
  coping,
  merlons,
  lancet,
  sash,
  openBay,
  pinnacle,
  statue,
} from './masonry.js';
import { wallWithWindows } from './deep-windows.js';

function rings(g, plan, x0, x1, z0, z1, y, col, scale = 1) {
  const a = plan(x0, z0),
    b = plan(x1, z0),
    c = plan(x1, z1),
    d = plan(x0, z1);
  for (const f of faces([a, b, c, d]))
    coping(g, f, y, { width: 0.35 * scale, height: 0.17 * scale, out: 0.16 * scale, color: col });
}
function flag(g, p, y) {
  const c = '#bc9342',
    f = frame(p, [p[0] + 1, p[1] + 0.16]);
  g.bar('trim', c, f.point(0, y - 0.18), f.point(0, y + 0.68), 0.04, 6);
  g.quad(
    'trim',
    '#d8ba64',
    f.point(0, y + 0.57),
    f.point(0.47, y + 0.57, 0.015),
    f.point(0.46, y + 0.3, 0.06),
    f.point(0, y + 0.29),
  );
  g.tri(
    'trim',
    '#c99d48',
    f.point(0.46, y + 0.3, 0.06),
    f.point(0.47, y + 0.57, 0.015),
    f.point(0.89, y + 0.62),
  );
}
function towerNeedle(g, p, base, h, r, theta) {
  const n = 8,
    shoulder = base + h * 0.48;
  const outline = Array.from({ length: n }, (_, i) => [
    p[0] + Math.cos(theta + (i * Math.PI) / 4) * r * 0.87,
    p[1] + Math.sin(theta + (i * Math.PI) / 4) * r * 0.87,
  ]);
  g.frustum('stone', C.grey, p, base - 0.045, base + h * 0.09, r * 0.99, r * 0.93, 8, theta);
  for (const f of faces(outline)) {
    const x = f.l * 0.5,
      w = f.l * 0.56,
      lo = base + h * 0.095,
      spring = shoulder - h * 0.095,
      top = shoulder + 0.02,
      cut = 0.1 * (r / 0.78);
    const arch = archPts(x, w, spring, h * 0.085, 0.4, 6);
    g.panel('stone', '#cfbfa1', f, 0, x - w / 2, lo, top);
    g.panel('stone', '#cfbfa1', f, x + w / 2, f.l, lo, top);
    g.panel('rubble', '#a69b86', f, x - w / 2, x + w / 2, lo, spring, -cut);
    for (let j = 1; j < arch.length; j++) {
      const a = arch[j - 1],
        b = arch[j];
      g.quad('stone', C.light, f.point(...a), f.point(...b), f.point(b[0], top), f.point(a[0], top));
      g.quad('rubble', '#b6aa92', f.point(...a), f.point(...b), f.point(...b, -cut), f.point(...a, -cut));
      g.quad(
        'rubble',
        '#a69b86',
        f.point(a[0], spring, -cut),
        f.point(b[0], spring, -cut),
        f.point(...b, -cut),
        f.point(...a, -cut),
      );
    }
    for (const u of [x - w / 2, x + w / 2]) {
      g.quad(
        'stone',
        '#bbaf95',
        f.point(u, lo),
        f.point(u, spring),
        f.point(u, spring, -cut),
        f.point(u, lo, -cut),
      );
      g.bar('stone', C.light, f.point(u, lo, 0.016), f.point(u, spring, 0.016), 0.031 * (r / 0.78), 5);
    }
  }
  g.frustum('stone', C.light, p, shoulder - 0.06, shoulder + 0.11, r * 0.96, r * 0.83, n, theta);
  const point = base + h * 0.973;
  for (let j = 0; j < 8; j++) {
    const a = j / 8,
      b = (j + 1) / 8,
      y = shoulder + 0.095 + (point - shoulder - 0.095) * a;
    const nextY = shoulder + 0.095 + (point - shoulder - 0.095) * b,
      rr = r * (0.79 - 0.725 * a),
      nextR = r * (0.79 - 0.725 * b);
    g.frustum('stone', j % 3 === 0 ? '#c2b59a' : '#cbbc9f', p, y, nextY, rr, nextR, n, theta);
    if (j === 7) continue;
    g.frustum('stone', C.sill, p, y + 0.01, y + 0.115 * (r / 0.78), rr + r * 0.1, rr + r * 0.015, n, theta);
    for (let k = 0; k < 4; k++) {
      const az = theta + (k * Math.PI) / 2 + ((j % 2) * Math.PI) / 4,
        px = p[0] + Math.cos(az) * (rr + 0.065 * r),
        pz = p[1] + Math.sin(az) * (rr + 0.065 * r);
      g.frustum('stone', C.light, [px, pz], y + 0.04, y + 0.19 * (r / 0.78), r * 0.098, r * 0.018, 5, az);
    }
  }
  g.frustum('trim', C.sill, p, point, base + h, 0.082 * r, 0.036 * r, 6, theta);
}
function piercedMerlon(g, f, x, y, w, h) {
  const fy = y + h * 0.52,
    spanX = w * 0.5,
    spanY = h * 0.5,
    thick = 0.285,
    count = 24;
  const shapes = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count,
      cu = Math.cos(a),
      su = Math.sin(a),
      reach = 1 / Math.max(Math.abs(cu), Math.abs(su));
    const hole = 0.188 + 0.027 * Math.cos(4 * a);
    shapes.push([
      [x + cu * spanX * reach, fy + su * spanY * reach],
      [x + cu * hole, fy + su * hole],
    ]);
  }
  for (let i = 0; i < count; i++) {
    const [a, A] = shapes[i],
      [b, B] = shapes[(i + 1) % count];
    for (const d of [0.048, -thick])
      g.quad('stone', C.sill, f.point(...a, d), f.point(...b, d), f.point(...B, d), f.point(...A, d));
    g.quad(
      'rubble',
      '#a89d87',
      f.point(...A, 0.048),
      f.point(...B, 0.048),
      f.point(...B, -thick),
      f.point(...A, -thick),
    );
  }
  g.block(
    'stone',
    C.light,
    f,
    x - spanX - 0.025,
    x + spanX + 0.025,
    y + h - 0.057,
    y + h + 0.035,
    -thick - 0.022,
    0.073,
  );
}
export function greatTower(g, building) {
  // Mapped corner turret centres, not the bounding box of an axis-aligned tower.
  const corner = [
    [-29.12, 13.96],
    [-22.28, 19.55],
    [-27.36, 25.88],
    [-34.06, 20.04],
  ];
  const at = (x, z) => mix(mix(corner[0], corner[1], x), mix(corner[3], corner[2], x), z);
  const outline = (t) => [at(t, t), at(1 - t, t), at(1 - t, 1 - t), at(t, 1 - t)];
  const levels = [
    [-0.08, 9.9, 0.044],
    [9.9, 17.5, 0.05],
    [17.5, 24.65, 0.057],
    [24.65, 34.7, 0.062],
  ];
  for (const [lo, hi, t] of levels) {
    if (lo < 24) g.prism('stone', lo < 0 ? '#c8b798' : '#cec1a6', outline(t), lo, hi);
    rings(g, at, t, 1 - t, t, 1 - t, hi - 0.15, C.light, lo > 20 ? 1.38 : 1);
  }
  // The belfry is masonry around openings, with its timber in shadow behind
  // them. A dark internal core prevents sky showing through the opposite side.
  g.prism('ink', '#464c49', outline(0.29), 24.66, 34.76);
  g.cap('rubble', '#857f6c', outline(0.062), 24.69);
  g.cap('rubble', '#8e8878', outline(0.062), 34.74);
  const roof = outline(0.06);
  g.cap('lead', '#8f9997', roof, 35.02);
  for (const [i, f] of faces(roof).entries()) {
    const L = f.l;
    wallWithWindows(
      g,
      f,
      24.65,
      34.73,
      [0.27, 0.73].map((q, j) => ({
        x: L * q,
        w: L * 0.35,
        y: 25.25,
        h: 8.23,
        rise: 1.45,
        lights: 3,
        bell: true,
        depth: 0.75,
        seed: j,
      })),
      '#d5c6a9',
    );
    if (i !== 0) {
      lancet(g, f, L * 0.5, 11.15, 1.22, 2.78, 2, {
        d: 0.17,
        trim: '#d2c6ab',
        glass: '#71817d',
        frame: 0.13,
        rise: 0.62,
      });
      lancet(g, f, L * 0.5, 18.96, 1.43, 2.99, 2, {
        d: 0.13,
        trim: C.sill,
        rise: 0.73,
        frame: 0.15,
        glass: '#7b8984',
      });
    }
    if (i === 0)
      lancet(g, f, L * 0.5, 0.05, 1.63, 2.67, 1, {
        d: 0.23,
        glass: C.darkWood,
        kind: 'trim',
        noSill: true,
      });
    for (const x of [0.27, 0.73]) {
      const w = L * 0.35;
      // Thin paired upright mouldings alongside the upper tracery.
      for (const s of [-1, 1])
        g.block(
          'stone',
          '#d8c9ab',
          f,
          L * x + s * (w * 0.5 + 0.19) - 0.065,
          L * x + s * (w * 0.5 + 0.19) + 0.065,
          24.95,
          34.15,
          0.01,
          0.17,
        );
    }
    g.block('stone', C.grey, f, L * 0.5 - 0.18, L * 0.5 + 0.18, 24.92, 35.6, 0.02, 0.32);
    g.block('stone', '#c8bda2', f, 0, L, 34.64, 35.05, -0.16, 0.03);
    g.block('trim', '#9b9784', f, 0.08, L - 0.08, 34.04, 34.14, -0.02, 0.14);
    for (let j = 0; j < 12; j++) {
      const x = (L * (j + 0.5)) / 12;
      const a = f.point(x - 0.15, 34.23, 0.145),
        b = f.point(x, 34.42, 0.168),
        c = f.point(x + 0.15, 34.23, 0.145);
      g.bar('stone', C.sill, a, b, 0.044, 5);
      g.bar('stone', C.light, b, c, 0.044, 5);
    }
    // Open parapet with small lancet-shaped voids. The choir stands on the lead below.
    const cells = 14;
    for (let j = 0; j < cells; j++) {
      const x0 = (L * j) / cells,
        x1 = (L * (j + 1)) / cells;
      g.block('stone', C.limestone, f, x0, x0 + 0.092, 35.02, 35.83, -0.28, 0.046);
      g.block('stone', C.light, f, x0, x1, 35.69, 35.85, -0.3, 0.05);
      const m = (x0 + x1) * 0.5 + 0.046;
      g.bar('stone', C.sill, f.point(x0 + 0.085, 35.53, 0.02), f.point(m, 35.74, 0.02), 0.043, 5);
      g.bar('stone', C.sill, f.point(m, 35.74, 0.02), f.point(x1 + 0.015, 35.53, 0.02), 0.043, 5);
    }
    for (const q of [0.245, 0.755]) piercedMerlon(g, f, L * q, 35.8, 0.86, 0.61);
    coping(g, f, 34.37, { out: 0.22, height: 0.2 });
    const center = f.plan(L * 0.5, 0.15);
    g.frustum('stone', C.grey, center, 34.32, 37.0, 0.49, 0.47, 6);
    statue(g, f, L * 0.5, 35.4, 0.98, 0.57);
    towerNeedle(g, center, 36.93, 5.25, 0.49, 0.37);
    g.bar('trim', '#a6a18a', atY(center, 42.0), atY(center, 42.37), 0.03);
    g.bar(
      'trim',
      '#a6a18a',
      f.point(L * 0.5 - 0.115, 42.23, 0.15),
      f.point(L * 0.5 + 0.115, 42.23, 0.15),
      0.03,
    );
  }
  for (let idx = 0; idx < corner.length; idx++) {
    const p = corner[idx],
      theta = 0.37;
    for (const [lo, hi, r0, r1] of [
      [-0.05, 1.02, 0.93, 0.91],
      [1.02, 9.92, 0.82, 0.78],
      [9.92, 17.55, 0.79, 0.76],
      [17.55, 24.7, 0.77, 0.72],
      [24.7, 34.85, 0.76, 0.71],
      [34.85, 36.7, 0.81, 0.77],
    ]) {
      g.frustum('stone', C.limestone, p, lo, hi, r0, r1, 8, theta);
      g.frustum('stone', C.light, p, hi - 0.2, hi + 0.09, r1 + 0.075, r1 + 0.055, 8, theta);
    }
    for (let j = 0; j < 8; j++) {
      const a = theta + (j * Math.PI) / 4,
        r = 0.7,
        x = p[0] + Math.cos(a) * r,
        z = p[1] + Math.sin(a) * r;
      g.bar('stone', '#ddceb1', [x, 25.02, z], [x, 36.42, z], 0.09, 5);
    }
    towerNeedle(g, p, 36.65, 7.24, 0.8, theta);
    flag(g, p, 43.75);
  }
}

function bayWindow(g, f, mid, y, w, h) {
  const xa = mid - w * 0.5,
    xb = mid + w * 0.5,
    d = 0.75;
  const chain = [f.plan(xa, 0.03), f.plan(xa + 0.43, d), f.plan(xb - 0.43, d), f.plan(xb, 0.03)];
  const midP = f.plan(mid, 0.22);
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1],
      b = chain[i];
    let ff = frame(a, b);
    const c = ff.plan(ff.l * 0.5);
    if ((c[0] - midP[0]) * ff.nx + (c[1] - midP[1]) * ff.nz < 0) ff = frame(a, b, -1);
    g.panel('stone', C.grey, ff, 0, ff.l, y, y + h);
    g.tri('stone', C.sill, atY(a, y), atY(b, y), f.point(mid, y - 0.7, 0.12));
    sash(g, ff, ff.l * 0.5, y + 0.22, ff.l * 0.82, h - 0.48, {
      lights: i === 2 ? 3 : 1,
      cross: 2,
      sill: false,
      hood: false,
      glass: '#778b8d',
      trim: 0.08,
    });
    coping(g, ff, y + h - 0.02, { width: 0.26, height: 0.19, out: 0.12 });
  }
}
function openingTower(g, b, style) {
  const box = orientedBox(b.outer),
    X = box.L,
    Z = box.W,
    at = box.at;
  const h = style === 'founder' ? 15.5 : style === 'muniment' ? 13.7 : 12.4,
    tint = style === 'founder' ? '#cabfa6' : style === 'muniment' ? '#bfb7a4' : '#d2bf9f';
  // Founder's Gate runs along the long dimension of the footprint.
  const basic = [at(0, 0), at(X, 0), at(X, Z), at(0, Z)],
    fs = faces(basic);
  // Some stair-turret outlines skew the minimum rectangle; the surveyed polygon still
  // supplies the lower masonry of the Muniment and St Swithun's towers.
  if (style !== 'founder') g.prism('rubble', tint, b.outer, 4.45, h);
  for (const [i, f] of fs.entries()) {
    const passage = i % 2 === 1;
    if (passage) {
      openBay(g, f, 0, f.l, 0, 2.05, 1.4, 4.65, 0, { pier: Math.max(1, f.l - 3.3), color: tint });
      if (style === 'founder') g.panel('rubble', tint, f, 0, f.l, 4.65, h);
      if (style === 'founder') {
        bayWindow(g, f, f.l * 0.5, 6.0, Math.min(4, f.l * 0.58), 4.1);
        lancet(g, f, f.l * 0.5, 12.1, 2.24, 2.22, 3, { glass: '#768781', rise: 0.55 });
        for (const x of [0.16, 0.84]) {
          lancet(g, f, f.l * x, 6.8, 0.77, 2.63, 1, {
            glass: '#9d937c',
            kind: 'trim',
            noSill: true,
            trim: C.sill,
          });
          statue(g, f, f.l * x, 6.85, 1.7, 0.22);
        }
      } else lancet(g, f, f.l * 0.5, h - 4.0, 1.4, 2.2, 2, { glass: '#7c8a89' });
    } else {
      g.panel('rubble', tint, f, 0, f.l, 0, h);
      if (style === 'founder') sash(g, f, f.l * 0.55, h - 4.12, 1.7, 2.36, { lights: 2 });
    }
    coping(g, f, h - 0.09, { width: 0.43, out: 0.23 });
    merlons(g, f, h + 0.08, Math.max(4, Math.round(f.l / 1.05)), 0.71, 0.44, tint);
  }
  if (style === 'founder') {
    for (const z of [Z * 0.5 - 1.66, Z * 0.5 + 1.66])
      g.panel('rubble', '#b8aa91', frame(at(0.05, z), at(X - 0.05, z)), 0, X - 0.1, 0, 3.65);
    g.cap('fine', '#ad9f85', basic, 0.08);
    g.cap('rubble', '#b4a68e', basic, 4.05);
  }
  g.cap('lead', '#8f979a', basic, h - 0.14);
  if (style === 'founder') {
    for (const [i, p] of basic.entries()) {
      const r = i === 1 ? 0.72 : 0.61;
      g.frustum('stone', tint, p, 0, h + 0.4, r, r * 0.85, 8);
      g.frustum('stone', C.light, p, h - 0.14, h + 0.57, r * 1.02, r * 1.06, 8);
      pinnacle(g, p, h + 0.43, 3.9, r, { crochets: true });
    }
  } else if (style === 'swithun') {
    const p = b.outer.reduce((a, v) => (v[0] < a[0] ? v : a), b.outer[0]);
    g.frustum('stone', tint, p, 0, h + 1.6, 0.76, 0.7, 8);
    pinnacle(g, p, h + 1.45, 2.5, 0.58);
  } else {
    for (const i of [0, 3]) {
      const p = basic[i];
      g.frustum('stone', tint, p, 0, h + 0.28, 0.65, 0.59, 8);
      g.frustum('trim', C.light, p, h + 0.28, h + 0.48, 0.64, 0.63, 8);
    }
  }
}
export const foundersTower = (g, b) => openingTower(g, b, 'founder');
export const munimentTower = (g, b) => openingTower(g, b, 'muniment');
export const swithunTower = (g, b) => openingTower(g, b, 'swithun');
