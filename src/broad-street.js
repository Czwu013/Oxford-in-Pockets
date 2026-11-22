import * as T from 'three';
import { atY, faces, frame, orientedBox } from './magdalen/architecture/geometry.js';
import { archPts, buttress, merlons, openBay, statue } from './magdalen/architecture/masonry.js';
import { inside } from './magdalen/ground.js';
import { wallWithWindows } from './magdalen/architecture/deep-windows.js';
import { arch, course, pediment, reveal } from './civic-masonry.js';
import { dormer, elevationRing, mappedPortal, windowRows } from './college-masonry.js';
import { ridgeRoof } from './palette.js';
import { bench, lantern } from './street-craft.js';

const honey = '#cbb596',
  ivory = '#dfccab',
  cream = '#d3c39f',
  slate = '#757c81',
  tile = '#837367';
export const broadHeights = {
  balliolGate: 27.8,
  broadRange: 14.9,
  butterfield: 25.6,
  balliolHall: 21.5,
  salvin: 18.6,
  oldBalliol: 12.6,
  trinityTower: 23.5,
  trinityChapel: 13.7,
  wren: 14.9,
  jackson: 16.8,
  broadIron: 5.8,
  weston: 19.8,
  bookshop: 13.1,
  levine: 14.5,
  stuart: 6.0,
};
// Beds stay planted in the same places; the shared vegetation shader changes
// leaf area and blooms with the seasons. Their extents follow the garden views.
const border = (a, b, n, r, kind = 'wall border') =>
  Array.from({ length: n }, (_, i) => ({
    x: a[0] + ((b[0] - a[0]) * i) / (n - 1),
    z: a[1] + ((b[1] - a[1]) * i) / (n - 1),
    kind,
    radius: r,
    stature: 0.79 + (i % 3) * 0.16,
  }));
