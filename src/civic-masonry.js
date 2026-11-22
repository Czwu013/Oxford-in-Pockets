import { atY, faces, frame } from './magdalen/architecture/geometry.js';
import { coping, sash } from './magdalen/architecture/masonry.js';
import { ridgeRoof } from './palette.js';

export const stone = '#d7c5a5',
  cut = '#e4d3b4',
  warm = '#c0a882',
  slate = '#76828b';
export function axes(origin, ux, uz) {
  const length = Math.hypot(ux, uz);
  ux /= length;
  uz /= length;
  const point = (u, v) => [origin[0] + ux * u - uz * v, origin[1] + uz * u + ux * v];
  return {
    point,
    rect: (a, b, c, d) => [point(a, b), point(c, b), point(c, d), point(a, d)],
    face: (a, b, c, d, side = -1) => frame(point(a, b), point(c, d), side),
    local: ([x, z]) => [
      (x - origin[0]) * ux + (z - origin[1]) * uz,
      -(x - origin[0]) * uz + (z - origin[1]) * ux,
    ],
  };
}
export function course(g, f, y, height = 0.16, out = 0.25, tint = cut) {
  g.block('fine', tint, f, -0.04, f.l + 0.04, y, y + height, -0.06, out);
}
export function roofBody(g, shapes, h, rise, wall = stone, roof = slate, finish) {
  for (const rings of shapes) {
    for (const [i, ring] of rings.entries())
      for (const outer of faces(ring)) {
        const f = i ? frame(outer.b, outer.a, Math.sign(outer.nx * outer.uz - outer.nz * outer.ux)) : outer;
        if (finish?.(f, h, i)) continue;
        g.panel('stone', wall, f, 0, f.l, 0, h);
        if (f.l > 2.4) coping(g, f, h - 0.17, { color: cut, height: 0.16, width: 0.21 });
      }
    ridgeRoof(g, rings, h, rise, roof, wall);
  }
}
export function reveal(g, f, mid, lo, w, h, cols = 2, rows = 2, d = 0, tint = cut) {
  const a = mid - w / 2,
    b = mid + w / 2,
    top = lo + h;
  const deep = d - 0.24;
  g.mappedQuad(
    'quarter-pane',
    '#b9c3b6',
    [f.point(a, lo, deep), f.point(b, lo, deep), f.point(b, top, deep), f.point(a, top, deep)],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );
  for (const u of [a, b]) {
    g.block('fine', tint, f, u - 0.105, u + 0.105, lo - 0.05, top + 0.14, deep - 0.02, d + 0.065);
  }
  for (const y of [lo, top])
    g.block('fine', tint, f, a - 0.13, b + 0.13, y - 0.085, y + 0.11, deep - 0.02, d + 0.1);
  for (let i = 1; i < cols; i++) {
    const u = a + (w * i) / cols;
    g.block('trim', tint, f, u - 0.047, u + 0.047, lo, top, deep, d + 0.015);
  }
  for (let i = 1; i < rows; i++) {
    const y = lo + (h * i) / rows;
    g.block('trim', tint, f, a, b, y - 0.04, y + 0.04, deep, d + 0.025);
  }
}
// Construct a genuinely recessed arch. The jambs, soffit and spandrels surround
// the opening; opaque sheets do not cross its mouth.
export function arch(g, f, mid, bottom, w, h, options = {}) {
  const d = options.d ?? 0,
    depth = options.depth ?? 0.54,
    trim = options.trim || cut;
  const radius = w * 0.5,
    rise = options.rise ?? radius * 0.78,
    spring = bottom + h - rise,
    top = bottom + h;
  const back = d - depth;
  const point = (u, y, n) => f.point(mid + u, y, n);
  const curve = (j, r, ry, n) => {
    const a = Math.PI - (j * Math.PI) / 16;
    return point(Math.cos(a) * r, spring + Math.sin(a) * ry, n);
  };
  if (options.door) {
    g.panel('trim', '#655440', f, mid - radius, mid + radius, bottom, top, back);
    for (let j = 0; j < 8; j++) {
      const u = mid - radius + ((j + 0.5) * w) / 8;
      g.panel('ink', '#685946', f, u - 0.013, u + 0.013, bottom, top - 0.12, back + 0.014);
    }
    g.panel('trim', '#c0a173', f, mid - 0.035, mid + 0.035, bottom + 0.15, spring, back + 0.04);
  } else {
    g.panel('sash-glass', '#899c97', f, mid - radius, mid + radius, bottom, top, back);
    for (let j = 1; j < (options.lights || 3); j++) {
      const q = j / (options.lights || 3),
        u = mid - radius + q * w;
      const height = spring + rise * Math.sqrt(1 - (2 * q - 1) ** 2);
      g.block('trim', trim, f, u - 0.065, u + 0.065, bottom, height, back, d - 0.04);
    }
    g.block('trim', trim, f, mid - radius, mid + radius, spring - 0.16, spring - 0.07, back, d - 0.035);
  }
  for (let i = 0; i < 16; i++) {
    const a = curve(i, radius, rise, d),
      b = curve(i + 1, radius, rise, d);
    g.quad('fine', warm, a, b, curve(i + 1, radius, rise, back), curve(i, radius, rise, back));
    g.quad(
      'fine',
      i % 3 === 2 ? '#d1bd9b' : trim,
      a,
      b,
      curve(i + 1, radius + 0.22, rise + 0.23, d + 0.085),
      curve(i, radius + 0.22, rise + 0.23, d + 0.085),
    );
    const upperA = [a[0], top + 0.32, a[2]],
      upperB = [b[0], top + 0.32, b[2]];
    g.quad('stone', options.wall || stone, a, b, upperB, upperA);
  }
  for (const end of [-1, 1]) {
    const u = end * radius;
    g.quad(
      'fine',
      warm,
      point(u, bottom, d),
      point(u, spring, d),
      point(u, spring, back),
      point(u, bottom, back),
    );
    g.block('fine', trim, f, mid + u - 0.105, mid + u + 0.105, bottom, spring, back, d + 0.08);
  }
  g.block(
    'fine',
    trim,
    f,
    mid - radius - 0.14,
    mid + radius + 0.14,
    bottom - 0.1,
    bottom + 0.02,
    back,
    d + 0.14,
  );
}
export function pediment(g, f, mid, w, y, h, tint = cut, d = 0.16) {
  const a = f.point(mid - w / 2, y, d),
    b = f.point(mid + w / 2, y, d),
    c = f.point(mid, y + h, d);
  g.tri('fine', warm, a, b, c);
  for (const [p, q] of [
    [a, c],
    [c, b],
    [b, a],
  ])
    g.bar('fine', tint, p, q, 0.15, 5);
}
export function ionic(g, f, u, d, y, h, r) {
  const p = f.plan(u, d);
  for (const [a, b, ra, rb] of [
    [0, 0.025, 1.39, 1.39],
    [0.024, 0.048, 1.37, 1.14],
    [0.047, 0.069, 1.18, 1.02],
    [0.068, 0.89, 1, 0.82],
    [0.888, 0.908, 0.86, 0.97],
    [0.906, 0.938, 0.93, 1.16],
    [0.935, 0.968, 1.22, 1.18],
  ])
    g.frustum('fine', cut, p, y + a * h, y + b * h, ra * r, rb * r, 22);
  for (let j = 0; j < 20; j++) {
    const a = (2 * Math.PI * j) / 20,
      dx = Math.cos(a),
      dz = Math.sin(a);
    g.bar(
      'fine',
      '#c9b697',
      atY([p[0] + r * dx, p[1] + r * dz], y + h * 0.074),
      atY([p[0] + r * 0.825 * dx, p[1] + r * 0.825 * dz], y + 0.888 * h),
      r * 0.033,
      4,
    );
  }
  for (const s of [-1, 1])
    for (const side of [-1, 1]) {
      let prev;
      for (let k = 0; k < 14; k++) {
        const an = (k / 13) * Math.PI * 2.55,
          rr = r * (0.41 - (0.29 * k) / 13);
        const v = f.point(
          u + s * r * 0.91 + Math.cos(an) * rr,
          y + h * 0.943 + Math.sin(an) * rr,
          d + side * r * 0.85,
        );
        if (prev) g.bar('fine', cut, prev, v, r * 0.12, 5);
        prev = v;
      }
    }
  g.block('fine', cut, f, u - r * 1.41, u + r * 1.41, y + h * 0.968, y + h, d - r * 1.19, d + r * 1.19);
}
export function rows(g, f, h, n, stoneTint = stone, floors = 2) {
  g.panel('stone', stoneTint, f, 0, f.l, 0, h, -0.44);
  const dx = f.l / n;
  for (let j = 0; j < n; j++) {
    const a = j * dx,
      b = a + dx,
      m = (a + b) / 2,
      w = Math.min(dx * 0.55, 3.05);
    for (let i = 0; i < floors; i++) {
      const y = (i * h) / floors,
        end = ((i + 1) * h) / floors,
        lo = y + (end - y) * 0.21,
        top = end - (end - y) * 0.19;
      g.panel('stone', stoneTint, f, a, m - w / 2, y, end);
      g.panel('stone', stoneTint, f, m + w / 2, b, y, end);
      g.panel('stone', stoneTint, f, m - w / 2, m + w / 2, y, lo);
      g.panel('stone', stoneTint, f, m - w / 2, m + w / 2, top, end);
      reveal(g, f, m, lo, w, top - lo, 2, 3);
    }
  }
  course(g, f, h - 0.16);
}
export function gabledBay(g, f, u, y, w, rise) {
  // Curved, stepped Jacobean gables with a central finial.
  const outline = [
    [-0.5, 0],
    [-0.5, 0.12],
    [-0.41, 0.16],
    [-0.39, 0.32],
    [-0.3, 0.34],
    [-0.29, 0.48],
    [-0.16, 0.53],
    [-0.12, 0.75],
    [0, 0.88],
    [0.12, 0.75],
    [0.16, 0.53],
    [0.29, 0.48],
    [0.3, 0.34],
    [0.39, 0.32],
    [0.41, 0.16],
    [0.5, 0.12],
    [0.5, 0],
  ];
  for (let i = 1; i < outline.length; i++) {
    const [a, b] = outline[i - 1],
      [c, d] = outline[i];
    const p = f.point(u + a * w, y + b * rise, 0.05),
      q = f.point(u + c * w, y + d * rise, 0.05);
    g.quad('stone', stone, f.point(u + a * w, y - 0.01, 0.03), f.point(u + c * w, y - 0.01, 0.03), q, p);
    g.bar('fine', cut, p, q, 0.13, 5);
  }
  for (const [off, level] of [
    [-0.4, 0.32],
    [0.4, 0.32],
    [0, 0.9],
  ]) {
    const p = f.plan(u + off * w, 0.04),
      yy = y + level * rise;
    g.frustum('fine', cut, p, yy, yy + 0.42, 0.19, 0.16, 8);
    g.frustum('fine', cut, p, yy + 0.4, yy + 0.95, 0.22, 0.03, 8);
  }
  if (w > 4.5) sash(g, f, u, y + 0.28, w * 0.29, rise * 0.37, { lights: 2, cross: 1 });
}
