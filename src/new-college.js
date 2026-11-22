import { atY, faces, frame, mix, orientedBox } from './magdalen/architecture/geometry.js';
import { archPts, coping, merlons, openBay, lancet, buttress } from './magdalen/architecture/masonry.js';
import { wallWithWindows } from './magdalen/architecture/deep-windows.js';
import { ridgeRoof } from './palette.js';
import {
  belfry,
  chapelWing,
  chalk,
  elevationRing,
  limestone,
  mappedPortal,
  sideOf,
  windowRows,
} from './college-masonry.js';
import quarters from './data/quarters.json';

const mound = quarters.newcollege.mound;
const middle = mound.reduce((s, p) => [s[0] + p[0] / mound.length, s[1] + p[1] / mound.length], [0, 0]);
const moundFaces = faces(mound);
function slope(t) {
  return 6.7 * (1 - t * t) * (1 - t * t);
}
export function gardenHeight(x, z) {
  if (x < -224 || x > -191 || z < -243 || z > -209) return 0;
  let t = 0;
  for (const f of moundFaces) {
    const reach = (f.a[0] - middle[0]) * f.nx + (f.a[1] - middle[1]) * f.nz;
    if (reach > 0) t = Math.max(t, ((x - middle[0]) * f.nx + (z - middle[1]) * f.nz) / reach);
  }
  return t < 1 ? slope(t) : 0;
}
// Garden planting positions are inferred from the gallery; individual tree
// nodes in the cloisters and Warden's Garden are supplied by the survey.
export const moundTrees = [
  [-214, -233, 10.6, 4.0],
  [-204, -234, 8.9, 3.3],
  [-198, -227, 9.5, 3.5],
  [-210, -222, 11.5, 4.6],
  [-218, -220, 7.4, 2.8],
  [-200, -216, 8.6, 3.1],
];
export const wallBorder = Array.from({ length: 32 }, (_, i) => {
  const x = -270 + i * 2.62,
    z = -270.9 + (x + 270) * 0.158;
  // Keep the arched embrasure clear of the tallest perennials.
  if (Math.abs(x + 234.2) < 2.1) return [];
  return [
    { x, z: z + 0.75, kind: 'wall border', radius: 1.18, stature: 1.48 + (i % 4) * 0.13 },
    { x: x + 0.85, z: z + 2.22, kind: 'wall border', radius: 1.3, stature: 0.75 + (i % 3) * 0.17 },
  ];
}).flat();
function wallDetail(g, f, h) {
  // Individual weathered blocks and fine vertical ferns break up long
  // garden-facing runs. Their relief is shallow enough to keep the masonry legible.
  if (f.l < 4) return;
  const n = Math.floor(f.l / 1.7);
  for (let j = 0; j < n; j++) {
    const u = ((j + 0.5) * f.l) / n,
      y = 0.23 + ((j * 19) % 13) * 0.24;
    for (const s of [-1, 1]) {
      const d = s * 0.644;
      g.panel('rubble', j % 3 ? '#b3ac95' : '#ada68e', f, u - 0.31, u + 0.29, y, y + 0.24, d);
      if (j % 4 === 1) g.panel('rubble', '#a5a68a', f, u + 0.07, u + 0.24, y + 0.24, y + 0.35, d + 0.002 * s);
    }
  }
}
function garden(g, q) {
  for (const [outer, ...holes] of q.courtLawns) g.cap('grass', '#9bae7f', outer, 0.033, holes);
  for (let i = 1; i <= 12; i++) {
    const a = i / 12,
      b = (i - 1) / 12;
    for (let j = 0; j < mound.length; j++) {
      const end = mound[(j + 1) % mound.length],
        start = mound[j];
      g.quad(
        'grass',
        '#9aa77a',
        atY(mix(middle, start, a), slope(a) + 0.04),
        atY(mix(middle, end, a), slope(a) + 0.04),
        atY(mix(middle, end, b), slope(b) + 0.04),
        atY(mix(middle, start, b), slope(b) + 0.04),
      );
    }
  }
  for (const line of q.ramparts) {
    for (let i = 1; i < line.length; i++) {
      const f = frame(line[i - 1], line[i]);
      if (f.l < 0.15) continue;
      const h = 4.85,
        n = Math.max(1, Math.round(f.l / 2.64));
      g.block('ragstone', '#b7b199', f, -0.015, f.l + 0.015, 0, h, -0.63, 0.63);
      wallDetail(g, f, h);
      g.block('rubble', '#bdb69d', f, 0, f.l, h, h + 0.18, -0.67, 0.67);
      if (f.l > 1.6)
        for (let j = 0; j < n; j++) {
          const u = (f.l * (j + 0.5)) / n;
          g.block('ragstone', '#c4bda2', f, u - 0.32, u + 0.32, h + 0.18, h + 1.06, -0.61, 0.61);
          g.block('fine', '#c9c1a8', f, u - 0.35, u + 0.35, h + 1.06, h + 1.17, -0.64, 0.64);
        }
    }
  }
  // The mapped wall line already follows the outer curve of each bastion.
  // The long chord faces the garden. Its recess looks into the bastion.
  for (const r of q.bastions)
    if (r.length > 3) {
      g.cap('rubble', '#b6ad96', r, 4.88);
      const f = faces(r).sort((a, b) => b.l - a.l)[0];
      if (f.l > 2.4) {
        const w = Math.min(2.6, f.l * 0.63),
          a = (f.l - w) / 2,
          b = a + w;
        g.block('ragstone', '#b3aa93', f, 0, a, 0, 4.85, -0.48, 0.02);
        g.block('ragstone', '#b3aa93', f, b, f.l, 0, 4.85, -0.48, 0.02);
        openBay(g, f, a, b, 0.04, 2.08, 1.15, 4.85, 1.1, { pier: 0.25, wall: 0.6, color: '#bdb39c' });
      }
    }
}
function cloister(g, rings, style) {
  const outer = elevationRing(rings[0]),
    court = elevationRing(rings[1]);
  g.cap('flagstone', '#b5ad9a', outer, 0.12, [court]);
  for (const e of faces(outer))
    mappedPortal(g, e, style.passages.slice(0, 1), 4.35, '#c2b69b', (part) =>
      g.block('ragstone', '#c2b69b', part, 0, part.l + 0.025, 0.1, 4.35, -0.37, 0),
    );
  // Match each inside corner to its corresponding outside corner by distance.
  // The roof remains a continuous ring; its underside follows the actual pitch.
  const outerAt = (p) =>
    outer.reduce((a, b) =>
      Math.hypot(b[0] - p[0], b[1] - p[1]) < Math.hypot(a[0] - p[0], a[1] - p[1]) ? b : a,
    );
  for (const e of faces(court)) {
    const f = frame(e.a, e.b, -sideOf(e)),
      a = outerAt(e.a),
      b = outerAt(e.b);
    const ridgeA = mix(e.a, a, 0.53),
      ridgeB = mix(e.b, b, 0.53);
    for (const [p, q, y] of [
      [e.a, e.b, 4.02],
      [a, b, 4.39],
    ]) {
      g.quad('roof', '#9d8574', atY(p, y), atY(q, y), atY(ridgeB, 6.65), atY(ridgeA, 6.65));
      g.quad('trim', '#796856', atY(p, y - 0.12), atY(q, y - 0.12), atY(ridgeB, 6.48), atY(ridgeA, 6.48));
    }
    g.bar('roof', '#a78c73', atY(ridgeA, 6.65), atY(ridgeB, 6.65), 0.13, 5);
    const n = Math.max(3, Math.round(f.l / 3.5)),
      step = f.l / n;
    for (let j = 0; j < n; j++) {
      const gate = j === Math.floor(n / 2) && (f.nx > 0.65 || f.nz < -0.65);
      openBay(g, f, j * step, (j + 1) * step, gate ? 0.02 : 0.55, 2.58, 0.96, 4.01, 0, {
        cloister: true,
        noBack: true,
        pier: 0.36,
        wall: 0.41,
        color: '#c9bda1',
      });
      if (!gate) {
        const unit = (step - 0.44) / 3,
          start = j * step + 0.22;
        for (let light = 0; light < 3; light++) {
          const arch = archPts(
            start + (light + 0.5) * unit,
            unit,
            2.32,
            0.45 + (light === 1 ? 0.13 : 0),
            0.52,
            8,
          );
          for (let k = 1; k < arch.length; k++)
            g.bar('fine', '#d4c9a9', f.point(...arch[k - 1], -0.12), f.point(...arch[k], -0.12), 0.054, 5);
        }
        const u = j * step + 0.18,
          back = mix(a, b, (j + 0.12) / n),
          peak = mix(ridgeA, ridgeB, (j + 0.12) / n);
        g.bar('trim', '#887560', f.point(u, 3.87, -0.29), atY(peak, 6.35), 0.095, 4);
        g.bar('trim', '#887560', atY(peak, 6.35), atY(back, 4.18), 0.095, 4);
      }
      if (j % 4 === 2) {
        const rear = frame(a, b, sideOf(f)),
          u = (rear.l * (j + 0.52)) / n;
        g.block('fine', '#aca38e', rear, u - 0.42, u + 0.42, 1.28, 2.24, 0.37, 0.47);
        for (let k = 0; k < 4; k++)
          g.panel('trim', '#898676', rear, u - 0.25, u + 0.25, 1.49 + k * 0.13, 1.51 + k * 0.13, 0.48);
        g.block('trim', '#8c7860', rear, u - 1.02, u + 1.02, 0.42, 0.52, 0.42, 0.91);
        for (const off of [-0.73, 0.73])
          g.block('rubble', '#a49a81', rear, u + off - 0.1, u + off + 0.1, 0.12, 0.43, 0.51, 0.8);
      }
    }
    coping(g, f, 3.95, { width: 0.26, color: '#c5b599' });
  }
}
function range(g, r, style, holywell) {
  const fns = faces(elevationRing(r[0])),
    b = orientedBox(r[0]);
  const mid = b.at(b.L / 2, b.W / 2);
  const h = holywell ? 13.55 : mid[0] > -333 ? 11.6 : 12.4,
    tint = holywell ? '#cab79a' : '#ccbc9e';
  for (const f of fns) {
    mappedPortal(g, f, style.passages, h, tint, (e) => windowRows(g, e, h, 3, holywell ? 4.05 : 4.65, tint));
    coping(g, f, h - 0.15, { width: 0.32, color: chalk });
    if (f.l > 3.3) {
      merlons(g, f, h, Math.max(2, Math.round(f.l / 1.55)), holywell ? 0.46 : 0.55, 0.34);
      if (f.l > 17) for (let j = 1; j < f.l / 9; j++) buttress(g, f, j * 9, 0, h * 0.94, 0.48, 0.4);
    }
  }
  const facets =
    style.wings?.find((w) => w.start[0] === r[0][0][0] && w.start[1] === r[0][0][1])?.facets || style.facets;
  if (facets?.length)
    for (const tri of facets)
      g.tri('roof', '#80868a', ...tri.map(([x, z, dy]) => [x, h + 0.04 + dy * 0.78, z]));
  else ridgeRoof(g, r, h, 2.65, '#80868a', tint);
}
export function buildNewCollege(g, q, records) {
  garden(g, q);
  for (const [key, r] of records) {
    const s = q.buildings[key];
    switch (s?.family) {
      case 'newCloister':
        cloister(g, r, s);
        break;
      case 'newBell':
        belfry(g, r[0], false);
        break;
      case 'newChapel':
        for (const [part, volumes] of Object.entries(q.chapelVolumes))
          for (const v of volumes) {
            if (part === 'rear') {
              for (const f of faces(v[0])) g.panel('ragstone', limestone, f, 0, f.l, 0, 9.0);
              ridgeRoof(g, v, 9, 2.15, '#828888', limestone);
            } else
              chapelWing(
                g,
                v,
                r[0],
                part === 'ante' ? 16.55 : 16.15,
                part === 'ante' ? 3.45 : 4.2,
                'new',
                part === 'ante',
              );
          }
        break;
      case 'newOldQuad':
      case 'newHolywell':
        range(g, r, s, s.family === 'newHolywell');
        break;
      case 'newHall':
        for (const f of faces(elevationRing(r[0]))) {
          const n = Math.max(1, Math.round(f.l / 4.6)),
            step = f.l / n;
          wallWithWindows(
            g,
            f,
            0,
            13.3,
            Array.from({ length: n }, (_, i) => ({
              x: step * (i + 0.5),
              w: step * 0.6,
              h: 6.25,
              y: 5.5,
              rise: 1.55,
              lights: 3,
              seed: i,
            })),
            limestone,
          );
        }
        ridgeRoof(g, r, 13.3, 4.25, '#808890', limestone);
        break;
      case 'newMuniment':
        g.prism('ragstone', limestone, r[0], 0, 15.65);
        for (const f of faces(r[0])) {
          lancet(g, f, f.l / 2, 10.3, 1.1, 2.5, 1);
          coping(g, f, 15.65);
          merlons(g, f, 15.79, 4, 0.57);
        }
        break;
    }
  }
}