export const broadGardens = {
  balliol: [
    ...border([-773.4, -302.5], [-752.0, -308.5], 12, 0.76),
    ...border([-752, -308.6], [-735.5, -313], 9, 0.87),
    ...border([-805, -388], [-794, -390], 7, 0.84),
    ...border([-785, -328], [-765, -334], 9, 1.0),
  ],
  trinity: [
    ...border([-734, -354.1], [-716, -361.4], 11, 0.85),
    ...border([-648, -350], [-643.6, -334.8], 8, 0.66),
    ...border([-739, -438], [-704, -449], 13, 1.03),
    ...border([-714, -292.0], [-716.8, -302.1], 5, 0.64),
  ],
};
function edges(r) {
  const simple = elevationRing(r);
  return faces(simple.length > 2 ? simple : r);
}
// Individual openings with a recessed pane and four stone returns.
function light(g, f, u, lo, w, h, y0, y1, cols = 2, rows = 3, wall = cream) {
  const a = u - w / 2,
    b = u + w / 2;
  g.panel('stone', wall, f, 0, a, y0, y1);
  g.panel('stone', wall, f, b, f.l, y0, y1);
  g.panel('stone', wall, f, a, b, y0, lo);
  g.panel('stone', wall, f, a, b, lo + h, y1);
  reveal(g, f, u, lo, w, h, cols, rows);
}
function balustrade(g, f, y, turned = true) {
  course(g, f, y, 0.2, 0.22);
  course(g, f, y + 0.95, 0.18, 0.23);
  const n = Math.max(1, Math.round(f.l / (turned ? 0.69 : 0.53)));
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) * f.l) / n;
    if (!turned) {
      g.block('fine', ivory, f, u - 0.105, u + 0.105, y + 0.16, y + 0.96, -0.15, 0.1);
      continue;
    }
    const p = f.plan(u, -0.08);
    for (const [a, b, ra, rb] of [
      [0.19, 0.31, 0.15, 0.1],
      [0.31, 0.51, 0.1, 0.16],
      [0.51, 0.83, 0.16, 0.09],
      [0.83, 0.96, 0.09, 0.14],
    ])
      g.frustum('fine', ivory, p, y + a, y + b, ra, rb, 8);
  }
}
// Three glazed faces project over a chamfered corbel. The oriel casts a
// shadow across the courses beneath it from either end of the street.
function oriel(g, f, u, y, w, h, d) {
  const pts = [f.plan(u - w / 2), f.plan(u - w * 0.32, d), f.plan(u + w * 0.32, d), f.plan(u + w / 2)];
  g.cap('fine', honey, pts, y);
  g.cap('lead', slate, pts, y + h + 0.22);
  for (const side of faces(pts)) {
    if (side.nx * f.nx + side.nz * f.nz < 0.02) continue;
    g.quad(
      'fine',
      honey,
      side.point(0, y),
      side.point(side.l, y),
      f.point(u + w * 0.23, y - 1.05, 0.08),
      f.point(u - w * 0.23, y - 1.05, 0.08),
    );
    light(g, side, side.l / 2, y + 0.35, side.l * 0.74, h - 0.69, y, y + h, side.l > 1.4 ? 2 : 1, 2, ivory);
    course(g, side, y + h, 0.19, 0.13);
  }
}
function passage(g, path, w, h) {
  if (!path?.length) return;
  const f = frame(path[0], path.at(-1));
  for (const side of [-1, 1]) g.panel('ragstone', '#b4a386', f, 0, f.l, 0, h, (side * w) / 2);
  g.quad(
    'fine',
    '#afa18d',
    f.point(0, h, -w / 2),
    f.point(0, h, w / 2),
    f.point(f.l, h, w / 2),
    f.point(f.l, h, -w / 2),
  );
  g.quad(
    'flagstone',
    '#c1b298',
    f.point(0, 0.045, -w / 2),
    f.point(f.l, 0.045, -w / 2),
    f.point(f.l, 0.045, w / 2),
    f.point(0, 0.045, w / 2),
  );
}
function dial(g, f, u, y, r) {
  const center = f.point(u, y, 0.33);
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      b = ((i + 1) * Math.PI) / 24;
    const pt = (angle, radius, d) => f.point(u + radius * Math.sin(angle), y + radius * Math.cos(angle), d);
    g.tri('ink', '#35413b', center, pt(a, r, 0.33), pt(b, r, 0.33));
    g.quad('trim', '#bd9f63', pt(a, r, 0.34), pt(b, r, 0.34), pt(b, r * 1.075, 0.34), pt(a, r * 1.075, 0.34));
    if (i % 4 === 0) g.bar('fine', '#d4b67a', pt(a, r * 0.75, 0.36), pt(a, r * 0.94, 0.36), 0.026, 4);
  }
}
function garland(g, f, u, y, size) {
  let last = f.point(u - 0.42 * size, y + 0.29 * size, 0.2);
  for (let j = 1; j <= 12; j++) {
    const t = j / 12;
    const next = f.point(u + (t - 0.5) * size * 0.84, y + (0.29 - 0.55 * Math.sin(Math.PI * t)) * size, 0.23);
    g.bar('fine', j % 2 ? cream : ivory, last, next, 0.085 * size, 6);
    last = next;
  }
  for (const s of [-1, 1]) {
    const p = f.plan(u + s * 0.41 * size, 0.19);
    g.frustum('fine', ivory, p, y - 0.53 * size, y + 0.33 * size, 0.06 * size, 0.145 * size, 7);
  }
}
function gateTower(g, record, style, clockwork) {
  const [, rings] = record,
    ring = rings[0],
    tower = style.family === 'trinityTower';
  const top = tower ? 20.05 : 26.25,
    col = tower ? '#cdb58c' : '#d0bfa4';
  const path = style.passages?.[0];
  passage(g, path, tower ? 2.55 : 3.35, tower ? 4.55 : 4.4);
  for (const f of edges(ring)) {
    const cross =
      path &&
      [path[0], path.at(-1)]
        .map((p) => ({
          u: (p[0] - f.a[0]) * f.ux + (p[1] - f.a[1]) * f.uz,
          d: Math.abs((p[0] - f.a[0]) * f.nx + (p[1] - f.a[1]) * f.nz),
        }))
        .find((p) => p.d < 0.75 && p.u > 0.6 && p.u < f.l - 0.6);
    if (f.l < 2) {
      g.panel('stone', col, f, 0, f.l, 0, top);
      continue;
    }
    const u = cross?.u ?? f.l / 2,
      low = tower ? 5.45 : 5.6;
    if (cross) {
      const half = Math.min(tower ? 1.6 : 2.09, u - 0.12, f.l - u - 0.12);
      g.panel('stone', col, f, 0, u - half, 0, low);
      g.panel('stone', col, f, u + half, f.l, 0, low);
      openBay(g, f, u - half, u + half, 0, 3.0, tower ? 1.55 : 1.4, low, 1.05, {
        round: tower,
        pier: 0.26,
        color: col,
        noBack: true,
      });
    } else g.panel('stone', col, f, 0, f.l, 0, low);
    if (tower) {
      light(g, f, f.l / 2, 6.25, Math.min(2.65, f.l * 0.49), 2.95, low, 13.18, 2, 3, col);
      light(g, f, f.l / 2, 14.47, Math.min(2.28, f.l * 0.47), 3.68, 13.18, top, 3, 4, col);
      for (const y of [5.29, 11.71, 12.14, 12.65, 19.46, 19.83]) course(g, f, y, 0.19, 0.31);
      for (const x of [0.36, f.l - 0.36]) {
        g.block('fine', ivory, f, x - 0.24, x + 0.24, 13.05, 19.41, -0.14, 0.21);
        g.block('fine', cream, f, x - 0.37, x + 0.37, 18.95, 19.35, -0.14, 0.31);
      }
      if (f.nz > 0.66 && cross) {
        pediment(g, f, f.l / 2, 3.27, 9.42, 0.93, ivory, 0.18);
        dial(g, f, u, 12.64, 1.03);
        clockwork.push([f, u, 12.64]);
        for (const side of [-1, 1]) {
          garland(g, f, f.l * 0.5 + side * 1.95, 9.55, 0.86);
          garland(g, f, f.l * 0.5 + side * 1.86, 16.49, 0.81);
        }
      }
      balustrade(g, f, top);
    } else {
      if (f.l > 4.6) {
        light(g, f, f.l / 2, 8.3, Math.min(2.55, f.l * 0.42), 4.25, low, 17.05, 2, 2, col);
        light(g, f, f.l / 2, 19.8, Math.min(3.05, f.l * 0.49), 3.48, 17.05, top, 3, 3, col);
        if (f.nz > 0.7 && cross) {
          oriel(g, f, u, 10.4, 3.35, 4.95, 1.13);
          pediment(g, f, u, 3.14, 15.41, 1.46, ivory, 0.31);
          for (const spread of [0.0, 0.2, 0.4]) {
            const moulding = archPts(u, 3.98 + spread, 2.96, 1.54 + spread * 0.38, 0.36, 20);
            for (let j = 1; j < moulding.length; j++)
              g.bar(
                'fine',
                spread === 0.2 ? '#b6a385' : ivory,
                f.point(...moulding[j - 1], 0.08 + spread * 0.21),
                f.point(...moulding[j], 0.08 + spread * 0.21),
                0.075,
                6,
              );
            for (const sign of [-1, 1])
              g.bar(
                'fine',
                ivory,
                f.point(u + sign * (1.99 + spread / 2), 0.14, 0.11),
                f.point(u + sign * (1.99 + spread / 2), 2.97, 0.11),
                0.071,
                6,
              );
          }
          g.block('fine', ivory, f, u - 0.48, u + 0.48, 5.57, 6.55, -0.02, 0.16);
          g.tri(
            'stone',
            '#bcab8e',
            f.point(u - 0.32, 6.32, 0.18),
            f.point(u + 0.32, 6.32, 0.18),
            f.point(u, 5.77, 0.22),
          );
          for (const x of [1.0, f.l - 1.0])
            if (Math.abs(x - u) > 1.55)
              arch(g, f, x, 16.03, 0.62, 2.36, { depth: 0.3, d: 0.33, trim: ivory });
        }
      } else g.panel('stone', col, f, 0, f.l, low, top);
      for (const y of [5.55, 8.38, 12.25, 17, 19.39, 25.5, 26.0]) course(g, f, y, 0.135, 0.2);
      for (let x = 0.28; x < f.l; x += 0.53)
        g.block('fine', cream, f, x - 0.105, x + 0.105, 25.66, 25.94, -0.05, 0.24);
      balustrade(g, f, top, false);
    }
  }
  g.cap('lead', '#7e817d', ring, top + 0.1);
  const box = orientedBox(ring);
  if (tower) {
    const front = edges(ring).sort((a, b) => b.nz - a.nz)[0];
    for (const u of [0.5, box.L - 0.5])
      for (const v of [0.53, box.W - 0.53]) {
        const p = box.at(u, v),
          f = frame(
            p,
            [p[0] + front.ux, p[1] + front.uz],
            Math.sign(front.nx * front.uz - front.nz * front.ux),
          );
        g.frustum('fine', cream, p, top, top + 1.18, 0.52, 0.51, 4, 0.785);
        statue(g, f, 0, top + 1.18, 2.25, 0);
      }
  }
  const pole = box.at(box.L * 0.58, box.W * 0.54);
  g.bar('trim', '#aaa58e', atY(pole, top + 0.12), atY(pole, top + (tower ? 5.6 : 4.4)), 0.053, 7);
}
function patternedSlate(g, rings, h, rise) {
  const b = orientedBox(rings[0]),
    half = b.W / 2,
    col = ['#777a79', '#8a8981', '#989b8e', '#747680', '#847880'];
  const pos = (u, v) => atY(b.at(u, v), h + 0.028 + rise * (1 - Math.abs(v - half) / half));
  for (const side of [-1, 1]) {
    const rows = Math.max(1, Math.ceil(half / 0.42));
    for (let j = 0; j < rows; j++) {
      const v0 = half + (side * half * j) / rows,
        v1 = half + (side * half * (j + 1)) / rows;
      for (let k = -1; k < Math.ceil(b.L / 0.69); k++) {
        const x0 = Math.max(0, (k + (j % 2) * 0.5) * 0.69),
          x1 = Math.min(b.L, (k + 1 + (j % 2) * 0.5) * 0.69);
        if (
          x1 - x0 < 0.04 ||
          ![x0 + 0.012, x1 - 0.012].every((x) =>
            [v0 * 0.98 + v1 * 0.02, v0 * 0.02 + v1 * 0.98].every((v) => inside(...b.at(x, v), rings[0])),
          )
        )
          continue;
        const diamond = ((((k % 6) + 6) % 6) + Math.abs((j % 6) - 3)) % 6;
        g.quad(
          'roof',
          col[diamond === 0 ? 2 : diamond === 1 ? 4 : (j * 17 + k * 7) % 3 === 0 ? 1 : 0],
          pos(x0, v0),
          pos(x1, v0),
          pos(x1, v1),
          pos(x0, v1),
        );
      }
    }
  }
}
function butterfieldTurret(g) {
  const p = [-753.77, -321.47],
    plum = '#91776e',
    pale = '#d5c5a6';
  const ring = Array.from({ length: 8 }, (_, i) => [
    p[0] + 1.15 * Math.cos((i * Math.PI) / 4),
    p[1] + 1.15 * Math.sin((i * Math.PI) / 4),
  ]);
  for (let y = 7; y < 19.9; y += 0.9)
    g.frustum(
      'ragstone',
      Math.round((y - 7) / 0.9) % 2 ? plum : pale,
      p,
      y,
      Math.min(y + 0.9, 19.92),
      1.15,
      1.15,
      8,
    );
  for (const f of faces(ring)) {
    const upper = { ...f, point: (u, y, d) => f.point(u, 19.9 + y, d) };
    openBay(g, upper, 0, f.l, 0, 0.99, 0.55, 2.02, 0, { d: 0, pier: 0.28, color: pale, noBack: true });
  }
  g.frustum('fine', plum, p, 21.9, 22.2, 1.26, 1.29, 8);
  for (let j = 0; j < 7; j++)
    g.frustum(
      'fine',
      j % 2 ? '#b3a08f' : '#cbbba3',
      p,
      22.2 + j * 0.43,
      22.63 + j * 0.43,
      1.3 * (1 - j / 7),
      1.3 * (1 - (j + 1) / 7),
      8,
    );
  g.bar('trim', '#847c64', atY(p, 25.19), atY(p, 25.65), 0.047, 5);
}
function chapel(g, rings, kind) {
  const trinity = kind === 'trinityChapel',
    hall = kind === 'balliolHall';
  const wall = trinity ? '#d1bb94' : hall ? '#baa98b' : '#c8b99c';
  const h = trinity ? 12.3 : hall ? 12.1 : 11.85,
    rise = trinity ? 1.42 : hall ? 6.3 : 8.1;
  ridgeRoof(g, rings, h, rise, trinity ? '#818b8b' : hall ? '#7d7e78' : '#767b7b', wall);
  for (const f of edges(rings[0])) {
    if (f.l < 4) {
      g.panel('ragstone', wall, f, 0, f.l, 0, h);
      continue;
    }
    const end = Math.abs(f.nx) > 0.78;
    const count = end ? 1 : Math.max(1, Math.round(f.l / (trinity ? 6.3 : hall ? 5.7 : 6.9))),
      bay = f.l / count;
    for (let i = 0; i < count; i++) {
      const s = frame(f.plan(i * bay), f.plan((i + 1) * bay), Math.sign(f.nx * f.uz - f.nz * f.ux));
      const w = Math.min(bay * (end ? 0.65 : 0.67), end ? 6.7 : 3.85),
        a = (bay - w) / 2,
        b = a + w;
      if (trinity) {
        const sill = 2.75,
          high = 7.35;
        g.panel('stone', wall, s, 0, a, 0, h);
        g.panel('stone', wall, s, b, bay, 0, h);
        g.panel('stone', wall, s, a, b, 0, sill);
        g.panel('stone', wall, s, a, b, sill + high + 0.31, h);
        arch(g, s, bay / 2, sill, w, high, { rise: w * 0.5, lights: 4, wall, depth: 0.58 });
        g.block('fine', ivory, s, a - 0.18, b + 0.18, sill - 0.18, sill + 0.04, -0.17, 0.27);
      } else {
        if (hall) light(g, s, bay / 2, 0.63, Math.min(2.24, w * 0.72), 2.56, 0, 4.0, 2, 3, wall);
        const sill = hall ? 5.02 : 2.24,
          riseW = w * 0.61,
          height = h - sill - 0.83;
        wallWithWindows(
          g,
          s,
          hall ? 4 : 0,
          h,
          [
            {
              x: bay / 2,
              w,
              y: sill,
              h: height,
              rise: riseW,
              lights: end ? 5 : hall ? 3 : 2,
              seed: i + 4,
              depth: 0.59,
            },
          ],
          wall,
        );
        if (!hall)
          for (let j = 0; j < 9; j++) {
            const y = 0.48 + j * 1.34,
              tint = j % 2 ? '#97756c' : '#947f74';
            g.panel('ragstone', tint, s, 0, a - 0.16, y, y + 0.5, 0.035);
            g.panel('ragstone', tint, s, b + 0.16, bay, y, y + 0.5, 0.035);
            if (y + 0.5 < sill - 0.17) g.panel('ragstone', tint, s, a - 0.16, b + 0.16, y, y + 0.5, 0.035);
          }
        if (!hall) {
          const hood = archPts(bay / 2, w + 0.37, sill + height - riseW, riseW + 0.19, 0.46, 18);
          for (let j = 1; j < hood.length; j++)
            g.bar(
              'fine',
              j % 4 < 2 ? '#a28372' : '#d9c9ac',
              s.point(...hood[j - 1], 0.088),
              s.point(...hood[j], 0.088),
              0.15,
              5,
            );
        }
        buttress(g, s, 0.15, 0.02, h - 0.4, 0.46, 0.68);
      }
    }
    course(g, f, h - 0.25, 0.22, 0.24);
    if (trinity && f.l > 7) balustrade(g, f, h);
    if (!trinity && !hall && end && f.l > 6) {
      for (let i = 1; i < 8; i++) {
        const lo = (i * rise) / 8,
          hi = lo + 0.47;
        const a0 = ((f.l / 2) * lo) / rise,
          a1 = ((f.l / 2) * hi) / rise;
        g.quad(
          'stone',
          '#92776b',
          f.point(a0, h + lo, 0.046),
          f.point(f.l - a0, h + lo, 0.046),
          f.point(f.l - a1, h + hi, 0.046),
          f.point(a1, h + hi, 0.046),
        );
      }
    }
  }
  if (!trinity && !hall) {
    patternedSlate(g, rings, h, rise);
    butterfieldTurret(g);
    const box = orientedBox(rings[0]),
      a = box.at(0, box.W / 2),
      b = box.at(box.L, box.W / 2);
    g.bar('trim', '#8d8978', atY(a, h + rise), atY(b, h + rise), 0.085, 6);
    for (let i = 0.45; i < box.L - 0.3; i += 1.22) {
      const p = box.at(i, box.W / 2);
      g.frustum('trim', '#97917b', p, h + rise, h + rise + 0.4, 0.115, 0.035, 5);
    }
  } else if (hall) {
    const b = orientedBox(rings[0]),
      p = b.at(b.L * 0.5, b.W * 0.5);
    g.frustum('lead', '#87908d', p, 17.5, 18.95, 0.95, 0.64, 8);
    g.frustum('ink', '#666d64', p, 18.94, 20.11, 0.63, 0.58, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        q = [p[0] + 0.6 * Math.cos(a), p[1] + 0.6 * Math.sin(a)];
      g.bar('fine', cream, atY(q, 18.95), atY(q, 20.12), 0.075, 6);
    }
    g.frustum('lead', '#808b88', p, 20.09, 21.44, 0.78, 0.07, 8);
  }
}
function range(g, rings, style, kind) {
  const wren = kind === 'wren',
    jack = kind === 'jackson',
    old = kind === 'oldBalliol',
    salvin = kind === 'salvin';
  const h = salvin ? 16.8 : jack ? 12.5 : wren ? 10.85 : old ? 8.95 : 10.65;
  const col = wren ? '#c4b295' : jack ? '#ccb693' : old ? '#bbad91' : '#d2c0a0';
  ridgeRoof(g, rings, h, salvin ? 0.28 : wren ? 4.05 : old ? 3.62 : 4.22, wren || old ? slate : tile, col);
  for (const f of edges(rings[0])) {
    if (f.l < 2.65) {
      g.panel('stone', col, f, 0, f.l, 0, h);
      continue;
    }
    const paint = (s) =>
      windowRows(g, s, h, wren || jack || kind === 'broadRange' ? 3 : 2, wren ? 3.6 : 3.35, col, old);
    mappedPortal(g, f, style.passages, h, col, paint);
    if (old && kind === 'oldBalliol' && style.name.includes('Old Common'))
      merlons(g, f, h, Math.max(3, Math.round(f.l / 1.43)), 0.66, 0.37);
    for (const y of [h * 0.34, h * 0.67, h - 0.19]) course(g, f, y, 0.15, 0.21);
    if (salvin) {
      merlons(g, f, h, Math.max(2, Math.round(f.l / 1.55)), 0.76, 0.45);
      continue;
    }
    if (f.l < 5.7) continue;
    const n = Math.max(1, Math.floor(f.l / (wren ? 6.9 : 5.5)));
    for (let i = 0; i < n; i++) {
      const u = (f.l * (i + 0.5)) / n;
      dormer(g, f, u, h - 0.05, wren ? 1.5 : 2.3, wren ? slate : tile);
      if ((jack || kind === 'broadRange') && i % 3 === 0 && f.nz > 0.48)
        oriel(g, f, u, h * 0.39, 2.5, h * 0.48, 0.79);
    }
    if (wren) {
      course(g, f, h - 0.48, 0.25, 0.34);
      for (let i = 0; i < Math.round(f.l / 3.35); i++) {
        const u = ((i + 0.5) * f.l) / Math.round(f.l / 3.35);
        if (i % 2 === 0) pediment(g, f, u, 1.94, 6.76, 0.32, ivory, 0.18);
      }
    }
    if ((jack || kind === 'broadRange') && f.l > 8) {
      const u = f.l * 0.83;
      g.block('stone', col, f, u - 0.51, u + 0.51, h + 1.1, h + 5.43, -2.6, -1.91);
      g.block('fine', cream, f, u - 0.63, u + 0.63, h + 5.43, h + 5.66, -2.71, -1.8);
    }
  }
}
function modern(g, rings, kind) {
  const weston = kind === 'weston',
    book = kind === 'bookshop',
    h = weston ? 15.3 : book ? 9.7 : 12.5;
  const wall = weston ? '#cbbb9d' : book ? '#d9d3be' : '#c5bcaa';
  ridgeRoof(g, rings, h, book ? 3.3 : 0.14, book ? slate : '#9c9e94', wall);
  for (const f of edges(rings[0])) {
    if (f.l < 2) {
      g.panel('stone', wall, f, 0, f.l, 0, h);
      continue;
    }
    if (weston && f.nz > 0.68 && f.l > 24) {
      const count = Math.max(4, Math.round(f.l / 4.7));
      g.panel('glass', '#738681', f, 0, f.l, 0.1, 5.25, -0.8);
      for (let i = 0; i <= count; i++) {
        const u = (f.l * i) / count;
        g.block('fine', cream, f, u - 0.32, u + 0.32, 0, 5.22, -0.7, 2.77);
      }
      g.block('stone', wall, f, -0.13, f.l + 0.13, 5.21, 5.7, -1.0, 2.9);
      for (let i = 0; i < count; i++) {
        const b = frame(
          f.plan((i * f.l) / count),
          f.plan(((i + 1) * f.l) / count),
          Math.sign(f.nx * f.uz - f.nz * f.ux),
        );
        light(g, b, b.l / 2, 7.01, Math.min(1.7, b.l * 0.47), 4.67, 5.68, h, 3, 5, wall);
      }
    } else if (book && f.nz > 0.6) {
      const n = Math.max(1, Math.round(f.l / 3.2));
      for (let i = 0; i < n; i++) {
        const b = frame(
          f.plan((f.l * i) / n),
          f.plan((f.l * (i + 1)) / n),
          Math.sign(f.nx * f.uz - f.nz * f.ux),
        );
        g.panel('shop-display', '#c2b8a0', b, 0, b.l, 0.25, 2.8, -0.16);
        g.block('trim', '#354954', b, 0.02, 0.19, 0, 3.15, -0.22, 0.1);
        g.block('trim', '#344553', b, 0, b.l, 2.76, 3.41, -0.21, 0.16);
        light(g, b, b.l / 2, 4.13, b.l * 0.62, 3.67, 3.42, h, 2, 4, wall);
      }
    } else windowRows(g, f, h, weston ? 3 : book ? 3 : 4, weston ? 3.85 : 3.4, wall);
    course(g, f, h - 0.32, 0.3, 0.28);
  }
  if (weston) {
    const b = orientedBox(rings[0]),
      inner = [b.at(8, 8), b.at(b.L - 8, 8), b.at(b.L - 8, b.W - 8), b.at(8, b.W - 8)];
    g.prism('stone', wall, inner, h, 19.1);
    g.cap('lead', '#a3a59b', inner, 19.14);
    for (const f of faces(inner)) {
      course(g, f, 18.93, 0.25, 0.24);
      for (let u = 1.0; u < f.l - 0.8; u += 2) g.panel('glass', '#69777a', f, u, u + 0.78, 16.1, 17.48, 0.04);
    }
  }
}
function ironGates(g, points) {
  const f = frame(points[0], points.at(-1)),
    mid = f.l / 2;
  for (const x of [-0.25, f.l + 0.25]) {
    g.block('stone', honey, f, x - 0.59, x + 0.59, 0, 4.04, -0.54, 0.54);
    for (const [y, w] of [
      [0.18, 0.72],
      [3.42, 0.66],
      [3.82, 0.76],
      [4.13, 0.65],
    ])
      g.block('fine', ivory, f, x - w, x + w, y, y + 0.19, -w, w);
    g.frustum('fine', cream, f.plan(x), 4.33, 4.8, 0.39, 0.26, 8);
    g.frustum('fine', ivory, f.plan(x), 4.8, 5.38, 0.32, 0.08, 9);
  }
  // The leaves fold back from the jambs, leaving the real entry free to walk through.
  for (const [x, sign] of [
    [0.21, 1],
    [f.l - 0.21, -1],
  ]) {
    const hinge = f.plan(x),
      end = f.plan(x + sign * 0.46, mid - 0.24),
      leaf = frame(hinge, end);
    for (const y of [0.27, 1.12, 2.48])
      g.bar('ink', '#414d48', leaf.point(0, y), leaf.point(leaf.l, y), 0.05, 6);
    for (let i = 0; i <= 10; i++) {
      const u = (i * leaf.l) / 10,
        top = 2.64 + 0.37 * Math.cos((i * Math.PI) / 10);
      g.bar('ink', '#46534d', leaf.point(u, 0.17), leaf.point(u, top), 0.033, 5);
      g.frustum('trim', '#8f8b67', leaf.plan(u), top, top + 0.17, 0.063, 0.007, 5);
      if (i % 2 === 0) {
        let a = leaf.point(u, 2.36);
        for (let j = 1; j <= 12; j++) {
          const angle = (j * Math.PI) / 6;
          const b = leaf.point(u + 0.14 * Math.sin(angle), 2.52 - 0.16 * Math.cos(angle));
          g.bar('ink', '#46534d', a, b, 0.025, 5);
          a = b;
        }
      }
    }
  }
}
function martyrsSetts(g, center) {
  const f = frame(center, [center[0] + 0.97, center[1] - 0.23]);
  for (let i = -3; i <= 3; i++)
    for (const row of i === 0 ? [0] : [0, 1]) {
      const u = row ? 0 : i * 0.29,
        n = row ? i * 0.29 : 0;
      g.block(
        'ragstone',
        i % 2 ? '#686c65' : '#71736c',
        f,
        u - 0.137,
        u + 0.137,
        0.035,
        0.068,
        n - 0.137,
        n + 0.137,
      );
    }
}
function streetTerrace(g, id) {
  const west = id === 'balliol',
    f = west ? frame([-765.0, -262.55], [-721.4, -266.4]) : frame([-680.4, -282.25], [-632.7, -292.05]);
  for (const u of [1.8, 12.0, 24.1, 36.8]) {
    for (const [y0, y1, w, d, c] of [
      [0.04, 0.17, 1.52, 0.58, '#777a6b'],
      [0.17, 0.71, 1.62, 0.67, '#908a71'],
      [0.68, 0.75, 1.7, 0.7, '#a99a7b'],
    ])
      g.block('trim', c, f, u - w, u + w, y0, y1, -d, d);
    g.block('paving', '#8d8167', f, u - 1.58, u + 1.58, 0.75, 0.77, -0.59, 0.59);
    for (let j = -4; j <= 4; j++) {
      const p = f.plan(u + j * 0.34, 0.24 * Math.sin(j * 2.79)),
        h = 0.48 + 0.13 * Math.cos(j * 4.1);
      g.frustum('grass', '#859379', p, 0.75, 0.75 + h, 0.22, 0.25, 7);
      g.frustum('grass', j % 2 ? '#98a586' : '#879578', p, 0.75 + h, 0.9 + h, 0.25, 0.045, 7);
    }
    if (u < 35) bench(g, f.plan(u + 4.15, -0.9), Math.atan2(f.uz, f.ux));
  }
  if (west) lantern(g, [-751.3, -277.35], 4.35);
}
function stuartPier(g, ring) {
  const b = orientedBox(ring),
    p = b.at(b.L / 2, b.W / 2);
  g.prism('stone', honey, ring, 0, 3.49);
  for (const f of edges(ring)) if (f.l > 0.45) course(g, f, 3.48, 0.19, 0.2);
  g.frustum('stone', cream, p, 3.68, 4.46, 0.53, 0.46, 8);
  g.frustum('fine', ivory, p, 4.45, 5.26, 0.45, 0.14, 8);
}
function bookshopFascia(group, ring) {
  const f = edges(ring)
    .filter((f) => f.nz > 0.68)
    .sort((a, b) => b.l - a.l)[0];
  if (!f || f.l < 3.2) return;
  const board = document.createElement('canvas');
  board.width = 1024;
  board.height = 96;
  const ctx = board.getContext('2d');
  ctx.fillStyle = '#334753';
  ctx.fillRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#e3d3a3';
  ctx.font = '54px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B L A C K W E L L', 512, 49);
  const texture = new T.CanvasTexture(board);
  texture.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(
    new T.PlaneGeometry(Math.min(7.35, f.l * 0.91), 0.63),
    new T.MeshLambertMaterial({ map: texture }),
  );
  sign.position.fromArray(f.point(f.l * 0.5, 3.08, 0.172));
  sign.rotation.y = Math.atan2(f.nx, f.nz);
  group.add(sign);
}
function gardenArch(g, group, path) {
  const q = path[0],
    f = frame([q[0] - 6 * 0.918, q[1] + 6 * 0.397], [q[0] + 6 * 0.918, q[1] - 6 * 0.397]);
  const leaf = new T.MeshLambertMaterial({
    color: '#78916e',
    flatShading: true,
    transparent: true,
    depthWrite: false,
  });
  const flower = new T.MeshLambertMaterial({ color: '#c2724c', transparent: true, depthWrite: false });
  const green = new T.Color('#78916e'),
    ochre = new T.Color('#a78b5c');
  const leaves = new T.InstancedMesh(new T.IcosahedronGeometry(0.16, 0), leaf, 200);
  const blooms = new T.InstancedMesh(new T.IcosahedronGeometry(0.071, 0), flower, 40);
  const dummy = new T.Object3D();
  let i = 0,
    j = 0;
  const place = (mesh, index, p, x, y, z) => {
    dummy.position.fromArray(p);
    dummy.scale.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  };
  for (const direction of [-1, 1]) {
    let previous = f.point(6 + 1.83 * direction, 0.06, 0.27);
    for (let k = 0; k < 50; k++) {
      const t = k / 49,
        u = 6 + direction * (1.82 + (t < 0.54 ? 0.28 * Math.sin(t * 13) : (t - 0.54) * 5.7)),
        y = t < 0.54 ? 0.16 + t * 7.72 : 4.33 + 0.34 * Math.sin(t * 14),
        d = 0.3 + 0.11 * Math.sin(t * 22);
      const next = f.point(u, y, d);
      g.bar('trim', '#786c54', previous, next, 0.052 + (1 - t) * 0.032, 5);
      previous = next;
      for (let a = 0; a < 2; a++)
        place(
          leaves,
          i++,
          f.point(u + 0.17 * Math.sin(k * 1.89 + a * 3), y + 0.24 * Math.cos(k * 2.73 + a * 3), d + 0.12),
          1.25,
          0.84,
          0.85,
        );
      if (k % 3 === 0) place(blooms, j++, f.point(u + 0.08, y + 0.1, d + 0.25), 1.2, 1, 0.94);
    }
  }
  blooms.count = j;
  leaves.count = i;
  group.add(leaves, blooms);
  return (weights) => {
    leaf.color.copy(green).lerp(ochre, weights[2]);
    leaf.opacity = 1 - weights[3] - 0.28 * weights[0];
    flower.opacity = weights[1];
    leaves.visible = leaf.opacity > 0.005;
    blooms.visible = flower.opacity > 0.005;
  };
}
export function buildBroadStreet(g, id, q, records, group) {
  const clocks = [];
  for (const [key, rings, ...rest] of records) {
    const s = q.buildings[key],
      kind = s?.family;
    if (!Object.hasOwn(broadHeights, kind)) continue;
    if (kind === 'balliolGate' || kind === 'trinityTower') gateTower(g, [key, rings, ...rest], s, clocks);
    else if (['butterfield', 'balliolHall', 'trinityChapel'].includes(kind)) chapel(g, rings, kind);
    else if (['weston', 'bookshop', 'levine'].includes(kind)) {
      modern(g, rings, kind);
      if (kind === 'bookshop') bookshopFascia(group, rings[0]);
    } else if (kind === 'stuart') stuartPier(g, rings[0]);
    else if (kind !== 'broadIron') {
      const parts = key === 'w23184300' ? q.gardenRoofs : key === 'w23184387' ? q.jacksonRoofs : null;
      for (const part of parts ? Object.values(parts).flat() : [rings]) range(g, part, s, kind);
    }
  }
  streetTerrace(g, id);
  if (id === 'balliol') martyrsSetts(g, q.martyrsCross);
  else {
    ironGates(g, q.gate);
    g.prism('fine', '#d5c7a8', q.durhamLawn, 0.04, 0.25);
    g.cap('grass', '#9eae81', q.durhamLawn, 0.26);
    for (const f of faces(q.durhamLawn)) g.block('fine', ivory, f, 0, f.l, 0.215, 0.275, -0.18, 0.17);
  }
  const vine = id === 'trinity' ? gardenArch(g, group, q.buildings.w23184300.passages[0]) : null;
  if (!clocks.length && !vine) return null;
  const hands = [];
  const metal = new T.MeshLambertMaterial({ color: '#e3c384' });
  for (const [f, u, y] of clocks) {
    const anchor = new T.Group();
    anchor.position.fromArray(f.point(u, y, 0.41));
    anchor.rotation.y = Math.atan2(f.nx, f.nz);
    group.add(anchor);
    for (const minute of [false, true]) {
      const length = minute ? 0.77 : 0.53,
        hand = new T.Mesh(
          new T.BoxGeometry(minute ? 0.054 : 0.085, length, 0.04).translate(0, length / 2, 0),
          metal,
        );
      anchor.add(hand);
      hands.push({ hand, minute });
    }
  }
  return (hour, weights) => {
    for (const { hand, minute } of hands) hand.rotation.z = -2 * Math.PI * (minute ? hour : hour / 12);
    vine?.(weights);
  };
}
