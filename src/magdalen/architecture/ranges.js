import { frame, faces, clean, atY, orientedBox, clip, seeded, dist, mix } from './geometry.js';
import {
  palette as C,
  coping,
  merlons,
  lancet,
  sash,
  openBay,
  pinnacle,
  statue,
  pitched,
  buttress,
} from './masonry.js';
import { campus } from './college.js';

function stoneChimney(g, p, roofY, w = 0.83, h = 2.1, angle = 0, stone = C.grey, multiple = true) {
  const f = frame(
    [p[0] - Math.cos(angle) * w * 0.6, p[1] - Math.sin(angle) * w * 0.6],
    [p[0] + Math.cos(angle) * w * 0.6, p[1] + Math.sin(angle) * w * 0.6],
  );
  g.block('stone', stone, f, 0, f.l, roofY - 0.8, roofY + h, -w * 0.43, w * 0.43);
  for (const y of [roofY + h - 0.25, roofY + h + 0.04])
    g.block('trim', C.sill, f, -0.09, f.l + 0.09, y, y + 0.105, -w * 0.52, w * 0.52);
  for (const j of multiple ? [0.24, 0.74] : [0.5]) {
    const q = f.plan(f.l * j);
    g.frustum('trim', '#a48e73', q, roofY + h + 0.16, roofY + h + 0.56, 0.13, 0.125, 7);
    g.frustum('trim', '#c1ad8f', q, roofY + h + 0.49, roofY + h + 0.59, 0.16, 0.16, 7);
  }
}
// The New Building's sashes are recessed rectangles within a dressed
// classical façade. Keep the actual ashlar return visible on either jamb.
function sashTier(g, f, a, b, bottom, top, y, w, h, d, col, lit, glass, pediment = false) {
  const x = (a + b) * 0.5,
    left = x - w * 0.5,
    right = x + w * 0.5,
    back = d - 0.24;
  for (const [u, v, lo, hi] of [
    [a, left, bottom, top],
    [right, b, bottom, top],
    [left, right, bottom, y],
    [left, right, y + h, top],
  ])
    g.panel('fine', col, f, u, v, lo, hi, d);
  for (const u of [left, right])
    g.quad(
      'fine',
      '#b8ad97',
      f.point(u, y, d),
      f.point(u, y + h, d),
      f.point(u, y + h, back),
      f.point(u, y, back),
    );
  for (const v of [y, y + h])
    g.quad(
      'fine',
      '#b9b19c',
      f.point(left, v, d),
      f.point(right, v, d),
      f.point(right, v, back),
      f.point(left, v, back),
    );
  g.panel(lit ? 'lamp' : 'sash-glass', glass, f, left, right, y, y + h, back);
  const wood = '#cac5b3';
  for (const u of [left + 0.03, x, right - 0.03])
    g.block('trim', wood, f, u - 0.031, u + 0.031, y, y + h, back, back + 0.052);
  for (const v of [y + 0.04, y + h * 0.333, y + h * 0.666, y + h - 0.04])
    g.block('trim', wood, f, left, right, v - 0.029, v + 0.029, back, back + 0.05);
  g.block('fine', '#e1d2b8', f, left - 0.14, right + 0.14, y - 0.14, y - 0.025, d - 0.03, d + 0.19);
  if (pediment) {
    g.block('fine', '#ddcdb0', f, left - 0.16, right + 0.16, y + h + 0.055, y + h + 0.17, d - 0.02, d + 0.19);
    for (const u of [left + 0.035, right - 0.035])
      g.block('fine', '#c7b89b', f, u - 0.065, u + 0.065, y + h - 0.13, y + h + 0.07, d, d + 0.13);
  }
}
export function newBuilding(g, b) {
  const x0 = -35.55,
    x1 = 58.35,
    front = -70.91,
    back = -84.54,
    h = 12.65,
    tint = '#d9c7a4';
  const f = frame(campus(x0, front), campus(x1, front), -1),
    backF = frame(campus(x1, back), campus(x0, back), -1);
  const N = 27,
    step = f.l / N;
  // The 2021 site drawing includes a dashed open colonnade in front of the
  // recessed central ground-floor wall traced by OSM.
  for (let j = 0; j < N; j++) {
    const a = j * step,
      x = a + step * 0.5,
      wing = j < 3 || j >= N - 3,
      center = j >= 11 && j <= 15;
    const skin = wing ? '#d5bb91' : center ? '#dfceb0' : tint,
      d = wing ? 0.14 : center ? 0.22 : 0;
    if (wing) {
      sashTier(g, f, a, a + step, 0.02, 4.55, 0.92, 1.25, 2.25, d, skin, false, '#828b87');
    } else {
      openBay(g, f, a, a + step, 0, 2.48, 1.28, 4.48, 2.21, {
        round: true,
        pier: 0.99,
        color: '#dbccb0',
        wall: 0.57,
        d,
      });
      sash(g, f, x, 1.18, 1.12, 1.69, { d: d - 2.18, sill: false, lights: 2, glass: '#7d8884' });
      g.block('fine', C.light, f, a - 0.07, a + 0.51, 2.36, 2.54, d - 0.62, d + 0.12);
      for (const y of [0.36, 0.73, 1.12, 1.5, 1.9]) {
        g.block('fine', '#cbc3a8', f, a + 0.08, a + 0.5, y - 0.035, y + 0.038, d - 0.45, d + 0.055);
        g.block(
          'fine',
          '#cbc3a8',
          f,
          a + step - 0.5,
          a + step - 0.08,
          y - 0.035,
          y + 0.038,
          d - 0.45,
          d + 0.055,
        );
      }
      g.block('fine', '#e7d9bb', f, x - 0.12, x + 0.12, 3.68, 3.98, d - 0.1, d + 0.17);
    }
    sashTier(g, f, a, a + step, 4.43, 8.65, 5.12, 1.34, 2.61, d, skin, j % 5 === 1, '#7d8989', true);
    sashTier(g, f, a, a + step, 8.65, h, 9.22, 1.21, 2.03, d, skin, j % 7 === 3, '#889391');
    if (center || wing) {
      for (const y of [4.46, 8.83])
        g.block('fine', '#e4d1b0', f, a, a + step, y, y + 0.16, d - 0.1, d + 0.17);
    }
    g.panel('fine', '#c9bda5', backF, a, a + step, 0.01, h);
    for (const [i, y] of [0.85, 5.12, 9.22].entries())
      sash(g, backF, x, y, 1.23, i === 1 ? 2.4 : 1.94, {
        cross: 2,
        glass: '#87918c',
        lamp: (j + i) % 8 === 1,
      });
    if ([0, 3, 11, 16, 24, 26].includes(j)) {
      const xx = j === 26 ? a + step - 0.24 : a + 0.16;
      g.block('fine', '#dac8a7', f, xx - 0.22, xx + 0.22, 4.53, h - 0.31, d, d + 0.19);
      for (const [v, w, height] of [
        [4.55, 0.31, 0.18],
        [4.76, 0.26, 0.12],
        [h - 0.57, 0.27, 0.16],
        [h - 0.39, 0.34, 0.16],
      ])
        g.block('fine', '#e2d3b8', f, xx - w, xx + w, v, v + height, d - 0.07, d + 0.25);
    }
  }
  for (const q of [f, backF]) {
    coping(g, q, 4.39, { out: 0.19, height: 0.21, color: '#e6d4b2' });
    coping(g, q, h - 0.35, { out: 0.3, height: 0.14, color: '#c7b695' });
    coping(g, q, h - 0.11, { out: 0.42, height: 0.24, color: '#ead8b7' });
    for (let i = 0; i < 104; i++) {
      const x = ((i + 0.5) * q.l) / 104;
      g.block('fine', '#d8c7a6', q, x - 0.08, x + 0.08, h - 0.35, h - 0.15, -0.03, 0.3);
    }
  }
  for (const q of [
    frame(campus(x0, back), campus(x0, front), -1),
    frame(campus(x1, front), campus(x1, back), -1),
  ]) {
    g.panel('fine', '#d6c29f', q, 0, q.l, 0.03, h);
    for (let j = 0; j < 3; j++)
      for (const [i, y] of [0.87, 5.12, 9.19].entries())
        sash(g, q, ((j + 0.5) * q.l) / 3, y, 1.36, i === 1 ? 2.54 : 1.98, {
          cross: 2,
          hood: i === 1,
          lamp: i === 1 && j === 0,
        });
    coping(g, q, h - 0.11, { out: 0.43, height: 0.26 });
  }
  pitched(g, campus, x0, x1, back, front, h + 0.06, 2.07, { hip: 4.8, key: 'lead', color: '#89969f' });
  for (let j = 0; j < 65; j++) {
    const x = x0 + 5.2 + j * 1.3;
    if (x > x1 - 4.8) break;
    const ridge = atY(campus(x, (back + front) * 0.5), h + 2.16);
    g.bar('trim', '#96a0a0', atY(campus(x, back), h + 0.14), ridge, 0.026);
    g.bar('trim', '#9ca4a0', atY(campus(x, front), h + 0.14), ridge, 0.026);
  }
  const mid = f.l * 0.5,
    left = step * 11 + 0.06,
    right = step * 16 - 0.06,
    bottom = h + 0.05,
    rise = 3.15;
  g.tri(
    'fine',
    '#ddceb0',
    f.point(left, bottom, 0.28),
    f.point(right, bottom, 0.28),
    f.point(mid, bottom + rise, 0.28),
  );
  const a = f.point(left - 0.18, bottom, 0.46),
    c = f.point(mid, bottom + rise + 0.12, 0.46),
    d = f.point(right + 0.18, bottom, 0.46);
  g.bar('stone', C.light, a, c, 0.22, 5);
  g.bar('stone', C.light, c, d, 0.22, 5);
  const foot = bottom + 0.28,
    peak = bottom + rise - 0.34;
  for (const u of [left + 0.86, right - 0.86])
    g.bar('fine', '#c4b89e', f.point(u, foot, 0.31), f.point(mid, peak, 0.31), 0.065, 5);
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12,
      next = ((i + 1) * Math.PI) / 12,
      y = bottom + 1.18;
    g.bar(
      'fine',
      '#c4b99d',
      f.point(mid + 0.52 * Math.cos(angle), y + 0.55 * Math.sin(angle), 0.34),
      f.point(mid + 0.52 * Math.cos(next), y + 0.55 * Math.sin(next), 0.34),
      0.071,
      5,
    );
  }
  g.block('stone', '#e5d4b4', f, left - 0.23, right + 0.23, bottom - 0.17, bottom + 0.04, -0.07, 0.47);
  g.quad('lead', '#909b9d', a, c, f.point(mid, bottom + rise, -2.25), f.point(left, bottom, -2.25));
  g.quad('lead', '#909b9d', c, d, f.point(right, bottom, -2.25), f.point(mid, bottom + rise, -2.25));
  for (let j = 0; j < 10; j++) {
    const x = x0 + 4.2 + j * 9.5;
    stoneChimney(g, campus(x, back + 4.9), h + 1.6, 0.64, 1.22, 0.47, C.grey, j % 3 === 0);
  }
}
function drawCutRoof(g, b, box, wall, rise, hip, key, col, stone) {
  const coords = box.uv,
    mid = box.W / 2,
    measure = (p) => coords(p)[1],
    length = (p) => coords(p)[0];
  const slope = (p) => 1 - Math.abs(measure(p) - mid) / mid;
  const height = (p) =>
    wall +
    rise * Math.max(0, Math.min(1, slope(p), hip ? length(p) / hip : 1, hip ? (box.L - length(p)) / hip : 1));
  for (const tri of g.planTriangles(b.outer, b.holes || [])) {
    let parts = [clip(tri, measure, mid, 1), clip(tri, measure, mid, -1)].filter((p) => p.length > 2);
    if (hip)
      for (const fn of [(p) => slope(p) - length(p) / hip, (p) => slope(p) - (box.L - length(p)) / hip]) {
        parts = parts.flatMap((p) => [clip(p, fn, 0, 1), clip(p, fn, 0, -1)]).filter((p) => p.length > 2);
      }
    for (const poly of parts)
      for (let j = 1; j < poly.length - 1; j++)
        g.tri(
          key,
          col,
          atY(poly[0], height(poly[0])),
          atY(poly[j], height(poly[j])),
          atY(poly[j + 1], height(poly[j + 1])),
        );
  }
  for (const rr of [b.outer, ...(b.holes || [])])
    for (const f of faces(rr)) {
      const cuts = [0, 1];
      const start = measure(f.a),
        end = measure(f.b);
      if ((start - mid) * (end - mid) < 0) cuts.splice(1, 0, (mid - start) / (end - start));
      for (let j = 1; j < cuts.length; j++) {
        const a = mix(f.a, f.b, cuts[j - 1]),
          d = mix(f.a, f.b, cuts[j]),
          ya = height(a),
          yd = height(d);
        if (Math.max(ya, yd) > wall + 0.03)
          g.quad('stone', stone, atY(a, wall - 0.02), atY(d, wall - 0.02), atY(d, yd), atY(a, ya));
        if (Math.max(ya, yd) > wall + rise * 0.43)
          g.bar('trim', C.sill, atY(a, ya + 0.03), atY(d, yd + 0.03), 0.12, 5);
      }
    }
  return height;
}
function dormer(g, f, x, wall, w = 1.35, high = 1.52) {
  const y = wall + 0.23,
    d = -0.41,
    y1 = y + high * 0.68,
    peak = y + high;
  g.panel('stone', C.honey, f, x - w * 0.5, x + w * 0.5, y - 0.18, y1, d);
  g.tri('stone', C.light, f.point(x - w * 0.5, y1, d), f.point(x + w * 0.5, y1, d), f.point(x, peak, d));
  sash(g, f, x, y + 0.05, w * 0.68, 0.7, { d, trim: 0.065, lights: 2, sill: false, glass: '#798789' });
  for (const s of [-1, 1]) {
    const xa = x + s * w * 0.57;
    g.quad(
      'roof',
      '#738189',
      f.point(x, peak + 0.05, d + 0.11),
      f.point(xa, y1, d + 0.11),
      f.point(xa, y1, d - 1.65),
      f.point(x, peak + 0.05, d - 1.65),
    );
    g.bar('trim', C.sill, f.point(x, peak + 0.07, d + 0.1), f.point(xa, y1, d + 0.1), 0.083, 5);
  }
}
function civicGateway(g, b) {
  const box = orientedBox(b.outer),
    x0 = box.at(0, 0),
    x1 = box.at(box.L, 0),
    z0 = box.at(0, box.W),
    z1 = box.at(box.L, box.W);
  const front = frame(x0, x1),
    rear = frame(z1, z0),
    h = 5.25;
  for (const f of [front, rear]) {
    openBay(g, f, 0, f.l, 0, 2.3, 1.46, h, 0, {
      round: true,
      pier: Math.max(1, f.l - 3.03),
      color: '#d1c2a3',
      wall: 0.82,
    });
    for (const x of [0.15, 0.85]) {
      const p = f.plan(f.l * x, 0.18);
      g.frustum('stone', C.sill, p, 0, 0.42, 0.35, 0.36, 8);
      g.frustum('stone', C.honey, p, 0.4, 4.43, 0.28, 0.24, 10);
      g.frustum('stone', C.light, p, 4.36, 4.59, 0.32, 0.37, 8);
    }
    coping(g, f, h - 0.02, { out: 0.29, height: 0.27 });
    const a = f.point(0.04, h + 0.25, 0.12),
      c = f.point(f.l * 0.5, h + 1.56, 0.12),
      d = f.point(f.l - 0.04, h + 0.25, 0.12);
    g.tri('stone', C.honey, a, c, d);
    g.bar('stone', C.light, a, c, 0.16, 5);
    g.bar('stone', C.light, c, d, 0.16, 5);
    statue(g, f, f.l * 0.5, h + 0.35, 0.88, 0.2);
  }
  g.cap('lead', C.lead, [x0, x1, z1, z0], h + 0.05);
}
function lodge(g, b) {
  const box = orientedBox(b.outer),
    front = frame([-69.71, -9.6], [-57.51, 0.81], -1),
    rear = frame([-52.33, -5.31], [-64.46, -15.7], -1);
  const h = 6.6,
    gate = [-67.0, -7.28];
  const frontX = dist(front.a, gate),
    rearX = rear.l - frontX,
    w = 2.72;
  for (const [f, x] of [
    [front, frontX],
    [rear, rearX],
  ]) {
    for (const [a, e] of [
      [0, x - w * 0.5],
      [x + w * 0.5, f.l],
    ]) {
      if (e - a < 0.1) continue;
      g.panel('stone', C.honey, f, a, e, 0.02, h);
      const n = Math.max(1, Math.round((e - a) / 2.7));
      for (let j = 0; j < n; j++) {
        const m = a + ((j + 0.5) * (e - a)) / n;
        if (e - a > 1.6) sash(g, f, m, 1.08, 1.11, 1.39, { hood: true, lamp: j % 2 === 0 });
      }
    }
    openBay(g, f, x - w * 0.56, x + w * 0.56, 0, 2.2, 0.9, 3.74, 0, { pier: 0.31, color: C.honey });
    g.panel('stone', C.honey, f, 0, f.l, 3.69, h);
    coping(g, f, h - 0.04, { out: 0.22, height: 0.18 });
    for (let i = 0; i < 5; i++) {
      const u = ((i + 0.5) * f.l) / 5;
      sash(g, f, u, 4.05, 1.09, 1.57, { hood: true, lamp: i === 3 });
    }
    merlons(g, f, h + 0.12, Math.round(f.l / 1.33), 0.38, 0.28);
  }
  for (const f of [frame(front.a, rear.b), frame(rear.a, front.b)]) {
    g.panel('stone', C.honey, f, 0, f.l, 0.02, h);
    for (let k = 0; k < 2; k++)
      sash(g, f, f.l * (0.27 + 0.45 * k), 3.88, 1.03, 1.54, { hood: true, lamp: k === 0 });
  }
  for (const s of [-1, 1]) {
    const a = front.plan(frontX + s * w * 0.5),
      d = rear.plan(rearX - s * w * 0.5),
      f = frame(a, d);
    g.panel('rubble', '#b0a083', f, 0, f.l, 0.02, 3.21);
  }
  g.cap('rubble', '#b3a891', b.outer, 3.58);
  drawCutRoof(g, b, box, h, 2.3, 0, 'roof', C.slate, C.honey);
  const face = front;
  g.block('stone', C.light, face, frontX - w * 0.6, frontX + w * 0.6, 3.5, 3.78, -0.01, 0.35);
  for (const s of [-1, 1])
    g.block(
      'stone',
      C.sill,
      face,
      frontX + s * w * 0.62 - 0.13,
      frontX + s * w * 0.62 + 0.13,
      0,
      4.22,
      -0.06,
      0.27,
    );
  for (const d of [-0.81, 0, 0.81]) statue(g, face, frontX + d, 3.77, 0.71, 0.25);
  const gable = frame(front.a, rear.b);
  sash(g, gable, gable.l * 0.5, 6.61, 1.29, 1.07, { hood: true, lights: 2, glass: '#7d8989', trim: 0.09 });
  lancet(g, gable, gable.l * 0.5, 8.05, 0.37, 0.64, 1, {
    glass: '#aa997f',
    kind: 'trim',
    noSill: true,
    frame: 0.05,
  });
}
function greenhouse(g, b, box) {
  const h = 2.4;
  g.prism('fine', '#b7bba6', b.outer, 0.01, 0.45);
  for (const f of faces(b.outer)) {
    g.panel('glass', '#c1cebd', f, 0, f.l, 0.43, h);
    const n = Math.max(1, Math.round(f.l / 1.15));
    for (let j = 0; j <= n; j++)
      g.panel('trim', '#e1dac4', f, (f.l * j) / n - 0.05, (f.l * j) / n + 0.05, 0.41, h + 0.13, 0.03);
    for (const y of [1.33, h]) g.block('trim', '#d7d3bd', f, 0, f.l, y, y + 0.08, -0.07, 0.08);
  }
  drawCutRoof(g, b, box, h, 1.62, 0, 'glass', '#b4c6b7', '#bbbda7');
  for (let i = 0; i <= Math.floor(box.L); i++) {
    const x = (i * box.L) / Math.floor(box.L),
      mid = atY(box.at(x, box.W / 2), h + 1.65);
    g.bar('trim', '#e3dec7', atY(box.at(x, 0), h + 0.03), mid, 0.054);
    g.bar('trim', '#e3dec7', mid, atY(box.at(x, box.W), h + 0.03), 0.054);
  }
}
export function contextBuilding(g, b) {
  const name = b.name || '',
    box = orientedBox(b.outer);
  if (!box) return;
  if (b.role === 'porters-lodge') {
    lodge(g, b);
    return;
  }
  if (/Danby Gateway/.test(name)) {
    civicGateway(g, b);
    return;
  }
  if (b.tags?.building === 'greenhouse') {
    greenhouse(g, b, box);
    return;
  }
  const seed = Number(b.id.slice(1)) || 12,
    r = seeded(seed),
    street = /Chaplain/.test(name),
    swithun = /Swithun|Longwall Quad/.test(name);
  const large = /President|Library/.test(name),
    ancient = /Grammar Hall|Old Kitchen/.test(name),
    tiny = box.L * box.W < 63,
    formal = /Daubeny|Professor/.test(name);
  const wall = tiny
    ? 3.32
    : street
      ? 6.6
      : large
        ? 9.12
        : ancient
          ? 7.2
          : swithun
            ? 8.82
            : formal
              ? 8.74
              : 6.69 + r() * 1.2;
  const rise = tiny ? 1.3 : street ? 2.72 : swithun || ancient ? 4.0 : large ? 4.65 : 2.85;
  const stones = ['#d4c29f', '#c9b99d', '#d8c8ac', '#c4b99e', '#d8c7a5'],
    roofs = ['#76818a', '#7c8790', '#78818c', '#7e8588', '#818889'];
  const stone = street ? '#d2c1a3' : swithun ? '#cfbd9a' : stones[Math.floor(r() * stones.length)],
    roof = roofs[Math.floor(r() * roofs.length)];
  g.prism(street || formal ? 'stone' : 'rubble', stone, b.outer, 0.01, wall, b.holes || []);
  const hip = formal ? Math.min(box.W * 0.31, box.L * 0.18) : 0;
  const top = drawCutRoof(g, b, box, wall, rise, hip, 'roof', roof, stone);
  for (const rr of [b.outer, ...(b.holes || [])])
    for (const f of faces(rr)) {
      if (f.l < 1.75) continue;
      const k = Math.max(1, Math.round(f.l / (formal ? 3.6 : street ? 2.9 : 3.65))),
        longFace = f.l > 6 && Math.abs(f.ux * box.ux + f.uz * box.uz) > 0.76;
      const frontish = f.nz > 0.15;
      for (let i = 0; i < k; i++) {
        const x = ((i + 0.5) * f.l) / k,
          ww = Math.min(k === 1 ? 1.25 : 1.71, (f.l / k) * 0.54);
        if (ancient && longFace) {
          lancet(g, f, x, 1.62, Math.min(ww * 1.22, 2.4), 3.48, 3, {
            glass: '#7f9295',
            rise: 0.78,
            frame: 0.11,
          });
          if (i > 0) buttress(g, f, x - f.l / (2 * k), 0, wall - 0.26, 0.51, 0.52);
        } else {
          if (k >= 3 && i === 1 && !street) {
            lancet(g, f, x, 0.075, Math.min(1.3, ww), 2.12, 1, {
              glass: C.wood,
              kind: 'trim',
              noSill: true,
              rise: 0.42,
              frame: 0.11,
            });
          } else
            sash(g, f, x, 0.85 + (formal ? 0.16 : 0), ww, tiny ? 1.1 : 1.52, {
              lights: formal ? 2 : swithun ? 3 : 2,
              cross: formal ? 2 : 1,
              hood: street || swithun,
              lamp: r() < 0.27,
            });
          if (!tiny)
            sash(g, f, x, wall - 2.44, ww - 0.09, formal ? 1.86 : 1.56, {
              hood: street || formal || swithun,
              lights: swithun ? 3 : 2,
              cross: formal ? 2 : 1,
              lamp: r() < 0.25,
            });
        }
        if (longFace && ((street && i % 2 === 0) || (swithun && i % 2 === 1) || (large && i % 3 === 1)))
          dormer(g, f, x, wall, swithun ? 1.84 : 1.42, swithun ? 1.92 : 1.59);
      }
      coping(g, f, wall - 0.1, { out: 0.15, height: 0.15, color: stone });
      if (street && longFace) {
        g.block('stone', C.light, f, 0, f.l, 3.1, 3.26, -0.04, 0.16);
        merlons(g, f, wall + 0.04, Math.round(f.l / 1.16), 0.39, 0.24, C.grey);
      }
      if (large && longFace && frontish && f.l > 13) {
        const mid = f.l * 0.52;
        g.block('rubble', stone, f, mid - 1.45, mid + 1.45, 0.01, wall - 0.3, -0.05, 0.86);
        for (const y of [1.2, 5.24]) sash(g, f, mid, y, 2.1, 1.77, { d: 0.87, lights: 3, hood: true });
        g.tri(
          'stone',
          C.honey,
          f.point(mid - 1.73, wall - 0.3, 0.92),
          f.point(mid + 1.73, wall - 0.3, 0.92),
          f.point(mid, wall + 2.0, 0.92),
        );
      }
    }
  if (!tiny) {
    const count = Math.max(1, Math.min(4, Math.round(box.L / 12)));
    for (let j = 0; j < count; j++) {
      const u = ((j + 0.45) * box.L) / count,
        v = box.W * (0.49 + 0.15 * ((j % 2) * 2 - 1)),
        q = box.at(u, v);
      // On a deeply stepped footprint, skip chimney locations outside the actual roof.
      let inside = false;
      const ring = b.outer;
      for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
        const a = ring[i],
          bb = ring[k];
        if (a[1] > q[1] !== bb[1] > q[1] && q[0] < ((bb[0] - a[0]) * (q[1] - a[1])) / (bb[1] - a[1]) + a[0])
          inside = !inside;
      }
      if (inside)
        stoneChimney(
          g,
          q,
          top(q),
          street ? 0.92 : 0.78,
          street ? 2.22 : 1.68,
          Math.atan2(box.uz, box.ux),
          stone,
          r() > 0.3,
        );
    }
  }
}
