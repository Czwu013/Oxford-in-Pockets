import { frame, faces, clean, atY, clip, dist, orientedBox, mix } from './geometry.js';
import { palette as C, coping, merlons, lancet, sash, pitched, pinnacle, buttress } from './masonry.js';

function oculus(g, f, x, y, r, blind = false) {
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI) / 9,
      b = ((i + 1) * Math.PI) / 9;
    const p = (ang, rad, d) => f.point(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, d);
    g.tri(
      blind ? 'stone' : 'glass',
      blind ? '#c8c0ad' : '#819193',
      f.point(x, y, 0.07),
      p(a, r, 0.07),
      p(b, r, 0.07),
    );
    g.quad('stone', C.sill, p(a, r, 0.15), p(b, r, 0.15), p(b, r + 0.13, 0.15), p(a, r + 0.13, 0.15));
  }
  if (!blind) {
    g.bar('trim', C.sill, f.point(x, y - r, 0.16), f.point(x, y + r, 0.16), 0.045);
    g.bar('trim', C.sill, f.point(x - r, y, 0.16), f.point(x + r, y, 0.16), 0.046);
  }
}
export function oldKitchen(g, b) {
  const p = clean(b.outer),
    front = frame([23.62, 2.79], [33.74, 11.18]),
    W = front.l,
    depth = 9.24,
    h = 6.32,
    rise = 4.88;
  g.prism('rubble', '#c7beaa', p, 0, h);
  const at = (u, v) => front.plan(v, -u);
  pitched(g, at, 0, depth, 0, W, h, rise, { copes: true, color: '#79828a', gable: '#c9bfa9' });
  // The north gable in the pre-works survey has two blind pointed arches,
  // a paired low opening and an oculus beneath its sloping coping.
  for (const k of [0.29, 0.71])
    lancet(g, front, W * k, 2.0, 2.04, 3.66, 1, {
      kind: 'trim',
      glass: '#a59d88',
      frame: 0.16,
      trim: '#c7bca3',
      noSill: true,
      rise: 1.0,
      d: 0.06,
    });
  lancet(g, front, W * 0.48, 0.91, 1.42, 1.67, 2, { rise: 0.49, d: 0.04 });
  oculus(g, front, W * 0.5, h + 1.37, 0.58, true);
  for (const f of faces(p)) {
    if (f.l < 7 || f.nz < -0.45) continue;
    lancet(g, f, f.l * 0.49, 1.42, 2.65, 3.42, 3, { frame: 0.15, rise: 0.83, glass: '#879395' });
    coping(g, f, h - 0.07, { out: 0.16 });
  }
  for (const z of [2.45, depth - 1.0]) {
    const q = at(z, W * 0.71);
    g.frustum('stone', '#c4b79c', q, h + 2.33, h + 5.38, 0.45, 0.4, 4, 0.32);
    g.frustum('trim', C.light, q, h + 5.27, h + 5.58, 0.54, 0.5, 4, 0.32);
  }
}
export function gothicks(g, b) {
  const box = orientedBox(b.outer),
    h = 4.69,
    W = box.W,
    L = box.L;
  g.prism('stone', '#cec1a4', b.outer, 0.01, h);
  pitched(g, box.at, 0, L, 0, W, h - 0.26, 1.1, { key: 'lead', color: '#8d999e', copes: true });
  for (const f of faces(b.outer)) {
    if (f.l < 2.5) continue;
    coping(g, f, h - 0.1, { out: 0.22 });
    merlons(g, f, h + 0.12, Math.max(3, Math.round(f.l / 0.99)), 0.53, 0.38, C.limestone);
    if (f.l > 8) {
      for (let j = 0; j < 5; j++) {
        const x = ((j + 0.5) * f.l) / 5;
        if (f.nx < 0 && j % 2 === 0)
          lancet(g, f, x, 0.05, 1.05, 2.26, 1, {
            kind: 'trim',
            glass: '#76624d',
            noSill: true,
            rise: 0.55,
          });
        else sash(g, f, x, 1.53, 0.88, 1.42, { lights: 2, hood: true, glass: '#8e9991' });
      }
    }
  }
  const isFront = box.at(0, W / 2)[1] < box.at(L, W / 2)[1],
    u = isFront ? 0 : L;
  const end = frame(box.at(u, 0), box.at(u, W), isFront ? -1 : 1);
  for (const k of [0.04, 0.5, 0.96]) {
    const peak = k === 0.5 ? h + 1.1 : h + 0.24,
      q = end.plan(k * end.l);
    g.frustum('stone', C.grey, q, h - 0.19, peak + 0.31, 0.36, 0.35, 6);
    pinnacle(g, q, peak + 0.23, k === 0.5 ? 2.1 : 1.63, 0.37, { crochets: true });
  }
  oculus(g, end, end.l * 0.5, 3.1, 0.27);
}
function oriel(g, f, mid, base, w, h) {
  const chain = [
    f.plan(mid - w / 2, 0.08),
    f.plan(mid - w / 2 + 0.51, 1.0),
    f.plan(mid + w / 2 - 0.51, 1.0),
    f.plan(mid + w / 2, 0.08),
  ];
  const ctr = f.plan(mid, 0.12);
  for (let i = 1; i < 4; i++) {
    const a = chain[i - 1],
      b = chain[i],
      ff = frame(a, b, Math.sign((b[1] - a[1]) * (a[0] - ctr[0]) - (b[0] - a[0]) * (a[1] - ctr[1])) || 1);
    g.panel('stone', C.grey, ff, 0, ff.l, base, base + h);
    g.tri('stone', C.sill, atY(a, base), atY(b, base), f.point(mid, base - 0.94, 0.09));
    for (const y of [base + 0.28, base + h * 0.5 + 0.14])
      sash(g, ff, ff.l * 0.5, y, ff.l * 0.8, h * 0.42, { lights: i === 2 ? 3 : 1, cross: 1, sill: false });
    coping(g, ff, base + h, { out: 0.2, height: 0.16 });
  }
}
export function riversideRanges(g, b) {
  // One OSM outline contains the south gabled range and the lower maintenance
  // department. Separate at the cross-wall on the college/heritage floor plans.
  const street = frame([-7.33, 32.6], [9.19, 44.09]),
    toUV = (p) => [
      (p[0] - street.a[0]) * street.ux + (p[1] - street.a[1]) * street.uz,
      (p[0] - street.a[0]) * street.nx + (p[1] - street.a[1]) * street.nz,
    ];
  const at = (x, z) => street.plan(x, z),
    xm = (p) => toUV(p)[0],
    zm = (p) => toUV(p)[1];
  const original = clean(b.outer),
    joint = 19.55,
    low = clip(original, zm, joint, -1),
    old = clip(original, zm, joint, 1);
  g.prism('rubble', '#c4b99e', low, 0.02, 4.04);
  g.cap('lead', '#929c9b', low, 4.06);
  for (const f of faces(low)) {
    if (f.l < 4) continue;
    g.block('stone', '#cfc4a8', f, 0, f.l, 4.0, 4.45, -0.33, 0.025);
    coping(g, f, 4.35, { out: 0.1, height: 0.15 });
    merlons(g, f, 4.5, Math.max(3, Math.round(f.l / 1.34)), 0.43, 0.3, C.grey);
    if (f.nx > 0.3 || f.nz > 0.5)
      for (let j = 0; j < Math.max(1, Math.round(f.l / 3.1)); j++) {
        const n = Math.max(1, Math.round(f.l / 3.1));
        sash(g, f, ((j + 0.5) * f.l) / n, 1.34, 0.95, 1.16, { lights: 2, glass: '#909c98', color: C.sill });
      }
  }
  pitched(g, (u, v) => at(v, u), 0.64, 16.24, 0.38, 6.65, 4.18, 2.09, { color: '#808990', copes: true });
  const southGable = frame(at(0.38, 0.64), at(6.65, 0.64), -1);
  oculus(g, southGable, southGable.l * 0.5, 4.92, 0.37, true);
  for (const t of [0, 0.5, 1]) {
    const q = southGable.plan(t * southGable.l),
      y = t === 0.5 ? 6.3 : 4.7;
    pinnacle(g, q, y, 1.43, 0.22, { crochets: true });
  }
  // Simple set-back rail and equipment screens on the flat roof.
  const pen = [at(9.2, 2.3), at(15.8, 2.3), at(15.8, 6.7), at(9.2, 6.7)];
  for (const f of faces(pen)) {
    g.panel('trim', '#7e8179', f, 0, f.l, 4.08, 5.22);
    coping(g, f, 5.19, { out: 0.03, height: 0.05, color: '#a5a69b' });
  }
  const porch = [at(13.0, 15.85), at(18.54, 15.85), at(18.54, 19.55), at(13.0, 19.55)],
    ridge = atY(at(15.78, 18.92), 7.54);
  for (let i = 0; i < porch.length; i++) {
    const a = porch[i],
      bb = porch[(i + 1) % porch.length];
    g.frustum('trim', '#6c7169', a, 4.12, 6.65, 0.12, 0.11, 4, 0.36);
    g.tri('lead', '#8b999b', atY(a, 6.65), atY(bb, 6.65), ridge);
  }
  const hist = '#cfc1a4',
    h = 10.03,
    peak = 4.46,
    span = 20.56,
    step = span / 3,
    zMid = 26.25,
    zHalf = 6.7;
  g.prism('rubble', hist, old, 0.01, h);
  const gx = (p) => {
    const x = xm(p),
      center = step * (Math.min(2, Math.max(0, Math.floor(x / step))) + 0.5);
    return Math.max(0, 1 - Math.abs(x - center) / (step * 0.5));
  };
  const gz = (p) => Math.max(0, 1 - Math.abs(zm(p) - zMid) / zHalf);
  const height = (p) => h + peak * Math.max(gx(p), gz(p));
  const split = (parts, fn, at) =>
    parts.flatMap((r) => [clip(r, fn, at, 1), clip(r, fn, at, -1)]).filter((r) => r.length >= 3);
  for (const tri of g.planTriangles(old)) {
    let parts = [tri];
    for (let j = 1; j < 6; j++) parts = split(parts, xm, (j * step) / 2);
    parts = split(parts, zm, zMid);
    parts = split(parts, (p) => gx(p) - gz(p), 0);
    for (const poly of parts)
      for (let j = 1; j < poly.length - 1; j++)
        g.tri(
          'roof',
          '#737e89',
          atY(poly[0], height(poly[0])),
          atY(poly[j], height(poly[j])),
          atY(poly[j + 1], height(poly[j + 1])),
        );
  }
  for (const f of faces(old)) {
    // Subdivide fascia at gable tips. All new gables remain on the surveyed footprint.
    const n = Math.max(2, Math.ceil(f.l / 0.38));
    for (let j = 0; j < n; j++) {
      const a = f.plan((f.l * j) / n),
        z = f.plan((f.l * (j + 1)) / n),
        ya = height(a),
        yz = height(z);
      g.quad('stone', hist, atY(a, h - 0.02), atY(z, h - 0.02), atY(z, yz), atY(a, ya));
      g.bar('stone', C.sill, atY(a, ya + 0.02), atY(z, yz + 0.02), 0.12, 5);
    }
  }
  const south = frame(at(0, joint), at(span, joint), -1);
  for (let j = 0; j < 3; j++) {
    const x = step * (j + 0.5);
    for (const [k, y] of [4.72, 7.34, 10.55].entries())
      sash(g, south, x, y, k === 2 ? 2.09 : 2.46, k === 2 ? 1.75 : 1.77, {
        lights: k === 2 ? 2 : 3,
        hood: true,
        lamp: j === 1 && k === 1,
        glass: '#82928f',
      });
    if (j < 2) {
      const q = at((j + 1) * step + 0.3, zMid + 0.2);
      g.frustum('stone', C.limestone, q, h + peak - 1.45, h + peak + 2.14, 0.59, 0.53, 4, 0.37);
      g.frustum('stone', C.light, q, h + peak + 1.99, h + peak + 2.43, 0.69, 0.66, 4, 0.37);
    }
  }
  const east = faces(old)
    .filter((f) => f.l > 7)
    .sort((a, b) => b.nx - a.nx)[0];
  if (east) {
    oriel(g, east, east.l * 0.5, 3.68, 4.2, 5.58);
    lancet(g, east, east.l * 0.5, 0.05, 1.46, 2.48, 1, { kind: 'trim', glass: C.darkWood, noSill: true });
  }
}
