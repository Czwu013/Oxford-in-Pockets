import * as T from 'three';
import detail from './data/districts.json';
import section from './data/castle-section.json';
import { batch } from './palette.js';
import { faces, frame, atY, mix, seeded } from './magdalen/architecture/geometry.js';
import { archPts, coping } from './magdalen/architecture/masonry.js';
import { kerb, bench, downpipe, fence, drain } from './street-craft.js';

const site = detail.castle,
  summit = site.summit,
  tau = Math.PI * 2;
const stone = '#b1a491',
  mortar = '#ccc1a8',
  weathered = '#968f7c',
  iron = '#505955';
const innerR = (a) => 10.75 + 0.68 * Math.cos(2 * a + 0.3) + 0.23 * Math.sin(3 * a);
function outerR(a) {
  // Intersect the ray with the OSM retaining-wall boundary. The grass parcel
  // also includes a level apron outside the documented 65 m motte base.
  const dx = Math.cos(a),
    dz = Math.sin(a);
  let limit = 32.5;
  for (let i = 0; i < site.mound.length; i++) {
    const p = site.mound[i],
      q = site.mound[(i + 1) % site.mound.length],
      vx = q[0] - p[0],
      vz = q[1] - p[1];
    const det = dx * vz - dz * vx;
    if (Math.abs(det) < 0.0001) continue;
    const ax = p[0] - summit[0],
      az = p[1] - summit[1],
      r = (ax * vz - az * vx) / det,
      t = (ax * dz - az * dx) / det;
    if (t >= 0 && t <= 1 && r > 0) limit = Math.min(limit, r - 0.23);
  }
  return limit;
}
export function moundHeight(x, z) {
  const dx = x - summit[0],
    dz = z - summit[1],
    r = Math.hypot(dx, dz);
  if (r > 33) return 0.04;
  const a = Math.atan2(dz, dx),
    inner = innerR(a),
    outer = outerR(a);
  if (r >= outer) return 0.04;
  if (r < inner) return 18.02;
  const t = (outer - r) / (outer - inner);
  return (
    0.04 +
    17.98 * (0.2 * t + 0.8 * t * t * (3 - 2 * t)) +
    0.16 * Math.sin(4 * a + t * 7) * Math.sin(t * Math.PI)
  );
}
function gradedPath(g, route, width, color) {
  let prev;
  for (let k = 1; k < route.length; k++) {
    const a = route[k - 1],
      b = route[k],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      steps = Math.ceil(len / 0.58);
    if (len < 0.05) continue;
    const dx = (-(b[1] - a[1]) * width * 0.5) / len,
      dz = ((b[0] - a[0]) * width * 0.5) / len;
    for (let j = 0; j <= steps; j++) {
      const p = mix(a, b, j / steps),
        pair = [-1, 1].map((s) => {
          const x = p[0] + s * dx,
            z = p[1] + s * dz;
          return [x, moundHeight(x, z) + 0.081, z];
        });
      if (prev) g.quad('paving', color, prev[0], prev[1], pair[1], pair[0]);
      prev = pair;
    }
  }
}
function earthwork(g) {
  g.cap('grass', '#a3ab83', site.mound, 0.019);
  kerb(g, site.mound, 0.16, '#99927e');
  const rand = seeded(246),
    rings = [];
  for (let k = 0; k <= 18; k++) {
    const ring = [];
    for (let i = 0; i < 88; i++) {
      const a = (tau * i) / 88,
        r = innerR(a) + ((outerR(a) - innerR(a)) * k) / 18;
      ring.push([summit[0] + r * Math.cos(a), summit[1] + r * Math.sin(a)]);
    }
    rings.push(ring);
  }
  const y = (p) => atY(p, moundHeight(...p));
  for (let k = 1; k < rings.length; k++)
    for (let i = 0; i < 88; i++) {
      const j = (i + 1) % 88;
      g.quad(
        'grass',
        ['#a1aa7f', '#9eaa80', '#a2ab81', '#a0a980'][Math.floor(rand() * 4)],
        y(rings[k - 1][i]),
        y(rings[k - 1][j]),
        y(rings[k][j]),
        y(rings[k][i]),
      );
    }
  // Well-chamber stair descends through a cut in the summit.
  const [a, b] = site.wellSteps,
    stair = frame(a, b),
    well = [
      stair.plan(1.8, -0.68),
      stair.plan(stair.l + 0.67, -0.68),
      stair.plan(stair.l + 0.67, 0.68),
      stair.plan(1.8, 0.68),
    ];
  g.cap('grass', '#a9ae87', rings[0], 18.02, [well]);
  for (const f of faces(well)) g.panel('ragstone', weathered, f, 0, f.l, 15.87, 18.04);
  for (let j = 0; j < 12; j++) {
    const u = 1.8 + j * 0.245,
      h = 18.05 - 0.166 * j;
    g.block('flagstone', j % 3 ? '#b0a48d' : '#c5b79c', stair, u, u + 0.247, h - 0.18, h, -0.66, 0.66);
  }
  for (const off of [-0.73, 0.73]) {
    const run = [stair.plan(1.45, off), stair.plan(stair.l + 0.78, off)];
    fence(g, run, () => 18.04, 0.87);
  }
  gradedPath(g, site.path, 1.15, '#b8ac85');
  gradedPath(g, site.westPath, 1.05, '#b3a486');
  for (let k = 0; k < 7; k++) {
    const f = frame(site.steps[2], site.steps[0]);
    const u = (f.l * k) / 7;
    g.block('fine', '#b4aa93', f, u, u + f.l / 7, 0.025, 0.08 + 0.078 * k, -0.76, 0.76);
  }
  for (let k = 0; k < 10; k++) {
    // Low exposed courses are all that remains of the medieval summit keep.
    const a = (k * tau) / 10 + 0.13,
      b = ((k + 1) * tau) / 10 + 0.13;
    if (k === 1 || k === 6 || k === 8) continue;
    const p = [summit[0] + 9.1 * Math.cos(a), summit[1] + 9.1 * Math.sin(a)],
      q = [summit[0] + 9.1 * Math.cos(b), summit[1] + 9.1 * Math.sin(b)];
    const f = frame(p, q);
    for (let j = 0; j < 5; j++)
      if (rand() > 0.15)
        g.block(
          'ragstone',
          '#a59e87',
          f,
          (j * f.l) / 5,
          ((j + 1) * f.l) / 5 - 0.045,
          18.015,
          18.105 + rand() * 0.15,
          -0.23,
          0.23,
        );
  }
}
// Windows are holes in the wall skin. Splayed jambs return to deeply set
// glazing or iron grilles. The back wall only crosses the reveal at its far end.
function band(g, f, y0, y1, openings, col, material = 'ragstone') {
  let cursor = 0;
  for (const o of openings) {
    const { u, w, lo, hi } = o,
      l = u - w / 2,
      r = u + w / 2,
      d = o.depth || 0.43;
    const curve = o.round
      ? archPts(u, w, hi - w * 0.5, w * 0.5, 0, 12)
      : [
          [l, hi],
          [r, hi],
        ];
    g.panel(material, col, f, cursor, l, y0, y1);
    g.panel(material, col, f, l, r, y0, lo);
    g.quad('fine', '#b9ad95', f.point(l, lo), f.point(r, lo), f.point(r, lo, -d), f.point(l, lo, -d));
    for (const x of [l, r])
      g.quad(
        'ragstone',
        '#948b78',
        f.point(x, lo),
        f.point(x, curve[0][1]),
        f.point(x, curve[0][1], -d),
        f.point(x, lo, -d),
      );
    for (let j = 1; j < curve.length; j++) {
      const a = curve[j - 1],
        b = curve[j];
      g.quad(material, col, f.point(...a), f.point(...b), f.point(b[0], y1), f.point(a[0], y1));
      g.quad('fine', '#a89d86', f.point(...a), f.point(...b), f.point(...b, -d), f.point(...a, -d));
      g.quad(
        'glass',
        o.arch ? '#6b6f60' : '#667473',
        f.point(a[0], lo, -d),
        f.point(b[0], lo, -d),
        f.point(...b, -d),
        f.point(...a, -d),
      );
      if (o.round)
        g.bar('fine', j % 3 ? mortar : '#baaa91', f.point(...a, 0.033), f.point(...b, 0.033), 0.117, 5);
    }
    g.block('fine', mortar, f, l - 0.12, r + 0.12, lo - 0.105, lo + 0.04, -0.2, 0.15);
    if (!o.round) g.block('fine', '#c2b69f', f, l - 0.13, r + 0.13, hi, hi + 0.18, -0.12, 0.085);
    for (const x of [l, r]) g.block('fine', '#bfb099', f, x - 0.07, x + 0.07, lo, curve[0][1], -0.125, 0.065);
    const n = o.bars ?? 3;
    for (let k = 1; k <= n; k++) {
      const x = l + (w * k) / (n + 1),
        cap = o.round ? hi - w * 0.5 + Math.sqrt(Math.max(0, w * w * 0.25 - (x - u) ** 2)) : hi;
      g.bar(
        o.mullion ? 'fine' : 'ink',
        o.mullion ? '#afa58e' : iron,
        f.point(x, lo, -d * 0.52),
        f.point(x, cap, -d * 0.52),
        o.mullion ? 0.064 : 0.023,
        5,
      );
    }
    if (w > 0.7)
      g.bar(
        'ink',
        iron,
        f.point(l, lo + (hi - lo) * 0.56, -d * 0.56),
        f.point(r, lo + (hi - lo) * 0.56, -d * 0.56),
        0.027,
        5,
      );
    cursor = r;
  }
  g.panel(material, col, f, cursor, f.l, y0, y1);
}
function stGeorge(g, ring) {
  const core = [ring[0], ring[1], [-1168.81, 36.25], ring.at(-1)];
  const center = core.reduce((v, p) => v.map((n, i) => n + p[i] / 4), [0, 0]);
  const inset = (t) => core.map((p) => mix(p, center, t));
  const levels = [0, 7.5, 14.6, 20.8, 24.4],
    contractions = [0, 0.031, 0.063, 0.095];
  for (let k = 0; k < 4; k++) {
    const rr = inset(contractions[k]),
      fs = faces(rr);
    for (const [i, f] of fs.entries()) {
      const lo = levels[k],
        hi = levels[k + 1];
      const openings =
        k === 3
          ? [0.24, 0.73].map((u) => ({
              u: f.l * u,
              w: 0.55,
              lo: 21.55,
              hi: 23.3,
              bars: 0,
              round: true,
              depth: 0.77,
            }))
          : k === 0 && i === 2
            ? [{ u: f.l * 0.52, w: 1.83, lo: 0.18, hi: 4.05, round: true, bars: 0, depth: 1.02 }]
            : [
                {
                  u: f.l * (i % 2 ? 0.5 : 0.55),
                  w: k === 1 ? 1.16 : 0.68,
                  lo: lo + (k === 0 ? 2.1 : 1.5),
                  hi: lo + (k === 0 ? 3.32 : 3.1),
                  bars: k === 1 ? 2 : 0,
                  mullion: true,
                  depth: 0.64,
                },
              ];
      band(g, f, lo, hi, openings, k % 2 ? '#ada28d' : '#aea28c');
      for (let row = 0; row < (hi - lo) / 0.48; row++)
        for (const u of [0, f.l]) {
          const w = row % 2 ? 0.53 : 0.32,
            yy = lo + row * 0.48;
          g.block(
            'ragstone',
            row % 4 ? '#b0a68f' : '#beb299',
            f,
            Math.max(0, u - w),
            Math.min(f.l, u + w),
            yy,
            Math.min(hi, yy + 0.43),
            -0.025,
            0.041,
          );
        }
      if (k === 3)
        for (const o of openings) {
          g.panel('fine', '#a89f88', f, o.u - 0.22, o.u + 0.22, o.lo + 0.18, o.hi - 0.23, -0.29);
          g.panel('ink', '#484e47', f, o.u - 0.038, o.u + 0.038, o.lo + 0.22, o.hi - 0.32, -0.27);
          g.panel('ink', '#484e47', f, o.u - 0.14, o.u + 0.14, o.lo + 0.63, o.lo + 0.705, -0.262);
        }
      g.block('ragstone', '#b4a995', f, 0, f.l, hi - 0.13, hi + 0.02, -0.23, 0.045);
    }
    if (k < 3) g.cap('ragstone', stone, rr, levels[k + 1], [inset(contractions[k + 1])]);
    else {
      g.cap('roof', '#928f7e', rr, 23.72);
      for (const f of fs) g.block('ragstone', '#b5a993', f, 0, f.l, 23.9, 24.4, -0.43, 0.01);
    }
  }
  const turret = [ring[2], ring[3], ring[4], ring[5], core[2]];
  g.prism('ragstone', '#a79b85', turret, 0.04, 19.98);
  g.cap('lead', '#93968b', turret, 20.02);
  const mast = [center[0] - 0.2, center[1] + 0.3];
  g.frustum('trim', '#c2c3ae', mast, 23.7, 27.2, 0.048, 0.026, 7);
  const flag = new T.Group(),
    flagG = batch();
  // World-positioned fabric is rendered as two folds; colour references a small dark site flag.
  flagG.quad(
    'trim',
    '#536a72',
    atY(mast, 27.12),
    [mast[0] + 0.92, 27.04, mast[1] + 0.17],
    [mast[0] + 0.92, 26.51, mast[1] + 0.17],
    atY(mast, 26.56),
  );
  flagG.quad(
    'trim',
    '#647b81',
    [mast[0] + 0.92, 27.04, mast[1] + 0.17],
    [mast[0] + 1.68, 27.17, mast[1] + 0.04],
    [mast[0] + 1.68, 26.64, mast[1] + 0.04],
    [mast[0] + 0.92, 26.51, mast[1] + 0.17],
  );
  flagG.finish(flag, 'St George flag');
  return flag;
}
function debtors(g, source) {
  const p = source.reduce((v, pt) => v.map((a, i) => a + pt[i] / source.length), [0, 0]);
  const r = 4.78,
    n = 16;
  const ring = Array.from({ length: n }, (_, i) => [
    p[0] + r * Math.cos((tau * i) / n + 0.13),
    p[1] + r * Math.sin((tau * i) / n + 0.13),
  ]);
  const fs = faces(ring),
    ys = [0.05, 4.3, 8.65, 11.55, 14.15];
  for (const [i, f] of fs.entries()) {
    for (let j = 0; j < 4; j++) {
      const lo = ys[j],
        hi = ys[j + 1],
        window =
          i % 2 === 1
            ? [
                {
                  u: f.l * 0.5,
                  w: 0.78,
                  lo: lo + (j > 1 ? 0.82 : 1.19),
                  hi: lo + (j > 1 ? 1.62 : 2.96),
                  bars: 3,
                },
              ]
            : [];
      band(g, f, lo, hi, window, '#b8ac93');
      g.block('fine', '#c9bda4', f, 0, f.l, hi - 0.11, hi + 0.06, -0.15, 0.15);
    }
    if (i % 2 === 0) g.block('ragstone', '#bcb099', f, 0.08, f.l - 0.08, 14.16, 15, -0.4, 0.015);
  }
  g.cap('roof', '#8a8f83', ring, 14.02);
}
function dWing(g, r) {
  g.cap('roof', '#848880', r, 8.93);
  for (const f of faces(r)) {
    const n = f.l > 19 ? 11 : Math.floor(f.l / 2.92),
      bay = f.l / Math.max(n, 1);
    const windows = Array.from({ length: n }, (_, i) => ({
      u: (i + 0.5) * bay,
      w: Math.min(1.45, bay * 0.6),
      lo: 1.03,
      hi: 3.77,
      round: true,
      arch: true,
      bars: 5,
    }));
    band(g, f, 0.02, 4.65, windows, '#b6a991');
    band(
      g,
      f,
      4.65,
      8.98,
      windows.map((o) => ({ ...o, lo: 5.25, hi: 7.47, round: false, bars: 3 })),
      '#b5aa91',
    );
    for (const y of [2.99, 4.65, 6.45, 8.98]) coping(g, f, y, { height: 0.16, width: 0.23, color: mortar });
    if (f.l > 16) downpipe(g, f, f.l - 0.45, 9.11);
  }
}
function prison(g, b) {
  const [id, rr] = b,
    r = rr[0],
    shop = id === 'w928211087',
    main = id === 'w30668671',
    h = shop ? 3.95 : main ? 12.5 : 8.7;
  if (shop) {
    g.prism('glass', '#849895', r, 0.07, h);
    for (const f of faces(r))
      for (let x = 0.12; x < f.l; x += 1.47) g.block('ink', '#58635c', f, x, x + 0.07, 0.13, h, 0.03, 0.12);
    g.cap('lead', '#818880', r, h + 0.04);
    return;
  }
  for (const f of faces(r)) {
    const n = f.l > 3.4 ? Math.max(1, Math.floor(f.l / 3.0)) : 0,
      floors = main ? 3 : 2;
    for (let j = 0; j < floors; j++) {
      const lo = (j * h) / floors,
        hi = ((j + 1) * h) / floors;
      const o = Array.from({ length: n }, (_, i) => ({
        u: ((i + 0.5) * f.l) / n,
        w: Math.min(1.24, (f.l / n) * 0.46),
        lo: lo + 1.31,
        hi: hi - 0.61,
        bars: 4,
        round: j === 0 && f.l > 13 && i % 6 === 2,
        depth: 0.32,
      }));
      band(g, f, lo, hi, o, main ? '#bdb199' : '#b6aa93');
    }
    coping(g, f, h, { color: '#c8bca6' });
    g.block('fine', '#c0b39c', f, 0, f.l, 0.2, 0.54, -0.14, 0.13);
    if (f.l > 12) downpipe(g, f, f.l - 0.44, h);
    if (f.l > 18)
      for (let k = 0; k < Math.floor(f.l / 15); k++) {
        const x = ((k + 0.45) * f.l) / Math.floor(f.l / 15),
          c = f.plan(x, -2.1);
        g.frustum('brick', '#a3896d', c, h + 0.9, h + 4.45, 0.52, 0.48, 4, 0.72);
        g.frustum('fine', '#bcab90', c, h + 4.4, h + 4.59, 0.61, 0.61, 4, 0.72);
        for (const off of [-0.2, 0.2])
          g.frustum('trim', '#967358', f.plan(x + off, -2.1), h + 4.58, h + 5.03, 0.132, 0.161, 7);
      }
  }
  for (const tri of site.wingRoofs[id] || [])
    g.tri('roof', main ? '#798489' : '#888c8d', ...tri.map(([x, z, y]) => [x, h + y, z]));
}
export function buildCastle(scene, data) {
  const group = new T.Group(),
    g = batch();
  group.userData.pocket = 'castle';
  group.name = 'Oxford Castle and former prison';
  scene.add(group);
  earthwork(g);
  for (const rr of section.stream) g.cap('water', '#829c94', rr[0], -1.865, rr.slice(1));
  for (const route of site.walls)
    for (let j = 1; j < route.length; j++) {
      const f = frame(route[j - 1], route[j]);
      g.block('ragstone', '#b2a48c', f, 0, f.l, -0.16, 3.45, -0.26, 0.26);
      g.block('fine', '#c2b498', f, 0, f.l, 3.43, 3.61, -0.34, 0.34);
      for (let x = 0.2; x < f.l; x += 4.65)
        g.block('ragstone', '#ac9e87', f, x - 0.19, x + 0.19, 0, 3.71, -0.36, 0.36);
    }
  for (const rr of site.yard) {
    g.cap('setts', '#c6bca3', rr[0], 0.064, rr.slice(1));
    kerb(g, rr[0], 0.096);
  }
  for (const b of data.buildings.filter((b) => b[3] === 'castle')) {
    const ring = b[1][0];
    if (b[0] === siteId('castleTower')) group.add(stGeorge(g, ring));
    else if (b[0] === siteId('debtors')) debtors(g, ring);
    else if (b[0] === siteId('dWing')) dWing(g, ring);
    else prison(g, b);
  }
  for (const p of [
    [-1158.8, 19.2],
    [-1149.3, 16.5],
  ])
    bench(g, p, -0.28);
  for (const p of [
    [-1143.7, 8.4],
    [-1158.3, 20.1],
    [-1130.5, 9.3],
  ])
    drain(g, p, -0.28);
  g.finish(group, 'Oxford Castle masonry and motte');
  return group;
}
const siteId = (k) => detail.survey[k];
