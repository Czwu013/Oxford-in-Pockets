import { atY, clean, faces, frame, orientedBox } from './magdalen/architecture/geometry.js';
import { buttress, merlons, openBay, pinnacle, statue } from './magdalen/architecture/masonry.js';
import { wallWithWindows } from './magdalen/architecture/deep-windows.js';
import { arch, course, ionic, pediment, reveal } from './civic-masonry.js';
import { dormer, mappedPortal, sideOf, windowRows } from './college-masonry.js';
import { ridgeRoof } from './palette.js';

const portland = '#e2d4b7',
  freestone = '#cdb799',
  ochre = '#bca385',
  chalk = '#e6d7b9';
const gray = '#78848a',
  lead = '#828d8c',
  roofStone = '#8b8678',
  brick = '#ad7765';
export const highHeights = {
  queensFront: 18.3,
  queensHall: 17.6,
  queensChapel: 17.7,
  queensBell: 26.2,
  queensLibrary: 17.2,
  queensBack: 14.8,
  queensLodge: 5.3,
  stPeter: 21.5,
  carrodus: 14.8,
  univFront: 22.6,
  univRange: 15.5,
  univChapel: 18.4,
  univHall: 18.4,
  logicBridge: 11.65,
  durham: 17.7,
  exams: 24.4,
};
const segment = (f, a, b) => frame(f.plan(a), f.plan(b), sideOf(f));
function sides(ring) {
  // GIS clipping may put two nodes a few centimetres apart at a real corner.
  // Re-evaluate the neighbours after each removal so the corner survives.
  const shape = clean(ring);
  while (shape.length > 3) {
    let best = -1,
      error = 0.125;
    for (let i = 0; i < shape.length; i++) {
      const a = shape[(i + shape.length - 1) % shape.length],
        b = shape[(i + 1) % shape.length],
        p = shape[i];
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
      if (d < error) {
        best = i;
        error = d;
      }
    }
    if (best < 0) break;
    shape.splice(best, 1);
  }
  return faces(shape);
}
function topCourses(g, f, h) {
  course(g, f, h - 0.64, 0.16, 0.2, freestone);
  course(g, f, h - 0.3, 0.28, 0.34, chalk);
}
function floorWindows(g, f, y0, y1, count, w, stone, cols = 2, rows = 3) {
  const pitch = f.l / count,
    sill = y0 + (y1 - y0) * 0.2,
    head = y1 - (y1 - y0) * 0.17;
  for (let i = 0; i < count; i++) {
    const a = i * pitch,
      b = a + pitch,
      mid = (a + b) / 2,
      half = Math.min(w * 0.5, pitch * 0.35);
    g.panel('stone', stone, f, a, mid - half, y0, y1);
    g.panel('stone', stone, f, mid + half, b, y0, y1);
    g.panel('stone', stone, f, mid - half, mid + half, y0, sill);
    g.panel('stone', stone, f, mid - half, mid + half, head, y1);
    reveal(g, f, mid, sill, half * 2, head - sill, cols, rows, 0, chalk);
    g.block('fine', freestone, f, mid - half - 0.18, mid + half + 0.18, head + 0.12, head + 0.23, -0.06, 0.2);
  }
}
function balusters(g, f, y) {
  course(g, f, y, 0.17, 0.23);
  course(g, f, y + 0.91, 0.15, 0.22);
  const n = Math.max(1, Math.round(f.l / 0.65));
  for (let i = 0; i < n; i++) {
    const p = f.plan(((i + 0.5) * f.l) / n, -0.12);
    g.frustum('fine', portland, p, y + 0.12, y + 0.36, 0.125, 0.092, 6);
    g.frustum('fine', portland, p, y + 0.36, y + 0.62, 0.092, 0.15, 6);
    g.frustum('fine', portland, p, y + 0.62, y + 0.94, 0.15, 0.09, 6);
  }
}
function arcadedFloor(g, f, h, n, pass, street = false) {
  const pitch = f.l / n;
  for (let i = 0; i < n; i++) {
    const a = i * pitch,
      b = (i + 1) * pitch;
    openBay(g, f, a, b, 0, h * 0.59, Math.min(h * 0.34, pitch * 0.37), h, 2.5, {
      round: true,
      cloister: true,
      wall: 0.59,
      pier: Math.min(pitch * 0.26, 1.12),
      noBack: pass,
      color: freestone,
    });
    for (const u of [a + 0.25, b - 0.25]) {
      g.block('fine', portland, f, u - 0.25, u + 0.25, h * 0.56, h * 0.61, -0.19, 0.15);
      if (street)
        for (let j = 1; j < 6; j++)
          g.block('fine', ochre, f, u - 0.2, u + 0.2, j * h * 0.088, j * h * 0.088 + 0.047, -0.02, 0.023);
    }
    if (street && !pass) g.panel('stone', '#c9b59a', f, a + 0.48, b - 0.48, 0.17, h * 0.56, -0.63);
  }
}
function cupola(g, p, base, r, high, figure) {
  const cornice = base + high * 0.55,
    spring = base + high * 0.37,
    n = 8;
  const ring = Array.from({ length: n }, (_, i) => [
    p[0] + r * Math.cos((i * Math.PI) / 4 + Math.PI / 8),
    p[1] + r * Math.sin((i * Math.PI) / 4 + Math.PI / 8),
  ]);
  g.frustum('fine', chalk, p, base - 0.17, base + 0.13, r * 1.14, r * 1.17, 24);
  for (const f of faces(ring)) {
    const u = f.l / 2;
    openRaisedArch(g, f, base + 0.1, spring, cornice, r * 0.17);
    g.frustum('fine', portland, f.a, base + 0.13, spring, r * 0.105, r * 0.088, 12);
    g.frustum('fine', chalk, f.a, spring - 0.17, spring + 0.1, r * 0.15, r * 0.16, 8);
    if (figure) g.frustum('fine', ochre, f.plan(u), cornice - 0.07, cornice + 0.18, r * 0.07, r * 0.1, 8);
  }
  if (figure) statue(g, frame([p[0] - 0.5, p[1]], [p[0] + 0.5, p[1]], -1), 0.5, base + 0.13, high * 0.49, 0);
  g.frustum('fine', portland, p, cornice - 0.06, cornice + 0.26, r * 1.13, r * 1.18, 32);
  const z = cornice + 0.25,
    dh = high * 0.4;
  for (let j = 0; j < 10; j++) {
    const a = (j * Math.PI) / 20,
      b = ((j + 1) * Math.PI) / 20;
    g.frustum(
      'lead',
      figure ? '#777d7e' : '#a29786',
      p,
      z + dh * Math.sin(a),
      z + dh * Math.sin(b),
      r * 1.12 * Math.cos(a),
      r * 1.12 * Math.cos(b),
      32,
    );
  }
  g.frustum('fine', portland, p, z + dh - 0.02, z + dh + 0.48, r * 0.09, r * 0.045, 9);
}
function openRaisedArch(g, f, base, spring, top, jamb) {
  // Closed spandrels and intrados, with empty air in the drum and below the bridge.
  const n = 14,
    w = f.l - 2 * jamb,
    rad = w * 0.5,
    rise = top - spring - 0.24;
  for (const a of [0, f.l - jamb]) g.block('fine', portland, f, a, a + jamb, base, top, -0.3, 0.03);
  for (let i = 0; i < n; i++) {
    const arc = (j) => {
      const t = (Math.PI * j) / n;
      return [f.l * 0.5 - rad * Math.cos(t), spring + rise * Math.sin(t)];
    };
    const [a, y] = arc(i),
      [b, v] = arc(i + 1);
    for (const d of [-0.3, 0.03])
      g.quad('stone', freestone, f.point(a, y, d), f.point(b, v, d), f.point(b, top, d), f.point(a, top, d));
    g.quad('fine', ochre, f.point(a, y, -0.3), f.point(a, y, 0.03), f.point(b, v, 0.03), f.point(b, v, -0.3));
  }
}
function queenWings(g, shapes, west) {
  for (const rings of shapes) {
    const h = 13.6;
    ridgeRoof(g, rings, h, 3.65, gray, portland);
    for (const f of sides(rings[0])) {
      if (f.l < 2) {
        g.panel('stone', portland, f, 0, f.l, 0, h);
        continue;
      }
      const court = (west ? f.nx > 0.8 : f.nx < -0.8) && f.l > 22;
      const count = Math.max(1, Math.round(f.l / (court ? 4.45 : 4.15)));
      if (court) {
        arcadedFloor(g, f, 4.72, count, false);
        floorWindows(g, f, 4.72, 9.6, count, 2.15, portland);
        floorWindows(g, f, 9.6, h, count, 2.05, portland);
        course(g, f, 4.8, 0.21, 0.19);
      } else windowRows(g, f, h, 3, 4.18, portland, true);
      topCourses(g, f, h);
      if (f.nz > 0.85 && f.l > 5.7) {
        pediment(g, f, f.l / 2, f.l + 0.22, h + 0.13, 2.7, chalk, 0.19);
        statue(g, f, f.l / 2, h + 2.88, 1.94, 0.03);
        for (const k of [0.1, 0.9]) statue(g, f, f.l * k, h + 0.4, 1.55, 0.08);
      }
    }
  }
}
function drawQueenFront(g, q) {
  const v = q.frontVolumes;
  queenWings(g, v.west, true);
  queenWings(g, v.east, false);
  for (const rings of v.rear) {
    g.cap('lead', lead, rings[0], 5.14, rings.slice(1));
    for (const f of sides(rings[0])) {
      if (f.l > 7) arcadedFloor(g, f, 5.12, Math.max(2, Math.round(f.l / 4.25)), false, f.nz > 0.7);
      else g.panel('stone', freestone, f, 0, f.l, 0, 5.12);
      topCourses(g, f, 5.14);
      if (f.l > 7) balusters(g, f, 5.15);
    }
  }
  const axis = frame([-318.12, -98.8], [-317.57, -105.77]);
  const centre = axis.plan(axis.l * 0.5);
  const doorFace = (distance, sign) =>
    frame(axis.plan(distance, sign * 3.5), axis.plan(distance, -sign * 3.5));
  const street = doorFace(0, -1),
    court = doorFace(axis.l, 1);
  for (const f of [street, court]) {
    openBay(g, f, 0, f.l, 0, 3.12, 2.07, 6.2, 2.8, {
      round: true,
      wall: 0.86,
      pier: 1.87,
      noBack: true,
      color: portland,
    });
    topCourses(g, f, 6.21);
    for (const u of [0.43, f.l - 0.43]) ionic(g, f, u, 0.12, 0.09, 4.7, 0.27);
  }
  for (const sign of [-1, 1]) {
    const flank = frame(axis.plan(0.1, sign * 3.5), axis.plan(axis.l - 0.1, sign * 3.5));
    g.panel('stone', freestone, flank, 0, flank.l, 0, 6.21);
    g.panel('ragstone', ochre, axis, 0, axis.l, 0, 3.12, sign * 2.54);
  }
  for (const r of v.gate) g.cap('fine', portland, r[0], 6.21);
  cupola(g, centre, 6.31, 2.67, 7.5, true);
  for (let i = 0; i < 4; i++)
    g.block(
      'fine',
      freestone,
      street,
      0.57,
      street.l - 0.57,
      0.014,
      0.11 * (4 - i),
      i * 0.38,
      (i + 1) * 0.38,
    );
}
function tallLights(g, f, h, n) {
  const slot = f.l / n;
  for (let i = 0; i < n; i++) {
    const a = i * slot,
      b = a + slot,
      u = (a + b) / 2,
      w = Math.min(slot * 0.63, 3.35);
    g.panel('stone', portland, f, a, u - w / 2, 0, h);
    g.panel('stone', portland, f, u + w / 2, b, 0, h);
    g.panel('stone', portland, f, u - w / 2, u + w / 2, 0, 2.9);
    arch(g, f, u, 2.9, w, h - 4.68, { rise: w * 0.5, lights: 3, wall: portland, depth: 0.49 });
    g.panel('stone', portland, f, u - w / 2, u + w / 2, h - 1.49, h);
    g.block('fine', chalk, f, a + 0.05, a + 0.52, 0.36, h - 0.71, -0.18, 0.23);
  }
}
function queenNave(g, rings, kind) {
  const library = kind === 'queensLibrary',
    h = library ? 13.2 : 13.4;
  ridgeRoof(g, rings, h, library ? 3.4 : 3.8, gray, portland);
  for (const f of sides(rings[0])) {
    if (f.l < 2.1) {
      g.panel('stone', portland, f, 0, f.l, 0, h);
      continue;
    }
    if (library) {
      windowRows(g, f, h, 2, 4.5, portland, true);
      course(g, f, 5.5, 0.18, 0.24);
    } else tallLights(g, f, h, Math.max(1, Math.round(f.l / 5.15)));
    topCourses(g, f, h);
    if (f.l > 4) balusters(g, f, h + 0.01);
  }
}
function queenBell(g, rings) {
  const h = 13.4,
    c = orientedBox(rings[0]);
  for (const f of sides(rings[0])) {
    if (Math.abs(f.nz) > 0.78 && f.l > 3.5) {
      openBay(g, f, 0, f.l, 0, 3.15, 1.62, 6.1, 2.0, {
        round: true,
        noBack: true,
        pier: 1.25,
        color: portland,
      });
      floorWindows(g, f, 6.1, h, 1, 2.3, portland, 3, 4);
      if (f.nz > 0.6) {
        for (const u of [-1.75, -0.15, f.l + 0.15, f.l + 1.75]) ionic(g, f, u, 1.2, 0.22, 10.64, 0.46);
        g.block('fine', chalk, f, -2.36, f.l + 2.36, 10.85, 11.62, 0.06, 1.96);
        pediment(g, f, f.l / 2, f.l + 4.9, 11.62, 2.4, chalk, 1.94);
      }
    } else g.panel('stone', portland, f, 0, f.l, 0, h);
  }
  g.cap('lead', lead, rings[0], h);
  const p = c.at(c.L / 2, c.W / 2);
  g.frustum('stone', portland, p, h - 0.02, 17.2, 2.79, 2.43, 8);
  cupola(g, p, 17.2, 1.88, 8.13, false);
}
function frontGarden(g) {
  const walk = frame([-317.57, -105.77], [-314.42, -144.88]);
  // Paired clipped evergreen shrubs follow the inner edges of the two
  // mapped lawns. Their spacing and diameter are estimates from the court view.
  for (const side of [-1, 1])
    for (const u of [4, 10, 16, 22, 28, 34]) {
      const p = walk.plan(u, side * 2.11);
      g.frustum('trim', '#776849', p, 0.03, 0.28, 0.095, 0.07, 6);
      const point = (j, k) => {
        const a = Math.PI * (j / 12 - 0.5),
          theta = (2 * Math.PI * k) / 22;
        const uneven = 1 + 0.017 * Math.sin(theta * 7 + j * 2.45 + u);
        return [
          p[0] + 0.87 * Math.cos(a) * Math.cos(theta) * uneven,
          0.73 + 0.62 * Math.sin(a),
          p[1] + 0.87 * Math.cos(a) * Math.sin(theta) * uneven,
        ];
      };
      for (let j = 0; j < 12; j++)
        for (let k = 0; k < 22; k++) {
          const tint = ['#78884e', '#7a8951', '#75854d', '#7f8c54'][(j * 3 + k * 5 + u) % 4];
          g.quad('trim', tint, point(j, k), point(j, k + 1), point(j + 1, k + 1), point(j + 1, k));
        }
    }
}
function hallPorch(g) {
  // The Hall and Chapel share a gabled oriel over the door at the head of
  // Main Quad's path. Its returns, cornices and canted glazing have depth.
  const f = frame([-384.45, -43.18], [-377.5, -43.47]);
  for (const [a, b] of [
    [0.25, f.l / 2 - 1.12],
    [f.l / 2 + 1.12, f.l - 0.25],
  ])
    g.block('stone', freestone, f, a, b, 0.08, 4.85, -0.2, 1.24);
  g.block('stone', freestone, f, f.l / 2 - 1.12, f.l / 2 + 1.12, 3.85, 4.85, -0.2, 1.24);
  arch(g, f, f.l / 2, 0.14, 2.24, 3.64, { door: true, d: 1.28, depth: 0.49 });
  const points = [f.plan(0.7, 1.24), f.plan(1.52, 2.1), f.plan(f.l - 1.52, 2.1), f.plan(f.l - 0.7, 1.24)];
  for (let i = 1; i < points.length; i++) {
    const side = frame(points[i - 1], points[i]);
    floorWindows(g, side, 4.85, 9.0, 1, side.l * 0.83, freestone, side.l > 2 ? 4 : 1, 2);
    floorWindows(g, side, 9.0, 12.9, 1, side.l * 0.83, freestone, side.l > 2 ? 4 : 1, 2);
    for (const y of [4.85, 8.98, 12.9]) course(g, side, y, 0.19, 0.18);
  }
  g.cap('lead', lead, points, 13.08);
  const head = frame(f.plan(0.25, 1.24), f.plan(f.l - 0.25, 1.24));
  pediment(g, head, head.l / 2, head.l + 0.4, 13.05, 3.18, portland, 0.06);
  reveal(g, head, head.l / 2, 13.35, 1.2, 1.35, 2, 2, 0.11);
  pinnacle(g, head.plan(head.l / 2, 0.06), 16.19, 1.27, 0.24);
}
function gothicHall(g, rings, church = false) {
  const h = church ? 9.65 : 11.55;
  ridgeRoof(g, rings, h, church ? 4.1 : 5.2, roofStone, freestone);
  for (const f of sides(rings[0])) {
    if (f.l < 3.35) {
      g.panel('ragstone', freestone, f, 0, f.l, 0, h);
      continue;
    }
    const n = Math.max(1, Math.round(f.l / (church ? 6.1 : 5.5))),
      bay = f.l / n;
    const windows = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * bay,
      w: Math.min(bay * 0.69, 4.2),
      y: 2.04,
      h: h - 3.15,
      rise: 1.51,
      lights: 3,
      seed: i + 3,
      depth: 0.54,
    }));
    wallWithWindows(g, f, 0, h, windows, freestone, church ? 'ragstone' : 'stone');
    for (let i = 0; i < n; i++) buttress(g, f, Math.max(0.32, i * bay), 0, h - 0.15, 0.52, 0.7);
    topCourses(g, f, h);
  }
}
function church(g, q) {
  const v = q.churchVolumes;
  for (const r of [...v.rear, ...v.chancel]) gothicHall(g, r, true);
  for (const r of v.porch) {
    ridgeRoof(g, r, 4.63, 2.3, roofStone, freestone);
    for (const f of sides(r[0])) mappedSmallArch(g, f, 4.6);
  }
  for (const r of v.tower) {
    const h = 18.65;
    g.cap('lead', lead, r[0], h);
    for (const f of sides(r[0])) {
      if (f.l > 3.7)
        wallWithWindows(
          g,
          f,
          0,
          h,
          [
            {
              x: f.l / 2,
              w: 1.79,
              y: 11.6,
              h: 3.95,
              rise: 0.95,
              lights: 2,
              seed: 3,
              depth: 0.48,
              bell: true,
            },
          ],
          ochre,
          'ragstone',
        );
      else g.panel('ragstone', ochre, f, 0, f.l, 0, h);
      course(g, f, 8.7, 0.17, 0.2);
      topCourses(g, f, h);
      merlons(g, f, h, Math.max(1, Math.round(f.l / 1.29)), 0.78);
    }
  }
}
function mappedSmallArch(g, f, h) {
  if (f.l > 2.1)
    openBay(g, f, 0, f.l, 0, 2.25, 1.04, h, 1.28, { round: true, pier: 0.92, wall: 0.55, color: freestone });
  else g.panel('stone', freestone, f, 0, f.l, 0, h);
}
function classicBack(g, q) {
  for (const shapes of Object.values(q.backVolumes))
    for (const r of shapes) {
      ridgeRoof(g, r, 10.9, 3.45, gray, portland);
      for (const f of sides(r[0])) {
        mappedPortal(g,f,[q.backPassage],10.9,portland,side=>windowRows(g,side,10.9,3,3.93,portland));
        topCourses(g, f, 10.87);
      }
    }
}
function gothicRange(g, rings, durham = false) {
  const h = durham ? 12.2 : 10.0;
  ridgeRoof(g, rings, h, durham ? 4.65 : 4.14, durham ? '#828080' : roofStone, freestone);
  for (const f of sides(rings[0])) {
    windowRows(g, f, h, durham ? 3 : 2, durham ? 4.1 : 3.72, durham ? '#d2b193' : freestone);
    course(g, f, h * 0.49, 0.16, 0.17);
    topCourses(g, f, h);
    if (f.l < 3.2) continue;
    const n = Math.max(1, Math.round(f.l / (durham ? 7.4 : 5.5)));
    for (let i = 0; i < n; i++) {
      const u = ((i + 0.5) * f.l) / n,
        w = Math.min((f.l / n) * 0.81, 4.25);
      dormer(g, f, u, h - 0.12, w, durham ? gray : roofStone);
      if (!durham && w > 2.2) {
        g.bar('fine', chalk, f.point(u - w * 0.51, h + 0.98, 0.19), f.point(u, h + 2.0, 0.19), 0.13, 5);
        g.bar('fine', chalk, f.point(u, h + 2, 0.19), f.point(u + w * 0.51, h + 0.98, 0.19), 0.13, 5);
        g.frustum('fine', chalk, f.plan(u, 0.14), h + 2.0, h + 2.5, 0.17, 0.05, 6);
      }
    }
  }
}
function univGate(g, gate, radcliffe) {
  const axis = frame(gate.axis[0], gate.axis.at(-1));
  const h = radcliffe ? 19.25 : 20.5;
  for (const rings of gate.shapes) {
    g.cap('lead', lead, rings[0], h - 0.5);
    for (const f of sides(rings[0])) {
      if (Math.abs(f.nz) > 0.75 && f.l > 4.0) {
        const u = f.l / 2,
          w = Math.min(3.0, f.l - 0.8);
        g.panel('stone', freestone, f, 0, u - w / 2, 0, 6.2);
        g.panel('stone', freestone, f, u + w / 2, f.l, 0, 6.2);
        openBay(g, f, u - w / 2, u + w / 2, 0, 2.75, 1.13, 6.2, 2.45, {
          pier: 0.22,
          wall: 0.64,
          noBack: true,
          color: freestone,
        });
        floorWindows(g, f, 6.2, 12.55, 2, 1.12, freestone, 2, 3);
        floorWindows(g, f, 12.55, h - 0.52, 2, 1.18, freestone, 2, 3);
        const nicheW = Math.min(1.83, f.l * 0.27);
        g.block('fine', ochre, f, u - nicheW * 0.54, u + nicheW * 0.54, 6.04, 6.53, 0.06, 0.57);
        g.panel('ragstone', '#ab997d', f, u - nicheW * 0.5, u + nicheW * 0.5, 6.53, 10.25, 0.035);
        for (const dx of [-0.55, 0.55])
          g.block('fine', chalk, f, u + dx * nicheW - 0.09, u + dx * nicheW + 0.09, 6.51, 10.36, 0.07, 0.38);
        statue(g, f, u, 6.51, 3.28, 0.38);
        pediment(g, f, u, nicheW + 1.1, 10.37, 1.02, chalk, 0.3);
        pediment(g, f, u, nicheW + 0.65, h - 2.05, 0.86, chalk, 0.17);
      } else g.panel('stone', freestone, f, 0, f.l, 0, h - 0.52);
      for (const y of [5.86, 12.38, h - 0.72]) course(g, f, y, 0.24, 0.24);
      g.panel('stone', freestone, f, 0, f.l, h - 0.52, h);
      merlons(g, f, h, Math.max(1, Math.round(f.l / 1.37)), 0.87, 0.43, freestone);
    }
  }
  for (const s of [-1, 1]) g.panel('ragstone', ochre, axis, 0, axis.l, 0, 2.75, 1.46 * s);
  const center = axis.plan(axis.l * 0.5);
  if (!radcliffe) g.bar('trim', '#b5b4a6', atY(center, h - 0.13), atY(center, h + 5.2), 0.052, 7);
}
function bridge(g, rings) {
  const f = sides(rings[0])
    .filter((f) => f.nz < -0.68)
    .sort((a, b) => b.l - a.l)[0];
  const b = sides(rings[0])
    .filter((f) => f.nz > 0.68)
    .sort((a, b) => b.l - a.l)[0];
  if (!f || !b) return;
  const depth = Math.abs((b.a[0] - f.a[0]) * f.nx + (b.a[1] - f.a[1]) * f.nz);
  // The lane is continuous under a stone barrel vault; no base prism crosses it.
  for (const edge of [f, b]) {
    openRaisedArch(g, edge, 2.0, 4.12, 5.24, 0.19);
    wallWithWindows(g,edge,5.24,8.63,[{x:edge.l/2,w:edge.l*.65,y:5.70,h:2.36,rise:.43,lights:2,seed:6,depth:.34}],freestone);
    topCourses(g, edge, 8.69);
    merlons(g, edge, 8.7, 4, 0.46, 0.26);
  }
  for (let j = 0; j < 18; j++) {
    const vault = (i) => {
      const a = (i * Math.PI) / 18;
      return [f.l * 0.5 - (f.l * 0.5 - 0.19) * Math.cos(a), 4.12 + .88 * Math.sin(a)];
    };
    const [u, y] = vault(j),
      [v, h] = vault(j + 1);
    g.quad('ragstone', ochre, f.point(u, y), f.point(v, h), f.point(v, h, -depth), f.point(u, y, -depth));
  }
  g.cap('lead', lead, rings[0], 8.68);
}
function school(g, q) {
  for (const [piece, shapes] of Object.entries(q.examVolumes))
    for (const r of shapes) {
      const front = piece === 'front',
        h = front ? 15.55 : 15.9;
      ridgeRoof(g, r, h, front ? 3.45 : 4.35, gray, freestone);
      for (const f of sides(r[0])) {
        if (front && f.nz < -0.85 && f.l > 22) {
          const n = 5,
            step = f.l / n;
          for (let i = 0; i < n; i++) {
            const bay = segment(f, i * step, (i + 1) * step);
            if (i === 2) {
              arch(g, bay, step / 2, 0.3, 3.17, 5.65, { door: true, depth: 1.09, wall: portland });
              for (const u of [0.68, step - 0.68]) ionic(g, bay, u, 0.59, 0.12, 6.5, 0.33);
              g.block('fine', portland, bay, 0, step, 6.48, 6.93, -0.09, 1.02);
              floorWindows(g, bay, 7.0, h, 1, 4.6, portland, 5, 4);
              pediment(g, bay, step / 2, step + 1.05, 7.0, 1.69, chalk, 0.83);
            } else {
              floorWindows(g, bay, 0, i % 2 ? 2.35 : 6.2, 1, step * 0.64, freestone, 4, 2);
              floorWindows(g, bay, i % 2 ? 2.35 : 6.2, h, 1, step * 0.72, freestone, 5, 5);
              for (const u of [0.22, step - 0.22])
                g.block('fine', chalk, bay, u - 0.22, u + 0.22, 0.36, h - 0.28, -0.05, 0.37);
              if (i === 0 || i === 4) balusters(g, bay, h + 0.08);
            }
          }
          const p = f.plan(f.l / 2, -3.8);
          g.frustum('stone', freestone, p, 18, 19.31, 1.15, 0.96, 8);
          cupola(g, p, 19.24, 0.86, 3.7, false);
        } else if (f.l > 6) tallLights(g, f, h, Math.max(1, Math.round(f.l / 6.35)));
        else g.panel('stone', freestone, f, 0, f.l, 0, h);
        topCourses(g, f, h);
      }
    }
}
function carrodus(g, rings) {
  // Keep the courtyard hole open and turn its window reveals towards the court.
  for (const [i, ring] of rings.entries())
    for (const exterior of sides(ring)) {
      const f = i ? frame(exterior.a, exterior.b, -sideOf(exterior)) : exterior;
      windowRows(g, f, 9.28, 3, 3.15, freestone);
      topCourses(g, f, 9.3);
      if (f.l > 5) for (let u = 2.7; u < f.l - 1; u += 5.1) dormer(g, f, u, 9.4, 1.9);
    }
  ridgeRoof(g, rings, 9.45, 3.12, gray, freestone);
}
export function buildHighStreet(g, id, q, records) {
  if (id === 'queens') {
    drawQueenFront(g, q);
    classicBack(g, q);
    church(g, q);
    frontGarden(g);
  } else {
    for (const ring of q.frontRanges) gothicRange(g, ring);
    q.gateTowers.forEach((gate, i) => univGate(g, gate, i === 1));
    school(g, q);
    hallPorch(g);
  }
  for (const [k, rings] of records) {
    const kind = q.buildings[k]?.family;
    if (['queensLibrary', 'queensHall', 'queensChapel'].includes(kind)) queenNave(g, rings, kind);
    if (kind === 'queensBell') queenBell(g, rings);
    // The lodge is recorded inside the screen wall, beneath its walkable gallery.
    if (kind === 'queensLodge') for (const f of sides(rings[0])) g.panel('stone', ochre, f, 0, f.l, 0, 3.2);
    if (kind === 'carrodus') carrodus(g, rings);
    if (kind === 'durham' || kind === 'univRange') gothicRange(g, rings, kind === 'durham');
    if (kind === 'univChapel' || kind === 'univHall') gothicHall(g, rings);
    if (kind === 'logicBridge') bridge(g, rings);
  }
}
export const highGardens = {
  univ: [-1, 1].flatMap((side) =>
    Array.from({ length: 18 }, (_, i) => ({
      x: -382.16 + i * 0.022 + side * 2.02,
      z: -69.6 + i * 1.34,
      kind: 'wall border',
      radius: 0.51,
      stature: 0.72 + (i % 4) * 0.1,
    })),
  ),
};
