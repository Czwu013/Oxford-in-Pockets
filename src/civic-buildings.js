import * as T from 'three';
import {
  axes,
  stone,
  cut,
  warm,
  slate,
  course,
  roofBody,
  reveal,
  arch,
  pediment,
  ionic,
  rows,
  gabledBay,
} from './civic-masonry.js';
import { atmosphere, batch, local, ridgeRoof } from './palette.js';
import { atY, faces, frame, orientedBox } from './magdalen/architecture/geometry.js';
import {
  buttress,
  coping,
  lancet,
  merlons,
  pinnacle,
  sash,
  statue,
} from './magdalen/architecture/masonry.js';
import { fence, lantern, lanternSites } from './street-craft.js';

export const museumFrame = axes([-938.65, -384.97], 0.9732, -0.2294),
  hallFrame = axes([-748.32, 38.03], 0.315, 0.949);
const civicFamilies = new Set(['ashMuseum', 'taylor', 'randolph', 'maryMagdalen', 'carfaxTower', 'townHall']);
export const isCivicLandmark = (family) => civicFamilies.has(family);
const rectAt = (f, u, d, w, depth) => [
  f.plan(u - w / 2, d - depth / 2),
  f.plan(u + w / 2, d - depth / 2),
  f.plan(u + w / 2, d + depth / 2),
  f.plan(u - w / 2, d + depth / 2),
];
function historicalWing(g, shapes) {
  roofBody(g, shapes, 15.15, 2.15, '#d9c8a9', '#8b8d88', (f, h) => {
    if (f.l < 8) return false;
    const n = Math.max(2, Math.round(f.l / 4.35));
    rows(g, f, h, n, '#d9c8a9', 3);
    for (const y of [1.02, 5.08, 10.1, 14.25]) course(g, f, y, 0.18, 0.27);
    for (let i = 0; i <= n; i++) {
      const u = (i * f.l) / n;
      g.block('fine', cut, f, u - 0.17, u + 0.17, 5.43, 14.23, 0, 0.19);
    }
    return true;
  });
}
function portico(g, group, q) {
  const p = museumFrame,
    vol = q.museumVolumes;
  // The front range turns in at both wings. All portions keep the ring and courtyard voids.
  roofBody(g, vol.rear, 15.35, 1.75, '#cbbda8', '#859091', (f, h) => {
    if (f.l < 5.2) return false;
    rows(g, f, h, Math.max(1, Math.round(f.l / 5.6)), '#cfc2ac', 3);
    return true;
  });
  // The later roof lanterns belong to the rear galleries.
  for (const [a, b, w, d] of [
    [-22, -37, 13, 7],
    [2, -31, 12, 6],
    [-9, -21, 8, 4],
  ]) {
    const ring = p.rect(a - w / 2, b - d / 2, a + w / 2, b + d / 2);
    g.prism('lead', '#778687', ring, 16.1, 17.35);
    ridgeRoof(g, [ring], 17.4, 1.62, '#a3b6b7', cut, 'skylight');
    for (let i = -w / 2; i <= w / 2; i += 1.36)
      for (const side of [-1, 1])
        g.bar(
          'lead',
          '#899397',
          atY(p.point(a + i, b), 19.04),
          atY(p.point(a + i, b + side * d * 0.5), 17.39),
          0.048,
          4,
        );
  }
  historicalWing(g, vol.west);
  roofBody(g, vol.annex, 13.3, 2.45, '#cfc4b0', slate, (f, h) => {
    if (f.l < 7) return false;
    rows(g, f, h, Math.round(f.l / 4.7), '#d2c4ad', 3);
    return true;
  });
  roofBody(g, vol.gallery, 12.06, 1.55, stone, slate);
  const facade = p.face(-21.55, -3.26, 23.55, -3.26);
  for (const y of [1.92, 7.64, 10.9, 11.66]) course(g, facade, y, 0.19, 0.26);
  for (const u of [-18.85, -14.4, -9.9, 10.42, 15.23, 20.12]) {
    const mid = u + 21.55;
    sash(g, facade, mid, 5.14, 2.97, 1.12, {
      color: cut,
      lights: 3,
      cross: 0,
      d: 0.09,
      lamp: u === -14.4 || u === 15.23,
    });
    g.block('trim', '#c69e71', facade, mid - 1.68, mid + 1.68, 7.08, 10.19, 0.035, 0.105);
    g.block('fine', '#d5b488', facade, mid - 1.48, mid + 1.48, 7.31, 9.97, 0.11, 0.135);
    for (let j = 0; j < 28; j++) {
      const a = (j * Math.PI) / 14,
        b = ((j + 1) * Math.PI) / 14;
      const petal = 0.64 + 0.045 * Math.sin(a * 8),
        next = 0.64 + 0.045 * Math.sin(b * 8);
      g.quad(
        'trim',
        '#a78864',
        facade.point(mid + Math.cos(a) * petal, 8.69 + Math.sin(a) * petal, 0.18),
        facade.point(mid + Math.cos(b) * next, 8.69 + Math.sin(b) * next, 0.18),
        facade.point(mid + Math.cos(b) * 0.43, 8.69 + Math.sin(b) * 0.43, 0.19),
        facade.point(mid + Math.cos(a) * 0.43, 8.69 + Math.sin(a) * 0.43, 0.19),
      );
    }
    for (const off of [-1.9, 1.9])
      g.block('fine', cut, facade, mid + off - 0.15, mid + off + 0.15, 2.1, 10.92, 0.02, 0.21);
    for (const yy of [2.56, 3.11, 3.68, 4.23])
      g.panel('trim', '#bda887', facade, mid - 1.78, mid + 1.78, yy, yy + 0.044, 0.048);
  }
  // Six Ionic shafts: four freestanding along the front, two returns toward the doors.
  // A separate soffit gives the porch an open volume all the way to its steps.
  const f = p.face(-6.64, -0.03, 6.64, -0.03),
    floor = 2.02,
    cap = 11.13;
  g.prism('fine', '#d7c8af', p.rect(-7.1, -4.19, 7.1, 0.96), 0.03, floor);
  for (let i = 0; i < 10; i++) {
    const edge = 1.0 + (10 - i) * 0.35;
    g.prism(
      'fine',
      i % 2 ? '#d6c6ab' : '#d0c1a9',
      p.rect(-7.15, 0.65, 7.15, edge),
      0.01,
      ((i + 1) * floor) / 10,
    );
  }
  for (const u of [1.02, 4.77, 8.51, 12.26]) ionic(g, f, u, 0.09, floor, cap - floor, 0.475);
  for (const u of [1.02, 12.26]) ionic(g, f, u, -2.42, floor, cap - floor, 0.46);
  for (const [y, h, w, d] of [
    [cap, 0.34, 7.06, 0.83],
    [11.45, 0.59, 7.14, 0.87],
    [12.04, 0.3, 7.34, 0.98],
  ])
    g.prism('fine', cut, p.rect(-w, -4.05, w, d), y, y + h);
  const fr = p.face(-7.3, 0.93, 7.3, 0.93);
  pediment(g, fr, 7.3, 14.65, 12.28, 2.04, cut, 0.065);
  for (const s of [-1, 1])
    g.quad(
      'roof',
      slate,
      atY(p.point(0, 1.01), 14.34),
      atY(p.point(7.39 * s, 1.01), 12.31),
      atY(p.point(7.39 * s, -4.16), 12.31),
      atY(p.point(0, -4.16), 14.34),
    );
  for (let i = 0; i < 45; i++)
    g.block('fine', warm, fr, (i * fr.l) / 45, (i * fr.l) / 45 + 0.13, 11.92, 12.05, 0.01, 0.19);
  for (let side of [-1, 1]) {
    let previous;
    for (let i = 0; i <= 42; i++) {
      const t = i / 42,
        a = t * Math.PI * 4.4,
        extent = 1 - t;
      const u = 7.3 + side * (0.82 + t * 5.05 + 0.24 * extent * Math.sin(a)),
        y = 12.51 + 0.75 * extent + 0.27 * extent * Math.cos(a);
      const v = fr.point(u, y, 0.18);
      if (previous) g.bar('fine', cut, previous, v, 0.083, 5);
      previous = v;
      if (i % 3 === 0)
        g.bar('fine', cut, v, fr.point(u + side * 0.18 * extent, y + 0.21 * extent, 0.23), 0.074, 5);
    }
  }
  for (let j = 0; j < 24; j++) {
    const a = (j * Math.PI) / 12,
      b = ((j + 1) * Math.PI) / 12;
    g.bar(
      'fine',
      cut,
      fr.point(7.3 + 0.64 * Math.cos(a), 13.1 + 0.56 * Math.sin(a), 0.2),
      fr.point(7.3 + 0.64 * Math.cos(b), 13.1 + 0.56 * Math.sin(b), 0.2),
      0.095,
      6,
    );
  }
  statue(g, fr, 7.3, 14.36, 1.78, -0.17);
  for (const end of [0.47, 14.13]) g.frustum('fine', warm, fr.plan(end, -0.11), 12.69, 13.23, 0.2, 0.34, 9);
  const doorway = p.face(-6.6, -3.22, 6.6, -3.22);
  for (const mid of [2.72, 10.48]) {
    g.block('fine', '#bc946a', doorway, mid - 1.28, mid + 1.28, 2.09, 9.18, 0.06, 0.17);
    g.block('fine', '#c7a377', doorway, mid - 1.1, mid + 1.1, 2.31, 8.92, 0.175, 0.184);
    for (const yy of [2.6, 3.17, 3.72])
      g.panel('trim', '#ac8c66', doorway, mid - 1.05, mid + 1.05, yy, yy + 0.032, 0.19);
  }
  sash(g, doorway, 6.6, 2.1, 3.12, 5.89, {
    d: 0.22,
    lights: 2,
    cross: 1,
    glass: '#495853',
    sill: false,
    trim: 0.16,
  });
  g.block('fine', cut, doorway, 4.82, 8.38, 8.06, 8.4, 0.05, 0.41);
  g.block('fine', warm, doorway, 4.92, 8.28, 8.41, 8.89, 0.05, 0.25);
  // Iron enclosure across the front garden, with openings on the approach axis.
  for (const s of [-1, 1]) {
    const pts = [p.point(s * 21.5, 18.1), p.point(s * 5.0, 18.1)];
    fence(g, pts, () => 0.16, 1.13);
    lantern(g, p.point(s * 4.55, 16.8), 3.4);
  }
}
function taylor(g, q) {
  const vol = q.taylorVolumes;
  historicalWing(g, vol.wing);
  roofBody(g, vol.rear, 12.5, 1.35, stone, slate, (f, h) => {
    if (f.l < 5) return false;
    rows(g, f, h, Math.max(1, Math.round(f.l / 4.1)), stone, 3);
    return true;
  });
  const f = museumFrame.face(38.4, 17.3, 38.15, -14.6);
  for (const u of [4.44, 11.72, 20.08, 27.5]) {
    const pt = f.plan(u, 1.1);
    g.prism('fine', cut, rectAt(f, u, 1.1, 1.78, 1.74), 0.08, 2.36);
    ionic(g, f, u, 1.1, 2.36, 11.6, 0.51);
    g.prism('fine', cut, rectAt(f, u, 1.1, 1.81, 1.67), 13.95, 14.47);
    statue(g, f, u, 14.48, 2.41, 1.1);
  }
}
function hotel(g, record) {
  const rings = record[1],
    h = 14.05;
  roofBody(g, [rings], h, 4.0, '#d1bba0', '#697c86', (f) => {
    if (f.l < 5) return false;
    const n = Math.max(1, Math.round(f.l / 4.2));
    rows(g, f, h, n, '#d1bea3', 4);
    for (let j = 0; j < n; j++) {
      const u = ((j + 0.5) * f.l) / n;
      if (f.nz < -0.55 && j % 2 === 0) {
        g.prism('fine', cut, rectAt(f, u, 0.02, 2.62, 1.37), h - 0.4, h + 1.12);
        pediment(g, f, u, 3.02, h + 1.12, 1.94, cut, 0.8);
        sash(g, f, u, h + 0.05, 1.54, 1.24, { d: 0.73, lights: 2, cross: 1 });
      }
    }
    return true;
  });
  for (const f of faces(rings[0]).filter((e) => e.nz < -0.55 && e.l > 10)) {
    const p = f.plan(f.l * 0.34, -1.91);
    g.prism('brick', '#ab8871', rectAt(f, f.l * 0.34, -1.91, 1.43, 0.85), h + 0.2, h + 5.09);
    g.frustum('trim', '#9e8069', p, h + 5.05, h + 5.78, 0.3, 0.25, 6);
  }
}
function church(g, record) {
  const [r] = record[1],
    box = orientedBox(r);
  roofBody(g, [[r]], 8.65, 4.5, '#b6a58e', '#79878c', (f) => {
    g.panel('rubble', '#b8ac96', f, 0, f.l, 0, 8.65);
    if (f.l > 5) {
      const n = Math.max(1, Math.round(f.l / 4.85));
      for (let j = 0; j < n; j++) {
        lancet(g, f, ((j + 0.5) * f.l) / n, 1.8, Math.min((f.l / n) * 0.71, 2.7), 4.86, 3, { n: 8 });
        buttress(g, f, (j * f.l) / n + 0.26, 0, 6.7, 0.5, 0.6);
      }
    }
    return true;
  });
  // The tower stands at the western end of the nave, next to Magdalen Street.
  const minX = Math.min(...r.map((p) => p[0])),
    west = r.filter((p) => p[0] < minX + 7.0);
  const x = west.reduce((s, p) => s + p[0], 0) / west.length + 2.22,
    z = west.reduce((s, p) => s + p[1], 0) / west.length;
  const p = axes([x, z], box.ux, box.uz),
    base = p.rect(-3.55, -3.55, 3.55, 3.55);
  g.prism('rubble', '#baad95', base, 0.05, 16.1);
  for (const f of faces(base)) {
    lancet(g, f, f.l / 2, 10.1, 2.55, 4.55, 2, { n: 7, glass: '#68716a' });
    coping(g, f, 15.9);
    merlons(g, f, 16.15, 6, 0.57, 0.32, stone);
  }
}
function memorial(g, q) {
  const p = q.memorial,
    triangle = (r) =>
      [0, 1, 2].map((i) => [
        p[0] + r * Math.cos(0.32 + (i * Math.PI * 2) / 3),
        p[1] + r * Math.sin(0.32 + (i * Math.PI * 2) / 3),
      ]);
  for (const [lo, hi, r0, r1] of [
    [0.02, 0.28, 4.44, 4.44],
    [0.28, 0.57, 4.1, 4.1],
    [0.57, 0.85, 3.76, 3.76],
    [0.85, 1.1, 3.42, 3.42],
    [1.1, 5.25, 3.05, 2.86],
    [5.25, 5.66, 3.1, 2.75],
    [5.66, 9.83, 2.57, 2.17],
    [9.83, 10.22, 2.62, 2.1],
    [10.22, 15.14, 2.1, 1.21],
    [15.14, 15.5, 1.55, 1.3],
    [15.5, 21.22, 1.3, 0.12],
  ]) {
    g.frustum('fine', lo < 1.1 ? '#a89f89' : '#c1b49b', p, lo, hi, r0, r1, 3, 0.32);
  }
  for (const f of faces(triangle(2.84))) {
    const u = f.l / 2;
    lancet(g, f, u, 1.5, 2.76, 3.22, 3, { n: 7, glass: '#8a8d80' });
    statue(g, f, u, 5.61, 2.9, -0.04);
    pediment(g, f, u, 2.49, 8.57, 1.52, cut, 0.32);
    for (const s of [-1, 1]) {
      const t = f.plan(u + s * 1.1, 0.02);
      g.frustum('fine', cut, t, 5.65, 8.95, 0.13, 0.11, 8);
    }
    for (const [y, h, r, radius] of [
      [4.9, 4.55, 0.46, 2.75],
      [9.82, 4.18, 0.31, 2.12],
      [14.8, 2.33, 0.21, 1.27],
    ]) {
      const v = [p[0] + ((f.a[0] - p[0]) * radius) / 2.84, p[1] + ((f.a[1] - p[1]) * radius) / 2.84];
      g.frustum('fine', warm, v, y - 0.57, y + 0.07, r * 0.68, r * 1.18, 6);
      pinnacle(g, v, y, h, r, { color: cut });
    }
  }
  const y = 21.82;
  g.bar('fine', cut, atY(p, 21.06), atY(p, 22.2), 0.09, 7);
  g.bar('fine', cut, [p[0] - 0.29, y, p[1]], [p[0] + 0.29, y, p[1]], 0.075, 6);
}
function townHall(g, q) {
  const p = hallFrame,
    vol = q.hallVolumes;
  roofBody(g, vol.rear, 9.8, 2.6, '#bba28b', '#947e72', (f, h) => {
    if (f.l < 6) return false;
    rows(g, f, h, Math.max(1, Math.round(f.l / 4.9)), '#b49a84', 2);
    return true;
  });
  roofBody(g, vol.main, 13.1, 6.1, '#ad8d78', '#74828b');
  roofBody(g, vol.assembly, 14, 3.7, '#c9b99b', slate);
  roofBody(g, vol.front, 13.65, 3.26, stone, slate, (f, h) => {
    const mid = p.local(f.plan(f.l / 2));
    if (mid[1] > -1.5 && f.l > 3.5) return true;
    if (f.l > 4) {
      rows(g, f, h, Math.max(1, Math.round(f.l / 4.2)), stone, 3);
      return true;
    }
    return false;
  });
  const front = p.face(-23.12, 0.02, 30.31, 0.02),
    door = 25.4;
  frontWall(g, front, door);
  for (const u of [6.0, 13.25, 37.63, 45.8]) gabledBay(g, front, u, 13.35, 6.8, 4.29);
  for (const u of [door - 8.15, door + 8.15, front.l - 1.0]) {
    const pt = front.plan(u, 0.19);
    g.frustum('fine', warm, pt, 3.26, 5.12, 0.37, 1.15, 8, 0.2);
    g.frustum('fine', stone, pt, 5.12, 13.79, 1.15, 1.15, 8, 0.2);
    for (const yy of [5.24, 11.5, 13.78]) g.frustum('fine', cut, pt, yy, yy + 0.22, 1.27, 1.25, 8, 0.2);
    g.frustum('lead', '#72858a', pt, 14.0, 15.3, 1.2, 0.7, 8, 0.2);
    g.frustum('fine', cut, pt, 15.28, 15.91, 0.24, 0.04, 8, 0.2);
    for (const yy of [7.25, 9.3]) sash(g, front, u, yy, 0.63, 1.18, { lights: 1, cross: 1, d: 1.25 });
  }
  for (let i = 0; i < 14; i++)
    arch(g, front, door - 7.18 + i * 1.1, 13.48, 0.64, 0.77, { depth: 0.12, rise: 0.3 });
  const lanternAt = p.point(1.85, -7.0);
  for (const [a, b, lo, hi, mat] of [
    [16.5, 17.84, 1.5, 1.32, 'lead'],
    [17.83, 19.0, 0.93, 0.9, 'fine'],
    [18.98, 19.75, 1.0, 0.56, 'lead'],
    [19.72, 20.55, 0.54, 0.12, 'lead'],
  ])
    g.frustum(mat, mat === 'lead' ? '#76948c' : cut, lanternAt, a, b, lo, hi, 8);
  g.bar('trim', warm, atY(lanternAt, 20.48), atY(lanternAt, 21.14), 0.055, 6);
}
function frontWall(g, f, door) {
  const h = 13.65;
  g.panel('stone', '#baa88d', f, 0, f.l, 0, h, -1.38);
  const breaks = [0, 8.48, 16.9, 22.53, 28.27, 33.76, 41.34, 49.16, f.l];
  breaks.slice(1).forEach((end, i) => {
    const a = breaks[i],
      width = end - a,
      mid = (end + a) / 2,
      central = i >= 2 && i <= 4;
    const w = Math.min(width * 0.73, central ? 4.3 : 4.55),
      left = mid - w / 2,
      right = mid + w / 2;
    g.panel('stone', stone, f, a, left, 0, h);
    g.panel('stone', stone, f, right, end, 0, h);
    const doorBay = i === 3,
      base = doorBay ? 0.33 : 1.0,
      top = 5.24;
    if (!doorBay) g.panel('stone', stone, f, left, right, 0, base);
    arch(g, f, mid, base, w, top - base, {
      door: doorBay,
      depth: doorBay ? 1.28 : 0.43,
      lights: 4,
      rise: 1.37,
    });
    if (doorBay)
      for (let s = 0; s < 3; s++)
        g.block('fine', cut, f, left - 0.08, right + 0.08, s * 0.11, (s + 1) * 0.11, 0, 0.86 - 0.25 * s);
    g.panel('stone', stone, f, left, right, top + 0.31, 6.25);
    reveal(g, f, mid, 6.26, w, 5.56, 4, 3, 0.035, cut);
    g.panel('stone', stone, f, left, right, 11.87, h);
    if (central) {
      g.block('fine', cut, f, left - 0.16, right + 0.16, 6.03, 6.24, -0.03, 0.31);
      for (const u of [a + 0.21, end - 0.21])
        g.block('fine', cut, f, u - 0.14, u + 0.14, 5.8, 12.65, -0.025, 0.26);
    }
  });
  for (const yy of [0.71, 5.67, 12.65, 13.37]) course(g, f, yy, 0.22, yy > 12 ? 0.44 : 0.26);
  // Projecting carved entrance and the small balcony above it, both visible in oblique light.
  const portal = door;
  for (const s of [-1, 1]) {
    const u = portal + s * 2.79,
      pt = f.plan(u, 0.39);
    g.prism('fine', warm, rectAt(f, u, 0.39, 0.7, 0.77), 0.26, 1.02);
    g.frustum('fine', cut, pt, 1.01, 4.56, 0.29, 0.23, 12);
    g.frustum('fine', warm, pt, 4.56, 4.92, 0.27, 0.43, 10);
    g.block('fine', cut, f, u - 0.42, u + 0.42, 4.91, 5.18, 0.05, 0.86);
    const torch = f.plan(portal + s * 3.57, 0.62);
    g.bar('ink', '#514c43', f.point(portal + s * 3.57, 3.03, 0.14), atY(torch, 3.38), 0.055, 6);
    g.frustum('ink', '#59554c', torch, 3.35, 3.42, 0.15, 0.16, 4, 0.785);
    g.frustum('lamp', '#c8bb95', torch, 3.42, 3.88, 0.16, 0.21, 4, 0.785);
    g.frustum('ink', '#545550', torch, 3.87, 4.03, 0.245, 0.04, 4, 0.785);
    lanternSites.push([torch[0], 3.65, torch[1]]);
  }
  for (const [y, w, d] of [
    [5.12, 3.48, 0.94],
    [5.32, 3.61, 1.04],
    [5.57, 3.47, 0.96],
  ])
    g.block('fine', cut, f, portal - w, portal + w, y, y + 0.19, 0.07, d);
  for (let j = -7; j <= 7; j++)
    g.frustum('fine', warm, f.plan(portal + j * 0.445, 0.84), 5.75, 6.32, 0.104, 0.078, 8);
  g.block('fine', cut, f, portal - 3.5, portal + 3.5, 6.31, 6.49, 0.51, 1.02);
  const shield = [
    [0, 5.71],
    [-0.49, 6.03],
    [-0.56, 6.81],
    [0.56, 6.81],
    [0.49, 6.03],
  ];
  for (let j = 1; j < shield.length - 1; j++) {
    const toWorld = (v) => f.point(portal + v[0], v[1], 1.07);
    g.tri('fine', warm, toWorld(shield[0]), toWorld(shield[j]), toWorld(shield[j + 1]));
  }
  for (let j = 0; j < 5; j++) {
    const v = shield[j],
      w = shield[(j + 1) % 5];
    g.bar('fine', cut, f.point(portal + v[0], v[1], 1.09), f.point(portal + w[0], w[1], 1.09), 0.061, 5);
  }
  for (const u of [door - 7.0, door + 7.0, door - 2.75, door + 2.75])
    for (const yy of [6.05, 8.03, 10.11, 12.14]) {
      g.block('fine', warm, f, u - 0.29, u + 0.29, yy, yy + 0.19, 0.09, 0.38);
      g.frustum('fine', cut, f.plan(u, 0.2), yy + 0.16, yy + 0.53, 0.2, 0.12, 8);
    }
  gabledBay(g, f, door, 13.56, 3.08, 2.22);
  for (const u of [door - 5.34, door + 5.34]) statue(g, f, u, 13.58, 1.23, 0.12);
}
function clockTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d3c5ad';
  ctx.fillRect(0, 0, 384, 384);
  ctx.translate(192, 192);
  ctx.fillStyle = '#26333d';
  ctx.beginPath();
  ctx.arc(0, 0, 174, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#efeee0';
  ctx.beginPath();
  ctx.arc(0, 0, 163, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#39444b';
  ctx.lineWidth = 5;
  for (const [rad, width] of [
    [106, 7],
    [162, 4],
    [173, 6],
  ]) {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#212a30';
  ctx.font = 'bold 42px Georgia';
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(-1, -170, i % 5 ? 2 : 4, i % 5 ? 6 : 10);
    ctx.restore();
    if (i % 5 === 0) {
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -133);
      ctx.scale(0.78, 1.22);
      ctx.fillText(roman[i / 5], 0, 0);
      ctx.restore();
    }
  }
  for (const x of [-1, 1])
    for (const y of [-1, 1]) {
      ctx.strokeStyle = '#b89d65';
      ctx.lineWidth = 3;
      ctx.strokeRect(x * 169 - 10, y * 169 - 10, 20, 20);
    }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function clocks(g, group, record) {
  const [r] = record[1],
    h = record[2];
  // An east-facing wall split by the map nodes at the steeple jambs.
  const f = frame([-801.41, -3.58], [-804.26, -11.2], -1),
    mid = f.l / 2;
  g.prism('rubble', '#c3b296', r, 0.02, h - 0.7);
  const b = orientedBox(r),
    c = b.at(b.L / 2, b.W / 2);
  const base = axes(c, f.nx, f.nz).rect(-3.16, -3.52, 3.18, 3.53);
  for (const side of faces(base)) {
    for (const y of [6.8, 13.0, 18.5, 22.1]) coping(g, side, y, { width: 0.21, color: cut });
    const u = side.l / 2;
    lancet(g, side, u, 17.75, 2.36, 3.21, 2, { n: 12, d: 0.21, glass: '#505b55' });
    for (const off of [-0.53, 0.53])
      for (let s = 0; s < 8; s++)
        g.block(
          'trim',
          '#717363',
          side,
          u + off - 0.39,
          u + off + 0.39,
          17.93 + s * 0.26,
          18.02 + s * 0.26,
          0.255,
          0.3,
        );
    merlons(g, side, h - 0.64, 6, 0.64, 0.42, stone);
    for (const s of [0.41, side.l - 0.41]) buttress(g, side, s, 0.12, 16.45, 0.53, 0.39);
  }
  const dialY = 14.34;
  g.block('fine', cut, f, mid - 1.85, mid + 1.85, 12.54, 16.05, 0.22, 0.67);
  const dialMap = clockTexture(),
    dialStone = new T.MeshLambertMaterial({
      name: 'Carfax clock enamel',
      map: dialMap,
      emissiveMap: dialMap,
      emissive: new T.Color('#ffe6bd'),
      emissiveIntensity: 0,
      side: T.DoubleSide,
      vertexColors: true,
    });
  local['civic-clock'] = dialStone;
  g.mappedQuad(
    'civic-clock',
    '#fff9ed',
    [
      f.point(mid - 1.57, dialY - 1.57, 0.69),
      f.point(mid + 1.57, dialY - 1.57, 0.69),
      f.point(mid + 1.57, dialY + 1.57, 0.69),
      f.point(mid - 1.57, dialY + 1.57, 0.69),
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );
  lancet(g, f, mid, 17.72, 2.29, 3.18, 2, { n: 13, d: 0.26, glass: '#444e49' });
  for (const off of [-0.52, 0.52])
    for (let j = 0; j < 7; j++)
      g.block(
        'trim',
        '#626761',
        f,
        mid + off - 0.4,
        mid + off + 0.4,
        17.89 + j * 0.28,
        17.98 + j * 0.28,
        0.4,
        0.48,
      );
  pediment(g, f, mid, 4.1, 16.06, 1.14, cut, 0.71);
  g.block('trim', '#675742', f, mid - 1.58, mid + 1.58, 9.81, 12.09, 0.24, 0.43);
  for (const y of [9.73, 12.04]) g.block('fine', cut, f, mid - 1.91, mid + 1.91, y, y + 0.25, 0.1, 1.35);
  for (const d of [-1.57, 1.57]) g.frustum('fine', cut, f.plan(mid + d, 1.06), 9.95, 12.07, 0.116, 0.125, 10);
  const moving = new T.Group();
  moving.name = 'Carfax · hands and quarter jacks';
  const q = f.plan(mid, 0.73);
  moving.position.set(q[0], dialY, q[1]);
  moving.rotation.y = Math.atan2(-f.uz, f.ux);
  group.add(moving);
  const brass = new T.MeshLambertMaterial({ color: '#ad8b50' }),
    handPaint = new T.MeshLambertMaterial({ color: '#29343b' }),
    hands = [];
  // Use the east-facing wall's plane directly, including its handedness.
  const orientation = new T.Matrix4().makeBasis(
    new T.Vector3(f.ux, 0, f.uz),
    new T.Vector3(0, 1, 0),
    new T.Vector3(f.nx, 0, f.nz),
  );
  moving.rotation.set(0, 0, 0);
  moving.matrixAutoUpdate = false;
  moving.matrix.copy(orientation).setPosition(q[0], dialY, q[1]);
  for (const [length, w] of [
    [0.81, 0.075],
    [1.18, 0.049],
  ]) {
    const pivot = new T.Group(),
      blade = new T.Mesh(new T.BoxGeometry(w, length, 0.035), handPaint);
    blade.position.set(0, length * 0.39, 0.07);
    pivot.add(blade);
    moving.add(pivot);
    hands.push(pivot);
  }
  const arms = [];
  for (const [index, sign] of [-1, 1].entries()) {
    const u = mid + sign * 1.0,
      feet = f.plan(u, 0.83),
      coat = index ? '#a57768' : '#aa7666';
    for (const off of [-0.075, 0.075])
      g.frustum('trim', '#d8cbb8', f.plan(u + off, 0.83), 10.0, 10.43, 0.066, 0.055, 6);
    g.frustum('trim', coat, feet, 10.38, 10.86, 0.2, 0.13, 8);
    g.frustum('fine', '#d1b492', feet, 10.85, 11.11, 0.115, 0.102, 8);
    g.frustum('trim', '#ae8d55', feet, 11.09, 11.22, 0.144, 0.08, 8);
    const bell = f.plan(mid + sign * 0.47, 0.98),
      factor = index ? 1.34 : 0.98;
    for (const [a, b, ra, rb] of [
      [10.79, 10.88, 0.245, 0.204],
      [10.88, 11.18, 0.204, 0.108],
      [11.18, 11.24, 0.108, 0.068],
    ])
      g.frustum('trim', '#b79b5c', bell, a, b, ra * factor, rb * factor, 12);
    g.bar('ink', '#4b514b', atY(bell, 11.23), atY(bell, 11.89), 0.047, 5);
    const arm = new T.Group();
    arm.position.set(sign * 1.0, 10.79 - dialY, 0.24);
    moving.add(arm);
    const sleeve = new T.Mesh(
      new T.BoxGeometry(0.31, 0.095, 0.11),
      new T.MeshLambertMaterial({ color: coat }),
    );
    sleeve.position.set(-sign * 0.135, 0.015, 0);
    arm.add(sleeve);
    const stick = new T.Mesh(new T.BoxGeometry(0.3, 0.04, 0.05), brass);
    stick.position.set(-sign * 0.36, 0.09, 0.015);
    arm.add(stick);
    const hammer = new T.Mesh(new T.SphereGeometry(0.087, 7, 5), brass);
    hammer.position.set(-sign * 0.52, 0.1, 0.016);
    arm.add(hammer);
    arms.push(arm);
  }
  return (hour) => {
    dialStone.emissiveIntensity = 0.27 * atmosphere.night.value;
    hands[0].rotation.z = (-2 * Math.PI * hour) / 12;
    hands[1].rotation.z = -2 * Math.PI * hour;
    // Every quarter of the shared simulated clock; the two figures take turns.
    const phase = (((hour * 4) % 1) + 1) % 1;
    for (let i = 0; i < 2; i++) {
      const t = (phase - 0.021 * i) / 0.032;
      arms[i].rotation.z = (i ? 1 : -1) * (0.18 + (t >= 0 && t < 1 ? 0.79 * Math.sin(Math.PI * t) : 0));
    }
  };
}
export function buildCivicDetails(group, id, q, records) {
  const g = batch();
  let update = null;
  for (const record of records) {
    switch (q.buildings[record[0]]?.family) {
      case 'ashMuseum':
        portico(g, group, q);
        break;
      case 'taylor':
        taylor(g, q);
        break;
      case 'randolph':
        hotel(g, record);
        break;
      case 'maryMagdalen':
        church(g, record);
        break;
      case 'townHall':
        townHall(g, q);
        break;
      case 'carfaxTower':
        update = clocks(g, group, record);
        break;
    }
  }
  if (id === 'ashmolean') memorial(g, q);
  g.finish(group, 'Individually modelled civic architecture');
  return update;
}
