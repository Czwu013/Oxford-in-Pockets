import { frame, mix, atY } from './geometry.js';

export const palette = {
  limestone: '#d2c2a0',
  honey: '#cfb78f',
  grey: '#c6c0ac',
  light: '#e3d3ad',
  chalk: '#eee0c0',
  shade: '#938874',
  groove: '#7f7768',
  slate: '#788493',
  oldSlate: '#73808a',
  lead: '#88949a',
  sill: '#cabba0',
  wood: '#685745',
  darkWood: '#554b41',
  glass: '#87a0a4',
  ink: '#586469',
};
const C = palette;
export function coping(g, f, y, { width = 0.27, height = 0.19, out = 0.12, color = C.light } = {}) {
  g.block('trim', C.groove, f, 0, f.l, y - 0.12, y + 0.025, -width * 0.35, out * 0.65);
  g.block('stone', color, f, -0.045, f.l + 0.045, y, y + height, -width * 0.65, out + 0.055);
}
export function merlons(g, f, y, count, stepH = 0.66, d = 0.3, col = C.limestone) {
  const spacing = f.l / count;
  for (let i = 0; i < count; i++) {
    const mid = (i + 0.5) * spacing,
      w = spacing * 0.48;
    g.block('stone', col, f, mid - w / 2, mid + w / 2, y, y + stepH, -d, 0);
    g.block(
      'trim',
      C.light,
      f,
      mid - w / 2 - 0.035,
      mid + w / 2 + 0.035,
      y + stepH - 0.075,
      y + stepH + 0.015,
      -d - 0.035,
      0.035,
    );
  }
}
function curve(x, rise, k = 0.46) {
  const t = Math.min(1, Math.abs(x));
  return (rise * Math.sqrt(Math.max(0, 1 - ((t + k) / (1 + k)) ** 2))) / Math.sqrt(1 - (k / (1 + k)) ** 2);
}
export function archPts(mid, width, spring, rise, k = 0.46, n = 12) {
  const arr = [];
  for (let j = 0; j <= n; j++) {
    const u = (2 * j) / n - 1;
    arr.push([mid + width * 0.5 * u, spring + curve(u, rise, k)]);
  }
  return arr;
}
function archFill(g, key, col, f, mid, width, base, spring, rise, d, k = 0.46, n = 12) {
  const path = archPts(mid, width, spring, rise, k, n);
  for (let j = 1; j < path.length; j++) {
    const a = path[j - 1],
      b = path[j];
    g.quad(
      key,
      col,
      f.point(a[0], base, d),
      f.point(b[0], base, d),
      f.point(b[0], b[1], d),
      f.point(a[0], a[1], d),
    );
  }
}
function contour(g, key, col, f, a, b, d) {
  for (let i = 1; i < a.length; i++)
    g.quad(
      key,
      col,
      f.point(...a[i - 1], d),
      f.point(...a[i], d),
      f.point(...b[i], d),
      f.point(...b[i - 1], d),
    );
}
export function lancet(g, f, mid, base, w, h, lights = 3, opt = {}) {
  if (w < 0.3 || h < 0.35) return;
  const d = opt.d || 0,
    tk = opt.frame || Math.min(0.15, w * 0.055),
    rise = opt.rise || Math.min(h * 0.39, w * 0.55),
    sp = base + h - rise;
  const glass = opt.glass || '#91a5a7',
    k = opt.k ?? 0.4,
    n = opt.n || 12;
  const outer = archPts(mid, w, sp, rise, k, n),
    inner = archPts(mid, w - 2 * tk, sp - 0.04, rise - tk, k, n);
  archFill(g, 'ink', opt.shadow || '#545852', f, mid, w, base, sp, rise, d + 0.038, k, n);
  archFill(
    g,
    opt.kind || 'glass',
    glass,
    f,
    mid,
    w - 2.55 * tk,
    base + tk * 1.16,
    sp - 0.07,
    rise - 1.5 * tk,
    d + 0.07,
    k,
    n,
  );
  contour(g, 'trim', opt.trim || C.sill, f, outer, inner, d + 0.17);
  if (w > 2.15) {
    for (let j = 1; j < outer.length; j++) {
      const a = outer[j - 1],
        b = outer[j];
      g.bar(
        'stone',
        C.light,
        f.point(...a, d + 0.178),
        f.point(...b, d + 0.178),
        Math.min(0.1, tk * 0.57),
        5,
      );
    }
  }
  const edge = (x) =>
    g.block('stone', opt.trim || C.sill, f, x - tk * 0.48, x + tk * 0.48, base, sp, -0.012 + d, 0.155 + d);
  edge(mid - w / 2 + tk * 0.5);
  edge(mid + w / 2 - tk * 0.5);
  if (!opt.noSill)
    g.block(
      'stone',
      C.light,
      f,
      mid - w * 0.5 - 0.11,
      mid + w * 0.5 + 0.11,
      base - 0.11,
      base + 0.08,
      d + 0.02,
      d + 0.23,
    );
  const iw = w - 2 * tk * 1.35,
    div = iw / lights,
    inset = mid - iw / 2,
    mul = Math.max(0.043, Math.min(0.17, w * 0.03));
  for (let j = 1; j < lights; j++) {
    const x = inset + j * div,
      t = (x - mid) / (w * 0.5);
    const high = sp + curve(t, rise, k) - tk;
    g.panel('trim', opt.mullion || C.light, f, x - mul * 0.46, x + mul * 0.46, base + 0.06, high, d + 0.17);
  }
  if (lights > 1 && !opt.simple) {
    const miniRise = Math.min(div * 0.65, rise * 0.48),
      spring = sp - 0.06 - miniRise * 0.1;
    for (let j = 0; j < lights; j++) {
      const x = inset + (j + 0.5) * div,
        a = archPts(x, div, spring, miniRise, 0.55, 6),
        b = archPts(x, div - mul, spring, miniRise - mul * 0.45, 0.55, 6);
      contour(g, 'trim', C.light, f, a, b, d + 0.178);
      if (w > 2.6 && !opt.belfry) {
        const head = sp + curve((x - mid) / (w * 0.5), rise, k) - tk * 0.85;
        const lo = sp + miniRise * 0.61,
          hi = Math.max(lo, head - 0.1);
        if (hi > lo + 0.16) {
          g.bar('trim', C.light, f.point(x, lo, d + 0.183), f.point(x, hi, d + 0.183), mul * 0.32, 4);
          for (const s of [-1, 1])
            g.bar(
              'trim',
              C.sill,
              f.point(x, lo, d + 0.18),
              f.point(x + s * div * 0.26, lo + 0.22, d + 0.18),
              mul * 0.32,
              4,
            );
        }
      }
    }
    const levels = opt.belfry ? 2 : h > 4.9 ? 2 : 1;
    for (let j = 1; j <= levels; j++) {
      const y = base + ((sp - base) * j) / (levels + 1);
      g.panel('trim', opt.belfry ? C.sill : '#9b9c8f', f, inset, inset + iw, y - 0.035, y + 0.035, d + 0.14);
    }
  }
  if (opt.belfry) {
    const rows = Math.floor((sp - base) / 0.42);
    for (let j = 0; j < rows; j++) {
      const y = base + 0.25 + j * 0.42;
      g.panel('ink', '#66706b', f, inset, inset + iw, y, y + 0.09, d + 0.135);
    }
  }
}
export function sash(g, f, mid, base, w, h, opt = {}) {
  const d = opt.d || 0,
    t = opt.trim ?? 0.115,
    c = opt.color || C.light;
  g.panel('ink', '#746e60', f, mid - w / 2 - t, mid + w / 2 + t, base - t, base + h + t, d + 0.025);
  g.panel(
    'trim',
    c,
    f,
    mid - w / 2 - t * 0.64,
    mid + w / 2 + t * 0.64,
    base - t * 0.65,
    base + h + t * 0.65,
    d + 0.052,
  );
  g.panel(
    opt.lamp ? 'lamp' : 'glass',
    opt.glass || '#7e9192',
    f,
    mid - w / 2,
    mid + w / 2,
    base,
    base + h,
    d + 0.083,
  );
  const vertical = opt.lights || 2,
    cross = opt.cross ?? 1;
  for (let j = 1; j < vertical; j++) {
    const x = mid - w / 2 + (j * w) / vertical;
    g.panel('trim', opt.frame || '#c0b498', f, x - 0.043, x + 0.043, base, base + h, d + 0.105);
  }
  for (let j = 1; j <= cross; j++) {
    const y = base + (h * j) / (cross + 1);
    g.panel('trim', opt.frame || '#b9b39d', f, mid - w / 2, mid + w / 2, y - 0.033, y + 0.033, d + 0.108);
  }
  if (opt.sill !== false) {
    g.block(
      'stone',
      c,
      f,
      mid - w / 2 - t - 0.04,
      mid + w / 2 + t + 0.04,
      base - 0.14,
      base - 0.035,
      d + 0.01,
      d + 0.2,
    );
  }
  if (opt.hood) {
    g.block(
      'stone',
      c,
      f,
      mid - w / 2 - t - 0.07,
      mid + w / 2 + t + 0.07,
      base + h + 0.05,
      base + h + 0.18,
      d + 0.02,
      d + 0.22,
    );
    for (const s of [-1, 1]) {
      const x = mid + s * (w / 2 + t + 0.025);
      g.block('stone', c, f, x - 0.045, x + 0.045, base + h - 0.13, base + h + 0.105, d + 0.03, d + 0.2);
    }
  }
}

