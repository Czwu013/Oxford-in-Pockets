import { faces, frame } from './magdalen/architecture/geometry.js';
import { archPts, statue, pinnacle, openBay, lancet, coping } from './magdalen/architecture/masonry.js';
import { wallWithWindows } from './magdalen/architecture/deep-windows.js';
import { kerb, lantern, downpipe, drain } from './street-craft.js';
import detail from './data/districts.json';
import quad from './data/quad.json';
import { inside } from './magdalen/ground.js';

// A pierced, squared Tudor light has a recessed foiled head inside the
// rectangular hood. The same stone profile continues around the return.
export function collegiateWall(g, f, h, col, quad) {
  const n = Math.max(1, Math.floor(f.l / (quad ? 5.38 : 4.65))),
    step = f.l / n;
  const shade = '#c9baa0',
    chalk = '#dbceb5';
  for (const [floor, lo, hi, sill, winH] of [
    [0, 0, h * 0.51, 1.48, 2.68],
    [1, h * 0.51, h, h * 0.58, 2.65],
  ]) {
    let last = 0;
    for (let j = 0; j < n; j++) {
      const mid = (j + 0.5) * step,
        w = Math.min(quad ? 2.05 : 1.62, step * 0.5),
        a = mid - w / 2,
        b = mid + w / 2,
        top = Math.min(sill + winH, hi - 0.45),
        back = -0.31;
      g.panel('stone', col, f, last, a, lo, hi);
      g.panel('stone', col, f, a, b, lo, sill);
      g.panel('stone', col, f, a, b, top, hi);
      g.panel('glass', floor ? '#849797' : '#718782', f, a, b, sill, top, back);
      for (const x of [a, b]) {
        g.quad(
          'fine',
          shade,
          f.point(x, sill),
          f.point(x, top),
          f.point(x, top, back),
          f.point(x, sill, back),
        );
        g.block('fine', chalk, f, x - 0.071, x + 0.071, sill, top, -0.11, 0.047);
      }
      for (const y of [sill, top])
        g.quad('fine', shade, f.point(a, y), f.point(b, y), f.point(b, y, back), f.point(a, y, back));
      g.block('fine', chalk, f, a - 0.15, b + 0.15, sill - 0.115, sill + 0.045, -0.11, 0.16);
      g.block('fine', chalk, f, a - 0.19, b + 0.19, top, top + 0.12, -0.11, 0.16);
      for (const x of [a - 0.15, b + 0.15])
        g.block('fine', shade, f, x - 0.05, x + 0.05, top - 0.26, top + 0.095, -0.015, 0.135);
      const lights = quad ? 3 : 2;
      for (let k = 0; k < lights; k++) {
        const m = a + (w * (k + 0.5)) / lights,
          span = w / lights;
        if (k)
          g.block('fine', chalk, f, m - span * 0.5 - 0.041, m - span * 0.5 + 0.041, sill, top, -0.24, -0.04);
        const profile = archPts(m, span - 0.07, top - 0.38, 0.32, 0.44, 6);
        for (let z = 1; z < profile.length; z++)
          g.bar('fine', shade, f.point(...profile[z - 1], -0.11), f.point(...profile[z], -0.11), 0.037, 5);
      }
      g.block(
        'fine',
        shade,
        f,
        a,
        b,
        sill + (top - sill) * 0.61,
        sill + (top - sill) * 0.61 + 0.059,
        -0.22,
        -0.1,
      );
      last = b;
    }
    g.panel('stone', col, f, last, f.l, lo, hi);
  }
  if (f.l > 12) downpipe(g, f, 0.4, h);
  if (quad && f.l > 12)
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * step;
      const arr = archPts(x, step - 0.36, 3.29, 1.86, 0.33, 12);
      for (let j = 1; j < arr.length; j++) {
        g.bar('fine', '#c8bba1', f.point(...arr[j - 1], 0.2), f.point(...arr[j], 0.2), 0.115, 6);
        g.bar(
          'fine',
          '#e0cfad',
          f.point(arr[j - 1][0], arr[j - 1][1] + 0.14, 0.25),
          f.point(arr[j][0], arr[j][1] + 0.14, 0.25),
          0.055,
          5,
        );
      }
      g.block('fine', '#c7b89e', f, i * step + 0.08, i * step + 0.32, 0.03, 3.37, -0.08, 0.34);
      g.block('fine', chalk, f, i * step + 0.02, i * step + 0.4, 3.17, 3.36, -0.1, 0.41);
    }
}
export function hallWall(g, f, h, col) {
  const n = Math.max(1, Math.floor(f.l / 6.32)),
    w = Math.min((f.l / n) * 0.57, 3.6);
  const holes = Array.from({ length: n }, (_, i) => ({
    x: ((i + 0.5) * f.l) / n,
    w,
    y: 3.4,
    h: Math.min(h - 4.6, 8.8),
    rise: w * 0.62,
    depth: 0.6,
    lights: w > 2 ? 4 : 2,
    seed: i + 1,
  }));
  wallWithWindows(g, f, 0.02, h, holes, col);
}
export function churchTop(g, rr) {
  for (const f of faces(rr)) {
    for (const u of [f.l * 0.14, f.l * 0.86]) {
      g.block('fine', '#caba9b', f, u - 0.39, u + 0.39, 21.2, 23.28, 0.05, 0.55);
      statue(g, f, u, 21.4, 1.54, 0.62);
      g.frustum('fine', '#deceb1', f.plan(u, 0.52), 22.97, 24.42, 0.51, 0.055, 5, 0.48);
    }
    const half = f.l * 0.5;
    for (const sign of [-1, 1]) {
      const foot = f.point(half + sign * f.l * 0.45, 24.18, 0.03),
        tip = f.point(half + sign * f.l * 0.72, 28.48, -2.5);
      g.bar('stone', '#cabd9e', foot, tip, 0.18, 5);
    }
  }
}
export function squareFloor(g, p) {
  for (const rr of detail.square) {
    g.cap('setts', '#b5a99a', rr[0], 0.013, rr.slice(1));
  }
  const outer = Array.from({ length: 91 }, (_, i) => [
    p[0] + 20.32 * Math.cos((i * Math.PI) / 45),
    p[1] + 20.32 * Math.sin((i * Math.PI) / 45),
  ]);
  kerb(g, outer, 0.118);
  for (const point of [
    [-547.6, -153.2],
    [-501.8, -192.7],
    [-539.3, -202.9],
  ])
    lantern(g, point, 3.7);
  for (const point of [
    [-538, -152],
    [-502.8, -160.2],
    [-505.3, -190.7],
  ])
    drain(g, point, 0.32);
  for (const [i, a] of [-0.22, -0.13, 1.23, 1.31, 2.71].entries()) {
    const x = p[0] + 20.75 * Math.cos(a),
      z = p[1] + 20.75 * Math.sin(a);
    const f = frame([x, z], [x - Math.sin(a), z + Math.cos(a)]);
    const bike = (u, y, w = 0) => f.point(u, y, w - y * 0.13);
    const paint = ['#647777', '#916954', '#56696b', '#8c8e77', '#666b79'][i];
    for (const u of [-0.54, 0.54]) {
      for (let k = 0; k < 24; k++) {
        const q = (j) =>
          bike(u + 0.345 * Math.cos((j * Math.PI) / 12), 0.38 + 0.345 * Math.sin((j * Math.PI) / 12));
        g.bar('ink', '#50554d', q(k), q(k + 1), 0.022, 6);
        if (k % 2 === 0) g.bar('trim', '#8a938a', bike(u, 0.38), q(k), 0.008, 4);
      }
    }
    const hub = bike(-0.54, 0.38),
      crank = bike(-0.02, 0.33),
      seat = bike(-0.18, 0.86),
      head = bike(0.37, 0.81);
    for (const [a, b] of [
      [hub, seat],
      [seat, crank],
      [hub, crank],
      [seat, head],
      [head, crank],
      [head, bike(0.54, 0.38)],
    ])
      g.bar('trim', paint, a, b, 0.026, 6);
    g.bar('ink', '#58584d', bike(-0.29, 0.9), bike(-0.08, 0.9), 0.05, 6);
    g.bar('trim', '#7a837b', head, bike(0.32, 1.02), 0.022, 5);
    g.bar('ink', '#515b50', bike(0.32, 1.02, -0.21), bike(0.32, 1.02, 0.21), 0.025, 5);
  }
}
export function pondMasonry(g, p) {
  for (let k = 0; k < 60; k++) {
    const a = (k * Math.PI) / 30 + 0.003,
      b = ((k + 1) * Math.PI) / 30 - 0.003;
    const q = (r, t) => [p[0] + r * Math.cos(t), p[1] + r * Math.sin(t)];
    const ring = [q(5.78, a), q(6.18, a), q(6.18, b), q(5.78, b)];
    g.prism('fine', k % 4 === 0 ? '#c5baa4' : '#d6c7ac', ring, 0.39, 0.48);
  }
  for (const point of [
    [-688.1, 196.7],
    [-684.7, 222.5],
    [-616.2, 214.4],
    [-618.4, 143.3],
  ])
    drain(g, point, -0.07);
}
const terraceLevel = 0.79;
const stairs = detail.quadSteps.map((line) => {
  const [p, q] = line,
    far = Math.hypot(p[0] + 649.58, p[1] - 185.03) > Math.hypot(q[0] + 649.58, q[1] - 185.03);
  return far ? frame(q, p) : frame(p, q);
});
export function quadHeight(x, z) {
  if (x < -700 || x > -602 || z < 135 || z > 228) return 0.03;
  for (const f of stairs) {
    const u = (x - f.a[0]) * f.ux + (z - f.a[1]) * f.uz;
    const d = Math.abs((x - f.a[0]) * f.nx + (z - f.a[1]) * f.nz);
    if (d < 1.31 && u >= 0 && u <= f.l) return 0.1 + ((terraceLevel - 0.1) * u) / f.l;
  }
  return detail.terraces.some(([r, ...holes]) => inside(x, z, r) && !holes.some((h) => inside(x, z, h)))
    ? terraceLevel
    : 0.05;
}
export function tomTerrace(g) {
  // The underlying flags are visible between the surveyed grass islands;
  // the surrounding perimeter is a raised walk with separately mapped steps.
  g.cap('flagstone', '#cdbfa6', quad.loop, 0.017);
  for (const rr of detail.terraces) {
    g.prism('stone', '#b7ab94', rr[0], 0.06, terraceLevel - 0.076, rr.slice(1));
    g.cap('flagstone', '#cfc1a9', rr[0], terraceLevel, rr.slice(1));
    for (const ring of rr)
      for (const f of faces(ring)) {
        g.block('fine', '#d8cbb2', f, 0, f.l, terraceLevel - 0.09, terraceLevel + 0.008, -0.13, 0.16);
        if (f.l > 5)
          for (let x = 0.5; x < f.l - 0.3; x += 1.4)
            g.panel('rubble', '#9e9580', f, x, x + 0.022, 0.12, terraceLevel - 0.12, 0.009);
      }
  }
  for (const f of stairs) {
    const count = f.l > 2.1 ? 6 : 4;
    for (let j = 0; j < count; j++) {
      const y = 0.09 + ((terraceLevel - 0.08) * (j + 1)) / count,
        u = (f.l * j) / count;
      g.block('flagstone', j % 3 ? '#c9baa0' : '#d5c6ab', f, u, u + f.l / count, 0.052, y, -1.23, 1.23);
      g.block('fine', '#d6cbb5', f, u - 0.025, u + 0.12, y - 0.032, y + 0.008, -1.25, 1.25);
    }
  }
}
export function squareScreen(g, r) {
  const front = faces(r)
    .filter((f) => f.l > 25)
    .sort((a, b) => a.nx - b.nx)[0];
  const rear = faces(r)
    .filter((f) => f.l > 25)
    .sort((a, b) => b.nx - a.nx)[0];
  // Hawksmoor's single arcade opens east into All Souls. The western street
  // wall shields it, with a gated central opening on the Catte Street axis.
  for (const f of [front, rear]) {
    const step = f.l / 7;
    for (let j = 0; j < 7; j++) {
      if (f === rear || j === 3)
        openBay(g, f, j * step, (j + 1) * step, 0.03, 3.25, 1.62, 6.25, 1.13, {
          pier: 0.83,
          wall: 0.6,
          color: '#c9b899',
        });
      else {
        g.block('stone', '#c7b495', f, j * step, (j + 1) * step, 0, 6.25, -0.55, 0.01);
        lancet(g, f, (j + 0.5) * step, 1.59, 1.65, 2.48, 2, { trim: '#d5c6ac', glass: '#83938d' });
      }
      if (f === front && j === 3)
        for (let n = 0; n < 14; n++) {
          const x = step * j + 0.47 + ((step - 0.94) * n) / 13;
          const top = 3.03 + 0.32 * Math.sin((n * Math.PI) / 13);
          g.bar('ink', '#566458', f.point(x, 0.12, -0.45), f.point(x, top, -0.45), 0.032, 5);
        }
    }
    coping(g, f, 5.83);
    coping(g, f, 6.25);
    for (let j = 0; j <= 7; j++) pinnacle(g, f.plan(j * step, -0.12), 6.21, 1.29, 0.29, { color: '#d6c7a8' });
  }
  for (const f of faces(r).filter((f) => f.l < 25)) g.panel('stone', '#cfbea3', f, 0, f.l, 0, 6.23);
  g.cap('roof', '#888c83', r, 6.19);
  const p = front.plan(front.l / 2, -2.8);
  g.frustum('fine', '#d7c7a9', p, 6.2, 7.35, 2.62, 2.05, 8, 0.29);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + 0.29;
    g.frustum(
      'fine',
      '#d4c3a3',
      [p[0] + 1.55 * Math.cos(a), p[1] + 1.55 * Math.sin(a)],
      7.26,
      9.09,
      0.2,
      0.16,
      8,
      a,
    );
  }
  for (const [lo, hi, r0, r1] of [
    [9, 9.4, 1.98, 1.89],
    [9.4, 9.95, 1.86, 1.48],
    [9.95, 10.56, 1.48, 0.74],
    [10.56, 11.18, 0.74, 0.22],
  ])
    g.frustum('lead', '#818e8b', p, lo, hi, r0, r1, 8, 0.29);
  g.frustum('trim', '#a49871', p, 11.13, 11.93, 0.11, 0.017, 8);
}
