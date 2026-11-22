import { atY, frame, faces, clean, clip, mix, seeded } from './geometry.js';
import { wallWithWindows } from './deep-windows.js';
import {
  palette as C,
  archPts,
  coping,
  merlons,
  lancet,
  sash,
  openBay,
  buttress,
  pinnacle,
  statue,
  pitched,
} from './masonry.js';

// A local grid fixed to the four OSM corners of the Cloister lawn.
// The slight rotation of the High Street range is deliberately separate.
const O = [-4.17, -57.41],
  U = [0.89174, 0.45254];
export const campus = (u, v) => [O[0] + u * U[0] - v * U[1], O[1] + u * U[1] + v * U[0]];
const uv = ([x, z]) => [(x - O[0]) * U[0] + (z - O[1]) * U[1], -(x - O[0]) * U[1] + (z - O[1]) * U[0]];
const localFace = (x, z, u, v, s = 1) => frame(campus(x, z), campus(u, v), s);
function drawSurface(g, poly, height, key, color) {
  for (let i = 1; i < poly.length - 1; i++)
    g.tri(
      key,
      color,
      atY(poly[0], height(poly[0])),
      atY(poly[i], height(poly[i])),
      atY(poly[i + 1], height(poly[i + 1])),
    );
}
function splitAt(parts, fn, k) {
  return parts.flatMap((p) => {
    const values = p.map(fn);
    if (Math.min(...values) >= k - 1e-7 || Math.max(...values) <= k + 1e-7) return [p];
    return [clip(p, fn, k, 1), clip(p, fn, k, -1)].filter((part) => part.length >= 3);
  });
}
function gapFacade(g, f, gates, h, col) {
  const arr = [0, f.l, ...gates.flatMap(([a, b]) => [Math.max(0, a), Math.min(f.l, b)])]
    .filter((v) => v >= 0 && v <= f.l)
    .sort((a, b) => a - b);
  for (let i = 1; i < arr.length; i++) {
    const x0 = arr[i - 1],
      x1 = arr[i],
      w = x1 - x0;
    if (w < 0.02) continue;
    if (gates.some(([a, b]) => (x1 + x0) * 0.5 > a && (x1 + x0) * 0.5 < b)) {
      g.panel('rubble', col, f, x0, x1, 3.25, h);
      continue;
    }
    g.panel('rubble', col, f, x0, x1, 0.01, h);
    if (w > 2.3) {
      const n = Math.max(1, Math.floor(w / 3.3));
      for (let j = 0; j < n; j++) {
        const x = x0 + ((j + 0.5) * w) / n;
        sash(g, f, x, 1.1, Math.min((w / n) * 0.5, 1.3), 1.55, {
          sill: true,
          hood: true,
          glass: '#859396',
          lamp: j % 4 === 1,
        });
        if (h > 6)
          sash(g, f, x, h - 2.49, Math.min((w / n) * 0.47, 1.18), 1.41, {
            glass: '#909b98',
            lamp: j % 5 === 2,
          });
      }
    }
  }
}
function courtFigure(g, f, x, i) {
  const above = 4.42;
  // Small projecting hieroglyphics alternate between broad animal silhouettes
  // and standing figures. These are individual silhouettes, not portrait replicas.
  const p = f.plan(x, 0.62);
  g.frustum('stone', C.sill, p, above - 0.1, above + 0.09, 0.3, 0.32, 5);
  if (i % 3 === 0) {
    statue(g, f, x, above + 0.08, 0.87, 0.62);
    return;
  }
  const side = i % 2 === 0 ? 1 : -1;
  g.frustum('stone', '#beaf93', p, above + 0.05, above + 0.36, 0.23, 0.29, 6);
  g.frustum('stone', C.sill, p, above + 0.36, above + 0.58, 0.3, 0.21, 6);
  const head = f.plan(x + 0.16 * side, 0.7);
  g.frustum('stone', C.light, head, above + 0.43, above + 0.64, 0.19, 0.12, 5);
  const muzzle = f.plan(x + 0.32 * side, 0.77);
  g.frustum('stone', '#c3b69c', muzzle, above + 0.42, above + 0.54, 0.12, 0.075, 6);
  for (const z of [0.62, 0.78]) {
    g.frustum('stone', C.light, f.plan(x + 0.12 * side, z), above + 0.58, above + 0.71, 0.066, 0.018, 5);
    g.bar(
      'stone',
      C.sill,
      f.point(x + 0.13 * side, above + 0.34, z),
      f.point(x + 0.2 * side, above + 0.11, z + 0.09),
      0.068,
      5,
    );
  }
  if (i % 3 === 1) {
    g.tri(
      'stone',
      '#d0c4a5',
      f.point(x - 0.25 * side, above + 0.27, 0.77),
      f.point(x - 0.18 * side, above + 0.74, 0.72),
      f.point(x + 0.04 * side, above + 0.42, 0.79),
    );
  }
  g.bar(
    'stone',
    C.sill,
    f.point(x - 0.16 * side, above + 0.28, 0.66),
    f.point(x - 0.32 * side, above + 0.6, 0.67),
    0.085,
    5,
  );
}
function courtShrub(g, f, x, i) {
  const r = seeded(i * 1361 + Math.round(x * 73) + 777),
    colors = ['#697554', '#788559', '#687a50', '#7e8b60', '#83916b'];
  const low = 0.05;
  for (let l = 0; l < 4; l++) {
    const px = x + (l - 1.5) * 0.39 + (r() - 0.5) * 0.22,
      pd = 0.55 + r() * 0.37,
      radius = 0.38 + r() * 0.28,
      high = 0.44 + r() * 0.25,
      c = f.plan(px, pd);
    let previous = null;
    for (const [j, scale] of [0.68, 1, 0.76, 0.31].entries()) {
      const ring = [];
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 + l * 0.36,
          rr = radius * scale * (0.9 + r() * 0.2);
        ring.push([
          c[0] + rr * Math.cos(a),
          low + high * [0.04, 0.4, 0.78, 0.98][j] + (r() - 0.5) * 0.11,
          c[1] + rr * Math.sin(a),
        ]);
      }
      if (previous)
        for (let k = 0; k < 8; k++) {
          const n = (k + 1) % 8;
          g.quad('trim', colors[Math.floor(r() * colors.length)], previous[k], previous[n], ring[n], ring[k]);
        }
      previous = ring;
    }
    const peak = [c[0], low + high + 0.03, c[1]];
    for (let k = 0; k < 8; k++) g.tri('trim', colors[3], previous[k], previous[(k + 1) % 8], peak);
  }
}
function ivy(g, f, x, seed) {
  const r = seeded(seed),
    col = ['#707954', '#668260', '#788762', '#8a926a'];
  const limb = (u0, y0, dir, n) => {
    let u = u0,
      y = y0;
    for (let j = 0; j < n; j++) {
      const nextU = u + dir * (0.09 + 0.15 * r()) + (r() - 0.5) * 0.09,
        nextY = y + 0.08 + r() * 0.14;
      g.bar('trim', '#787359', f.point(u, y, 0.17), f.point(nextU, nextY, 0.17), 0.018);
      u = nextU;
      y = nextY;
      for (let m = 0; m < 4; m++) {
        const xx = u + (r() - 0.5) * 0.34,
          yy = y + (r() - 0.5) * 0.21,
          s = 0.07 + r() * 0.08,
          d = 0.17 + r() * 0.04;
        g.quad(
          'trim',
          col[Math.floor(r() * 4)],
          f.point(xx - s * 0.6, yy, d),
          f.point(xx + s * 0.25, yy + s * 0.54, d + 0.02),
          f.point(xx + s * 0.75, yy - s * 0.18, d),
          f.point(xx + s * 0.13, yy - s * 0.69, d + 0.015),
        );
      }
    }
  };
  for (let j = 0; j < 6; j++)
    limb(x + (r() - 0.5) * 0.62, 2.94 + r() * 0.42, j % 2 === 0 ? -1 : 1, 5 + Math.round(r() * 5));
}
export function cloister(g, b) {
  const W = 37.13,
    D = 45.1,
    rows = [
      [localFace(0, 0, W, 0, -1), 8, 'north'],
      [localFace(W, 0, W, D, -1), 10, 'east'],
      [localFace(W, D, 0, D, -1), 8, 'south'],
      [localFace(0, D, 0, 0, -1), 10, 'west'],
    ];
  // Allow the real passages to New Building Lawns, Addison's approach and
  // Founder's gate to remain open through the outer masonry.
  const gateTests = (a, b) => {
    if (Math.abs(a[1] + 10.47) < 0.6 && Math.abs(b[1] + 10.47) < 0.6)
      return [
        [6.68, 9.17],
        [36.5, 38.85],
      ].map(([m, n]) => [m, n, 0]);
    if (a[0] > 46 && b[0] > 46) return [[20.0, 22.95]].map(([m, n]) => [m, n, 1]);
    if (a[0] < 0 && b[0] < 0 && Math.abs(a[0] + 3.4) < 1 && Math.abs(b[0] + 3.4) < 1)
      return [[24.6, 29.85, 1]];
    return [];
  };
  for (const f of faces(b.outer)) {
    const a = uv(f.a),
      c = uv(f.b),
      west = a[0] < -7 && c[0] < -7;
    const h = a[1] > 45.5 && c[1] > 45.5 ? 5.62 : 7.58;
    const gates = gateTests(a, c)
      .map(([lo, hi, i]) => {
        const d = c[i] - a[i];
        if (Math.abs(d) < 0.001) return [-2, -1];
        return [((lo - a[i]) * f.l) / d, ((hi - a[i]) * f.l) / d].sort((s, t) => s - t);
      })
      .filter(([l, r]) => r > 0 && l < f.l);
    gapFacade(g, f, gates, h, west ? '#c2b99e' : '#d5c4a4');
    coping(g, f, h - 0.12, { out: 0.14 });
    if (h > 7.1) merlons(g, f, h, Math.max(1, Math.round(f.l / 1.36)), 0.55, 0.25, '#cbbda0');
  }
  for (const [f, n, side] of rows) {
    const step = f.l / n,
      south = side === 'south',
      top = south ? 4.18 : 7.55,
      depth = side === 'east' ? 3.62 : 3.35;
    for (let i = 0; i < n; i++) {
      const x0 = step * i,
        x1 = step * (i + 1),
        x = step * (i + 0.5);
      const entry =
        (side === 'west' && i === 3) ||
        (side === 'east' && i === 4) ||
        (side === 'north' && (i === 1 || i === 7));
      openBay(g, f, x0, x1, entry ? 0 : 0.83, 2.22, 0.86, 3.86, depth, {
        pier: 0.65,
        color: i % 3 === 0 ? '#cac8b5' : '#d4cfba',
        noBack: entry,
        wall: 0.55,
        cloister: true,
        vault: side === 'west' && i === 3,
        floor: '#aea999',
      });
      if (!entry) {
        if (i % 3 === 0)
          lancet(g, f, x, 0.15, 1.18, 2.18, 1, {
            d: 0.03 - depth,
            kind: 'trim',
            glass: '#72684f',
            noSill: true,
            rise: 0.4,
          });
        else sash(g, f, x, 1.16, 1.05, 1.18, { d: 0.03 - depth, lights: 2, sill: false, lamp: i % 4 === 2 });
      }
      buttress(g, f, x0 + 0.02, 0, 4.47, 0.58, 0.72, { color: '#c5b99e' });
      courtFigure(g, f, x0 + 0.02, i);
      if (!south) {
        g.panel('rubble', i % 3 === 0 ? '#d7d4c0' : '#dad5c1', f, x0, x1, 3.75, top);
        for (const [j, dx] of [-0.23, 0.23].entries()) {
          const paired = (i + j * 2) % 4 === 0;
          sash(g, f, x + step * dx, 5.05, paired ? 1.19 : 0.72, 1.32, {
            lights: paired ? 2 : 1,
            glass: i % 2 === 0 ? '#939e9c' : '#7c908f',
            lamp: i + dx > 5 && dx < 0,
            hood: true,
            trim: 0.11,
          });
        }
        g.block('stone', C.light, f, x0, x1, 4.24, 4.39, -0.13, 0.16);
        g.block('stone', C.sill, f, x0 - 0.14, x0 + 0.14, 4.45, top, -0.06, 0.19);
      } else if (i % 2 === 0) {
        pinnacle(g, f.plan(x0, 0.12), 4.3, 1.57, 0.25);
      }
      // Relatively low planted border visible in the college's 2015 tower photograph.
      if (!entry && i % 3 !== 0) {
        courtShrub(g, f, x, i);
      }
      if (
        !south &&
        ((side === 'north' && i === 6) || (side === 'west' && i === 4) || (side === 'east' && i === 7))
      )
        ivy(g, f, x + step * 0.27, 200 + i);
    }
    coping(g, f, top - 0.07, { width: 0.42, height: 0.18, out: 0.25 });
    merlons(g, f, top + 0.11, n * 4, south ? 0.35 : 0.54, 0.27, '#c9bea5');
  }
  for (const [x, z, dx, dz] of [
    [0, 0, -3.35, -3.35],
    [W, 0, 3.62, -3.35],
    [W, D, 3.62, 3.35],
    [0, D, -3.35, 3.35],
  ]) {
    const corner = [campus(x, z), campus(x + dx, z), campus(x + dx, z + dz), campus(x, z + dz)];
    g.cap('fine', '#aea999', corner, 0.13);
    g.cap('rubble', '#96968a', corner, 3.68);
  }
  const metric = (p) => {
    const [x, z] = uv(p);
    return [-z, x - W, z - D, -x];
  };
  const height = (p) => {
    const ds = metric(p);
    if (ds[2] > 0 && ds[1] < 0.1 && ds[3] < 0.1) return 4.28 + ds[2] * 0.31;
    const d = Math.max(ds[0], ds[1], ds[3], 0);
    return 7.55 + Math.max(0, 1 - Math.abs(d - 5.18) / 5.18) * 4.1;
  };
  // Break the OSM roof triangulation at ridges, hips and the attached south gallery.
  for (const tri of g.planTriangles(b.outer, b.holes || [])) {
    let parts = [tri];
    for (const i of [0, 1, 3]) parts = splitAt(parts, (p) => metric(p)[i], 5.18);
    for (const [i, j] of [
      [0, 1],
      [0, 3],
    ])
      parts = splitAt(parts, (p) => metric(p)[i] - metric(p)[j], 0);
    for (const i of [1, 2, 3]) parts = splitAt(parts, (p) => metric(p)[i], 0);
    for (const p of parts) drawSurface(g, p, height, 'roof', '#778189');
  }
  for (const f of [
    localFace(-5.18, -5.18, W + 5.18, -5.18),
    localFace(W + 5.18, -5.18, W + 5.18, D + 2.7),
    localFace(-5.18, -5.18, -5.18, D - 4),
  ]) {
    g.bar('trim', '#9a9a8f', f.point(0, 11.63), f.point(f.l, 11.63), 0.11, 5);
  }
  for (let i = 0; i < 5; i++) {
    const u = -6 + i * 10.3,
      p = campus(u, -6.8);
    g.frustum('stone', C.grey, p, 10.3, 12.28, 0.35, 0.31, 4, 0.35);
    g.frustum('trim', C.sill, p, 12.2, 12.5, 0.39, 0.38, 4, 0.35);
  }
}
function rhythm(g, f, n, base, w, h, opt = {}) {
  const step = f.l / n;
  if (opt.cut) {
    const apertures = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * step,
      y: base,
      w: Math.min(w, step * 0.73),
      h,
      rise: opt.rise || 1.58,
      lights: opt.lights || 4,
      depth: 0.66,
      seed: opt.seed + i,
    }));
    wallWithWindows(g, f, 0.02, opt.wall, apertures, opt.col || '#d0bea1');
  }
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * step;
    if (!opt.cut)
      lancet(g, f, x, base, Math.min(w, step * 0.73), h, opt.lights || 4, {
        glass: opt.glass || '#8b9fa8',
        rise: opt.rise || 1.58,
        frame: 0.2,
        d: opt.d || 0.02,
      });
    if (i > 0) {
      buttress(g, f, i * step, 0.04, opt.height || 13.45, 0.63, 0.84, { color: opt.col || C.limestone });
      if (opt.spire) pinnacle(g, f.plan(i * step, 0.24), opt.height || 13.45, 1.89, 0.25);
    }
  }
}
function chapelWestDoor(g, f, x) {
  g.block('stone', '#c2b08c', f, x - 2.31, x + 2.31, 0.05, 4.65, -0.1, 0.4);
  const mould = (w, spring, rise, d, rad, col) => {
    const profile = archPts(x, w, spring, rise, 0.42, 18);
    for (let j = 1; j < profile.length; j++)
      g.bar('stone', col, f.point(...profile[j - 1], d), f.point(...profile[j], d), rad, 6);
    for (const u of [x - w * 0.5, x + w * 0.5])
      g.bar('stone', col, f.point(u, 0.09, d), f.point(u, spring, d), rad, 6);
  };
  const door = archPts(x, 2.56, 2.15, 0.94, 0.46, 16);
  for (let j = 1; j < door.length; j++) {
    const a = door[j - 1],
      b = door[j];
    g.quad(
      'trim',
      j % 3 ? '#515650' : '#575a51',
      f.point(a[0], 0.1, 0.435),
      f.point(b[0], 0.1, 0.435),
      f.point(...b, 0.435),
      f.point(...a, 0.435),
    );
    g.bar('trim', '#6d7164', f.point(a[0], 0.11, 0.46), f.point(...a, 0.46), 0.018, 5);
    if (j % 2 === 0)
      for (let row = 0; row < 8; row++) {
        const y = 0.24 + row * 0.31;
        if (y + 0.1 < a[1])
          g.block('trim', '#777866', f, a[0] + 0.02, a[0] + 0.048, y, y + 0.04, 0.459, 0.48);
      }
  }
  g.panel('trim', '#424c48', f, x - 0.019, x + 0.019, 0.11, 3.09, 0.48);
  for (const [w, sp, r, d, rad, col] of [
    [2.62, 2.15, 0.97, 0.47, 0.105, '#ad9776'],
    [2.86, 2.14, 1.09, 0.49, 0.099, '#c5af89'],
    [3.12, 2.1, 1.24, 0.53, 0.125, '#cbb38b'],
    [3.73, 2.43, 1.52, 0.61, 0.14, '#e0c8a2'],
  ])
    mould(w, sp, r, d, rad, col);
  for (let j = 0; j < 3; j++) {
    const w = 2.13 - j * 0.114,
      h = 4.29 - j * 0.15,
      d = 0.6 - j * 0.052;
    g.block('stone', ['#d8c29d', '#b3a084', '#d0b694'][j], f, x - w, x + w, h - 0.075, h + 0.04, d - 0.12, d);
    for (const sign of [-1, 1])
      g.block(
        'stone',
        j === 1 ? '#b3a084' : '#d1be9a',
        f,
        x + sign * w - 0.049,
        x + sign * w + 0.049,
        0.11,
        h,
        d - 0.12,
        d,
      );
  }
  for (const sign of [-1, 1]) {
    const u = x + sign * 1.17,
      y = 3.3,
      d = 0.57,
      cols = sign < 0 ? ['#536789', '#9c8053'] : ['#59627f', '#bbb7a2'];
    const points = [
        [u - 0.2, y + 0.18],
        [u + 0.2, y + 0.18],
        [u + 0.17, y - 0.1],
        [u, y - 0.22],
        [u - 0.17, y - 0.1],
      ],
      mid = f.point(u, y, d);
    for (let j = 0; j < 5; j++) {
      const a = points[j],
        b = points[(j + 1) % 5];
      g.tri('trim', cols[0], mid, f.point(...a, d), f.point(...b, d));
      g.bar('trim', cols[1], f.point(...a, d + 0.014), f.point(...b, d + 0.014), 0.018, 5);
    }
    for (const v of [-0.08, 0.08])
      g.bar(
        'trim',
        cols[1],
        f.point(u + v - 0.06, y + 0.11, d + 0.02),
        f.point(u + v + 0.07, y - 0.1, d + 0.02),
        0.023,
        5,
      );
  }
  for (const s of [-1, 1]) {
    g.block('stone', C.light, f, x + s * 1.81 - 0.08, x + s * 1.81 + 0.08, 0.12, 4.45, 0.4, 0.55);
    g.frustum('trim', '#b29b64', f.plan(x + s * 0.3, 0.67), 1.15, 1.29, 0.075, 0.07, 6);
  }
  g.block('stone', C.light, f, x - 2.37, x + 2.37, 4.32, 4.57, 0.2, 0.6);
  for (let i = 0; i < 5; i++) {
    const xx = x + (i - 2) * 0.86;
    lancet(g, f, xx, 4.56, 0.67, 1.23, 1, {
      d: 0.35,
      glass: '#8c826c',
      kind: 'trim',
      noSill: true,
      rise: 0.28,
      frame: 0.07,
    });
    statue(g, f, xx, 4.58, 0.93, 0.55);
    pinnacle(g, f.plan(xx, 0.45), 5.57, 0.41, 0.15);
    for (const sign of [-1, 1])
      g.bar(
        'stone',
        C.light,
        f.point(xx + sign * 0.285, 4.59, 0.57),
        f.point(xx + sign * 0.285, 5.61, 0.57),
        0.044,
        6,
      );
    if (i === 4) continue;
    const u = xx + 0.43,
      y = 4.98;
    for (let j = 0; j < 20; j++) {
      const a = (j * Math.PI) / 10,
        b = ((j + 1) * Math.PI) / 10;
      const petal = (t) => 0.186 + 0.039 * Math.cos(4 * t);
      g.bar(
        'stone',
        C.light,
        f.point(u + Math.cos(a) * petal(a), y + Math.sin(a) * petal(a), 0.594),
        f.point(u + Math.cos(b) * petal(b), y + Math.sin(b) * petal(b), 0.594),
        0.037,
        5,
      );
    }
    g.frustum('stone', C.sill, f.plan(u, 0.61), y - 0.054, y + 0.07, 0.07, 0.048, 6);
  }
}
export function chapel(g, b) {
  const tint = '#d0bea1',
    wall = 14.45,
    ring = clean(b.outer);
  const wallFaces = faces(ring);
  const west = [...wallFaces].sort((a, b) => b.l - a.l).find((f) => uv(f.plan(f.l * 0.5))[0] < -12);
  for (const f of wallFaces) {
    const [u, v] = uv(f.plan(f.l * 0.5));
    const transverse = Math.abs(f.ux * U[0] + f.uz * U[1]) > 0.82;
    const choirFlank = u > -2.6 && u < 19 && (Math.abs(v - 48.8) < 0.36 || Math.abs(v - 59.8) < 0.35);
    const southTransept = u > -15 && u < -1.4 && Math.abs(v - 66.0) < 0.67;
    if (f !== west && !(transverse && (choirFlank || southTransept)))
      g.panel('stone', tint, f, 0, f.l, 0.02, wall);
    coping(g, f, wall - 0.08, { width: 0.52, height: 0.22, out: 0.2 });
    if (f.l > 4) merlons(g, f, wall + 0.16, Math.max(3, Math.round(f.l / 1.23)), 0.52, 0.34, tint);
  }
  if (west) {
    const x = west.l * 0.51;
    wallWithWindows(
      g,
      west,
      0.02,
      wall,
      [
        { x, y: 5.82, w: 7.25, h: 7.53, rise: 2.18, lights: 7, depth: 0.76, seed: 1 },
        ...[-1, 1].map((dir, i) => ({
          x: x + dir * 6.56,
          y: 4.92,
          w: 2.12,
          h: 6.99,
          rise: 1.2,
          lights: 2,
          depth: 0.61,
          seed: i,
        })),
      ],
      tint,
    );
    chapelWestDoor(g, west, x);
    for (const dir of [-1, 1]) {
      buttress(g, west, x + dir * 5.12, 0, 14.26, 0.77, 0.97);
    }
  }
  const north = localFace(-2.4, 48.8, 18.64, 48.8),
    south = localFace(18.9, 59.9, -1.61, 59.74);
  const cutWall = { height: 14.32, spire: true, cut: true, wall };
  rhythm(g, north, 4, 6.48, 3.72, 6.78, { ...cutWall, seed: 0 });
  rhythm(g, south, 4, 4.52, 3.72, 8.72, { ...cutWall, seed: 1 });
  const southCross = localFace(-1.8, 66.42, -14.9, 65.88);
  rhythm(g, southCross, 2, 4.38, 4.08, 8.8, { ...cutWall, seed: 2 });
  for (const c of [
    [-14.67, 43.3],
    [-2.46, 43.22],
    [-1.77, 66.42],
    [-15.42, 65.52],
  ])
    pinnacle(g, campus(...c), 14.48, 2.26, 0.35, { crochets: true });
  // The two ridges intersect over the antechapel. Split the measured footprint
  // on the valley lines as well, so both roof pitches terminate on the same edge.
  const ante = (p) => 2.76 * Math.max(0, 1 - Math.abs(uv(p)[0] + 8.72) / 6.56);
  const choir = (p) => 2.64 * Math.max(0, 1 - Math.abs(uv(p)[1] - 54.35) / 5.56);
  const roofHeight = (p) => wall + 0.15 + Math.max(ante(p), uv(p)[0] < -8.72 ? 0 : choir(p));
  // At the three gable ends the pitched roof rises above the battlement.
  // Return solid masonry to that raking edge, including the Hall junction.
  for (const f of wallFaces) {
    const segments = Math.max(1, Math.ceil(f.l / 0.72));
    for (let i = 0; i < segments; i++) {
      const a = (i * f.l) / segments,
        b = ((i + 1) * f.l) / segments,
        ya = roofHeight(f.plan(a)),
        yb = roofHeight(f.plan(b));
      g.quad('stone', tint, f.point(a, wall - 0.01), f.point(b, wall - 0.01), f.point(b, yb), f.point(a, ya));
      if (ya > wall + 0.72 || yb > wall + 0.72)
        g.bar('stone', C.sill, f.point(a, ya + 0.014, 0.012), f.point(b, yb + 0.014, 0.012), 0.07, 5);
    }
  }
  for (const tri of g.planTriangles(ring)) {
    let parts = [tri];
    for (const u of [-15.28, -8.72, -2.16]) parts = splitAt(parts, (p) => uv(p)[0], u);
    for (const v of [48.79, 54.35, 59.91]) parts = splitAt(parts, (p) => uv(p)[1], v);
    for (const patch of parts) {
      const centerU = patch.reduce((sum, p) => sum + uv(p)[0], 0) / patch.length;
      if (centerU < -8.72) {
        drawSurface(g, patch, (p) => wall + 0.15 + ante(p), 'roof', '#778591');
        continue;
      }
      for (const piece of splitAt([patch], (p) => ante(p) - choir(p), 0)) {
        const mid = piece.reduce((sum, p) => sum + ante(p) - choir(p), 0) / piece.length;
        drawSurface(
          g,
          piece,
          (p) => wall + 0.15 + Math.max(ante(p), choir(p)),
          'roof',
          mid > 0 ? '#788692' : '#7e8996',
        );
      }
    }
  }
  const junction = -8.72 + 6.56 * (1 - 2.64 / 2.76);
  for (const v of [48.79, 59.91]) {
    const a = atY(campus(-2.16, v), 14.67),
      b = atY(campus(junction, 54.35), 17.28);
    g.bar('lead', '#8d9b9f', a, b, 0.1, 6);
  }
  g.bar('trim', '#afb0a0', atY(campus(-8.72, 43.22), 17.34), atY(campus(-8.72, 66.18), 17.34), 0.12, 5);
  g.bar('trim', '#a5a69c', atY(campus(junction, 54.35), 17.27), atY(campus(18.74, 54.35), 17.27), 0.11, 5);
}
export function hall(g, b) {
  const ring = clean(b.outer),
    h = 13.36;
  g.prism('stone', '#ccbea4', ring, 0.02, h);
  const north = localFace(18.62, 48.84, 47.47, 49.04),
    south = localFace(47.3, 60.3, 18.82, 60.03);
  for (const f of [north, south]) {
    rhythm(g, f, 5, 5.37, 3.34, 6.88, {
      height: 13.32,
      lights: 3,
      glass: '#8f9f9d',
      rise: 1.46,
      spire: true,
    });
    coping(g, f, h, { width: 0.49, out: 0.2 });
    merlons(g, f, h + 0.17, 22, 0.46, 0.32, C.grey);
  }
  pitched(g, campus, 18.63, 47.4, 48.99, 60.13, h - 0.05, 3.15, { copes: true, color: '#77818a' });
  const end = localFace(47.55, 49.1, 47.32, 60.2);
  lancet(g, end, end.l * 0.5, 6.0, 4.85, 6.2, 5, { glass: '#8a9ba3', rise: 1.7 });
}