// One physical arch bay. The springing, intrados, spandrel and back of the
// front wall have thickness. The covered walk can be seen at an oblique angle.
export function openBay(g, f, start, end, sill, spring, rise, top, depth, opt = {}) {
  const w = end - start,
    mid = (start + end) / 2,
    pier = opt.pier ?? 0.45;
  const a = start + pier / 2,
    b = end - pier / 2,
    ap = b - a,
    k = opt.round ? 0 : 0.24,
    n = 12,
    t = opt.wall || 0.44,
    d = opt.d || 0;
  const arch = archPts(mid, ap, spring, rise, k, n),
    color = opt.color || C.grey;
  g.block('stone', color, f, start, a, 0, top, d - t, d);
  g.block('stone', color, f, b, end, 0, top, d - t, d);
  if (sill > 0.01) {
    g.block('stone', color, f, a, b, 0, sill, d - t, d);
    g.block('stone', C.sill, f, a - 0.04, b + 0.04, sill - 0.12, sill + 0.045, d - t - 0.08, d + 0.12);
  }
  for (let i = 1; i < arch.length; i++) {
    const A = arch[i - 1],
      B = arch[i];
    for (const off of [d, d - t])
      g.quad(
        'stone',
        color,
        f.point(...A, off),
        f.point(...B, off),
        f.point(B[0], top, off),
        f.point(A[0], top, off),
      );
    g.quad(
      'rubble',
      '#a49c83',
      f.point(...A, d),
      f.point(...B, d),
      f.point(...B, d - t),
      f.point(...A, d - t),
    );
  }
  const out = archPts(mid, ap + 0.28, spring + 0.01, rise + 0.14, k, n);
  contour(g, 'stone', C.light, f, out, arch, d + 0.035);
  if (opt.cloister) {
    for (let j = 1; j < out.length; j++) {
      g.bar('stone', '#d7d0b6', f.point(...out[j - 1], d + 0.075), f.point(...out[j], d + 0.075), 0.066, 5);
    }
    for (const edge of [a, b]) {
      g.block('stone', '#d0c6ae', f, edge - 0.079, edge + 0.079, sill + 0.045, spring, -0.01, d + 0.103);
      g.block(
        'stone',
        C.light,
        f,
        edge - 0.115,
        edge + 0.115,
        spring - 0.1,
        spring + 0.045,
        -0.03,
        d + 0.155,
      );
    }
    if (sill > 0.1) {
      for (const dx of [-0.173, 0.173]) {
        const x = mid + ap * dx,
          to = spring + curve(dx * 2, rise, k) - 0.03;
        g.block('stone', '#c7c3ac', f, x - 0.065, x + 0.065, sill + 0.03, to, d - 0.22, d - 0.045);
        g.block(
          'stone',
          '#d6cfb2',
          f,
          x - 0.094,
          x + 0.094,
          spring - 0.13,
          spring + 0.02,
          d - 0.23,
          d - 0.025,
        );
      }
    }
    const insetArch = archPts(mid, ap - 0.09, spring - 0.02, rise - 0.055, k, n);
    contour(g, 'rubble', '#aba58e', f, arch, insetArch, d - t + 0.02);
  }
  for (const j of [2, 4, 6, 8, 10]) {
    const A = arch[j],
      B = out[j];
    g.bar('trim', '#a99c83', f.point(...A, d + 0.042), f.point(...B, d + 0.042), 0.012);
  }
  // Alternating pale slabs read down into the shaded gallery.
  if (depth > 0) {
    const colors = opt.cloister
      ? ['#c7bfab', '#b7b19e', '#a8a393', '#9e998c']
      : ['#bbad97', '#b2a48c', '#a69b87', '#a09782'];
    for (let i = 0; i < 4; i++) {
      const near = 0.05 + ((depth - 0.05) * i) / 4,
        far = 0.05 + ((depth - 0.05) * (i + 1)) / 4;
      g.quad(
        'fine',
        colors[i],
        f.point(start, 0.13, d - near),
        f.point(end, 0.13, d - near),
        f.point(end, 0.13, d - far),
        f.point(start, 0.13, d - far),
      );
    }
    g.quad(
      'rubble',
      opt.cloister ? '#848779' : '#9b947f',
      f.point(start, top - 0.18, d - t),
      f.point(end, top - 0.18, d - t),
      f.point(end, top - 0.18, d - depth),
      f.point(start, top - 0.18, d - depth),
    );
    if (!opt.noBack) {
      g.panel('rubble', opt.cloister ? '#969687' : '#a49d89', f, start, end, 0.13, top, d - depth);
      g.block('rubble', '#858575', f, start, end, 0.13, 0.3, d - depth, d - depth + 0.07);
    }
    if (opt.cloister && !opt.vault) {
      // Ordinary walks have timber above the openings. The corner by
      // Founder's Tower instead has intersecting carved stone ribs.
      g.block('trim', '#8d8976', f, start + 0.04, start + 0.17, top - 0.34, top - 0.15, d - depth, d - t);
      g.block('trim', '#a09b85', f, start, end, top - 0.31, top - 0.19, d - depth + 0.07, d - depth + 0.22);
    }
    if (opt.vault) {
      const y0 = top - 0.81,
        y1 = top - 0.22;
      for (const opposite of [false, true]) {
        let previous;
        for (let i = 0; i <= 12; i++) {
          const t = i / 12,
            u = start + (end - start) * t,
            dd = d - t * (depth - 0.58) - 0.58;
          const here = f.point(
            u,
            y0 + (y1 - y0) * Math.sin(Math.PI * t),
            opposite ? 2 * d - depth - 0.58 - dd : dd,
          );
          if (previous) g.bar('stone', '#bdb9a2', previous, here, 0.075, 6);
          previous = here;
        }
      }
      g.frustum(
        'stone',
        '#d2c7a9',
        f.plan(mid, d - (depth + 0.58) * 0.5),
        y1 - 0.095,
        y1 + 0.055,
        0.14,
        0.2,
        7,
      );
    }
  }
}
export function buttress(g, f, x, base, h, w = 0.56, reach = 0.8, opt = {}) {
  const sy = [0, h * 0.075, h * 0.43, h * 0.49, h * 0.79, h * 0.84, h],
    dy = [reach, reach, reach * 0.82, reach * 0.64, reach * 0.62, reach * 0.4, reach * 0.3];
  for (let j = 1; j < sy.length; j++) {
    const y0 = base + sy[j - 1],
      y1 = base + sy[j],
      r0 = dy[j - 1],
      r1 = dy[j],
      t = (w * (j >= 5 ? 0.78 : 1)) / 2;
    g.quad(
      'stone',
      opt.color || C.grey,
      f.point(x - t, y0, r0),
      f.point(x + t, y0, r0),
      f.point(x + t, y1, r1),
      f.point(x - t, y1, r1),
    );
    for (const s of [-1, 1])
      g.quad(
        'stone',
        opt.color || C.grey,
        f.point(x + s * t, y0, -0.02),
        f.point(x + s * t, y1, -0.02),
        f.point(x + s * t, y1, r1),
        f.point(x + s * t, y0, r0),
      );
    if (j === 3 || j === 5)
      g.block('stone', C.light, f, x - t - 0.04, x + t + 0.04, y1 - 0.07, y1 + 0.04, -0.03, r1 + 0.09);
  }
  g.block(
    'stone',
    C.light,
    f,
    x - w * 0.45,
    x + w * 0.45,
    base + h - 0.04,
    base + h + 0.08,
    -0.03,
    reach * 0.41,
  );
}
export function pinnacle(g, p, base, h, r, opt = {}) {
  const a = opt.angle || Math.PI * 0.125,
    k = opt.color || C.grey,
    n = opt.sides || 8;
  g.frustum('stone', k, p, base, base + h * 0.19, r * 0.97, r * 0.93, n, a);
  g.frustum('trim', C.light, p, base + h * 0.16, base + h * 0.19, r, r * 0.96, n, a);
  g.frustum('stone', k, p, base + h * 0.19, base + h * 0.28, r * 0.89, r * 0.81, n, a);
  g.frustum('stone', opt.head || C.sill, p, base + h * 0.28, base + h * 0.94, r * 0.84, r * 0.065, n, a);
  for (let j = 0; j < 4; j++) {
    const f = 0.36 + j * 0.117,
      rad = r * (0.84 - ((f - 0.28) / 0.66) * 0.775);
    if (opt.crochets || h > 1.45)
      for (let k = 0; k < 4; k++) {
        const angle = a + (k * Math.PI) / 2 + 0.35,
          off = [p[0] + Math.cos(angle) * rad, p[1] + Math.sin(angle) * rad];
        const end = [p[0] + Math.cos(angle) * (rad + r * 0.15), p[1] + Math.sin(angle) * (rad + r * 0.15)];
        g.bar(
          'stone',
          C.sill,
          atY(off, base + h * (f - 0.025)),
          atY(end, base + h * (f + 0.007)),
          r * 0.105,
          4,
        );
        g.frustum(
          'stone',
          C.light,
          end,
          base + h * (f - 0.006),
          base + h * (f + 0.041),
          r * 0.108,
          r * 0.035,
          4,
          angle,
        );
      }
  }
  g.frustum('trim', C.light, p, base + h * 0.89, base + h * 0.99, r * 0.17, r * 0.07, 6, a);
}
export function statue(g, f, x, y, size, d) {
  const p = f.plan(x, d);
  g.frustum('stone', C.sill, p, y, y + size * 0.11, size * 0.25, size * 0.24, 6);
  g.frustum('stone', '#d2c3a6', p, y + size * 0.11, y + size * 0.7, size * 0.21, size * 0.12, 6);
  g.frustum('stone', '#e0cead', p, y + size * 0.68, y + size * 0.79, size * 0.14, size * 0.16, 6);
  g.frustum('stone', C.light, p, y + size * 0.79, y + size * 0.94, size * 0.13, size * 0.075, 7);
  const point = (u, v, z) => f.point(x + size * u, y + size * v, d + size * z);
  g.bar('stone', C.sill, point(-0.1, 0.7, 0.05), point(-0.2, 0.45, 0.13), size * 0.07, 5);
  g.bar('stone', C.light, point(-0.2, 0.45, 0.13), point(-0.065, 0.52, 0.18), size * 0.055, 5);
  g.bar('stone', C.sill, point(0.12, 0.68, 0.035), point(0.17, 0.43, 0.11), size * 0.055, 5);
  for (const u of [-0.095, 0.04, 0.12])
    g.bar('stone', C.light, point(u * 0.4, 0.53, 0.15), point(u, 0.15, 0.205), size * 0.023, 5);
}
export function pitched(g, framePlan, x0, x1, z0, z1, wall, rise, opt = {}) {
  const span = z1 - z0,
    mid = (z0 + z1) / 2,
    t = opt.hip || 0;
  const p = (x, z, y) => atY(framePlan(x, z), y),
    col = opt.color || C.slate,
    k = opt.key || 'roof';
  const a = p(x0, z0, wall),
    b = p(x1, z0, wall),
    c = p(x1, z1, wall),
    d = p(x0, z1, wall),
    r0 = p(x0 + t, mid, wall + rise),
    r1 = p(x1 - t, mid, wall + rise);
  g.quad(k, col, a, b, r1, r0);
  g.quad(k, col, r0, r1, c, d);
  if (t > 0.05) {
    g.tri(k, col, d, a, r0);
    g.tri(k, col, b, c, r1);
  } else {
    g.tri('stone', opt.gable || C.honey, d, a, r0);
    g.tri('stone', opt.gable || C.honey, b, c, r1);
  }
  g.bar('trim', opt.ridge || '#a0a399', r0, r1, 0.106, 5);
  if (opt.copes)
    for (const [q, r] of [
      [a, r0],
      [d, r0],
      [b, r1],
      [c, r1],
    ])
      g.bar('stone', C.light, q, r, 0.18, 5);
}
