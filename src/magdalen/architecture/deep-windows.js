import { archPts, palette as C } from './masonry.js';

// Each window cuts the external wall. Jambs, inner arch, glazing or louvres
// occupy different depths so the openings also read in three-quarter views.
function profile(o, inset = 0) {
  return archPts(o.x, o.w - 2 * inset, o.y + o.h - o.rise, o.rise - inset, 0.46, 16);
}
function strips(g, f, shape, outer, inner, c, key = 'stone') {
  for (let j = 1; j < shape.length; j++) {
    const a = shape[j - 1],
      b = shape[j];
    g.quad(key, c, f.point(...a, outer), f.point(...b, outer), f.point(...b, inner), f.point(...a, inner));
  }
}
function mould(g, f, points, d, r, col) {
  for (let i = 1; i < points.length; i++)
    g.bar('stone', col, f.point(...points[i - 1], d), f.point(...points[i], d), r, 5);
}
function hood(g, f, o) {
  const inset = 0.115,
    facing = o.d ?? 0,
    outer = profile(o, -inset),
    inner = profile(o, 0.035),
    spring = o.y + o.h - o.rise;
  for (let j = 1; j < outer.length; j++) {
    const a = outer[j - 1],
      b = outer[j],
      A = inner[j - 1],
      B = inner[j];
    g.quad(
      'stone',
      j % 3 === 1 ? '#d5c7ad' : '#e2d2b1',
      f.point(...a, facing + 0.09),
      f.point(...b, facing + 0.09),
      f.point(...B, facing + 0.15),
      f.point(...A, facing + 0.15),
    );
  }
  mould(g, f, outer, facing + 0.1, 0.075, C.light);
  mould(g, f, inner, facing + 0.12, 0.061, '#bcaf97');
  for (const sign of [-1, 1]) {
    const x = o.x + (sign * o.w) / 2;
    g.bar('stone', C.light, f.point(x, o.y + 0.12, facing + 0.1), f.point(x, spring, facing + 0.1), 0.085, 6);
    g.block(
      'stone',
      '#bfb297',
      f,
      x - 0.14,
      x + 0.14,
      spring - 0.12,
      spring + 0.05,
      facing - 0.09,
      facing + 0.14,
    );
  }
  g.block(
    'stone',
    C.chalk,
    f,
    o.x - o.w / 2 - 0.13,
    o.x + o.w / 2 + 0.13,
    o.y - 0.12,
    o.y + 0.075,
    facing - 0.12,
    facing + 0.19,
  );
}
function archTop(shape, x) {
  for (let j = 1; j < shape.length; j++)
    if (x <= shape[j][0]) {
      const a = shape[j - 1],
        b = shape[j];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
  return shape.at(-1)[1];
}
function chapelPane(g, f, o, shape, back) {
  const left = o.x - o.w / 2,
    uv = (p) => [(((p[0] - left) / o.w) * o.lights) / 4 + 0.25 * (o.seed % 4), (p[1] - o.y) / o.h];
  for (let j = 1; j < shape.length; j++) {
    const A = shape[j - 1],
      B = shape[j],
      points = [[A[0], o.y], [B[0], o.y], B, A];
    g.mappedQuad(
      'chapel-glass',
      '#b5b3a4',
      points.map((p) => f.point(...p, back)),
      points.map(uv),
    );
  }
}
function shutters(g, f, o, shape, back) {
  const left = o.x - o.w / 2,
    right = o.x + o.w / 2;
  const lower = o.y + o.h * 0.3,
    step = (right - left) / o.lights;
  for (let i = 0; i < o.lights; i++) {
    const a = left + i * step,
      b = a + step,
      c = (a + b) * 0.5;
    g.panel('rubble', '#969384', f, a + 0.044, b - 0.044, o.y + 0.1, lower, back - 0.025);
    for (const q of [-0.17, 0.17]) {
      const x = c + q * step;
      for (let j = 0; j < 4; j++) {
        const y = o.y + 0.28 + (j * (lower - o.y - 0.18)) / 4;
        g.panel('ink', '#505954', f, x - 0.052, x + 0.052, y, y + 0.2, back + 0.006);
      }
    }
  }
  const vanes = Math.max(9, Math.floor((o.y + o.h - lower) / 0.325));
  // Sloping oak boards reveal a strip of dark air above each blade.
  for (let i = 0; i < vanes; i++) {
    const y = lower + 0.08 + (i * (o.y + o.h - lower - 0.16)) / vanes;
    const xs = shape.filter((p) => p[1] >= y + 0.13).map((p) => p[0]);
    if (xs.length < 2) continue;
    const a = Math.max(left + 0.07, Math.min(...xs)),
      b = Math.min(right - 0.07, Math.max(...xs));
    if (b - a < 0.14) continue;
    g.quad(
      'trim',
      i % 4 === 0 ? '#817f72' : '#727970',
      f.point(a, y, back + 0.22),
      f.point(b, y, back + 0.22),
      f.point(b, y + 0.18, back - 0.08),
      f.point(a, y + 0.18, back - 0.08),
    );
    g.panel('ink', '#4c514c', f, a, b, y - 0.055, y, back + 0.22);
  }
}
function tracery(g, f, o, shape, depth) {
  const lo = o.y + 0.06,
    step = (o.w - 0.18) / o.lights,
    start = o.x - (o.w - 0.18) / 2,
    sp = o.y + o.h - o.rise;
  const radius = o.lights === 7 ? 0.082 : Math.min(0.085, step * 0.095);
  for (let i = 1; i < o.lights; i++) {
    const u = start + i * step,
      top = archTop(shape, u) - 0.045;
    g.bar('stone', C.light, f.point(u, lo, depth), f.point(u, top, depth), radius, 6);
  }
  const transom = o.bell ? [0.38, 0.67] : [0.28, 0.59];
  for (const portion of transom) {
    const y = lo + (sp - lo) * portion;
    g.block(
      'stone',
      o.bell ? '#c9c2a9' : '#b3b39f',
      f,
      start,
      start + step * o.lights,
      y - 0.049,
      y + 0.049,
      depth - 0.09,
      depth + 0.065,
    );
  }
  for (let i = 0; i < o.lights; i++) {
    const x = start + (i + 0.5) * step,
      top = archTop(shape, x) - 0.085;
    const peak = Math.min(top - 0.05, sp + Math.min(0.53 * step, o.rise * 0.46)),
      foot = Math.min(peak - 0.15, sp - 0.2);
    const small = archPts(x, step, foot, peak - foot, 0.6, 8);
    mould(g, f, small, depth + 0.012, radius * 0.66, C.light);
    // The upper lights bifurcate; this silhouette is visible against dusk glass.
    if (top - peak > 0.21) {
      g.bar('stone', C.sill, f.point(x, peak, depth), f.point(x, top, depth), radius * 0.54, 5);
      for (const side of [-1, 1]) {
        const ux = x + side * step * 0.25,
          hi = Math.min(archTop(shape, ux) - 0.11, peak + 0.53 * step);
        if (hi - peak > 0.23) {
          const stem = peak + 0.075;
          const path = archPts(ux, step * 0.46, stem, hi - stem, 0.32, 6);
          mould(g, f, path, depth, radius * 0.46, C.sill);
        }
      }
    }
  }
}
export function wallWithWindows(g, f, bottom, top, windows, color, key = 'stone') {
  let cursor = 0;
  for (const o of [...windows].sort((a, b) => a.x - b.x)) {
    const a = o.x - o.w / 2,
      b = o.x + o.w / 2,
      d = o.d || 0,
      back = d - (o.depth || 0.62),
      shape = profile(o);
    g.panel(key, color, f, cursor, a, bottom, top, d);
    g.panel(key, color, f, a, b, bottom, o.y, d);
    for (let j = 1; j < shape.length; j++) {
      const A = shape[j - 1],
        B = shape[j];
      g.quad(key, color, f.point(...A, d), f.point(...B, d), f.point(B[0], top, d), f.point(A[0], top, d));
    }
    const innerShade = o.bell ? '#928b78' : '#a49b83';
    strips(g, f, shape, d, back, innerShade, 'rubble');
    for (const x of [a, b]) {
      g.quad(
        'rubble',
        innerShade,
        f.point(x, o.y, d),
        f.point(x, shape[0][1], d),
        f.point(x, shape[0][1], back),
        f.point(x, o.y, back),
      );
    }
    g.quad(
      'stone',
      C.sill,
      f.point(a, o.y, d),
      f.point(b, o.y, d),
      f.point(b, o.y, back),
      f.point(a, o.y, back),
    );
    if (o.bell) shutters(g, f, o, shape, back);
    else chapelPane(g, f, o, shape, back + 0.018);
    hood(g, f, o);
    tracery(g, f, o, shape, back + 0.24);
    cursor = b;
  }
  g.panel(key, color, f, cursor, f.l, bottom, top);
}
