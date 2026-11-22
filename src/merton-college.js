import { atY, faces, frame, mix, orientedBox } from './magdalen/architecture/geometry.js';
import { coping, lancet, merlons, pinnacle } from './magdalen/architecture/masonry.js';
import { ridgeRoof } from './palette.js';
import {
  belfry,
  chapelWing,
  chalk,
  dormer,
  elevationRing,
  limestone,
  mappedPortal,
  stoneSlate,
  windowRows,
} from './college-masonry.js';
import { course, pediment, reveal } from './civic-masonry.js';

function chimney(g, b, u, height) {
  const p = b.at(u, b.W / 2);
  const outline = [
    b.at(u - 0.46, b.W / 2 - 0.35),
    b.at(u + 0.46, b.W / 2 - 0.35),
    b.at(u + 0.46, b.W / 2 + 0.35),
    b.at(u - 0.46, b.W / 2 + 0.35),
  ];
  g.prism('ragstone', '#aa9c84', outline, height - 0.8, height + 1.02);
  for (const f of faces(outline)) coping(g, f, height + 1.0, { width: 0.22, height: 0.14, color: '#b6a990' });
}
// Medieval rooms have individual leaded casements. The stepped, low eastern
// door of Mob Quad is the mapped through-route to Patey's Quad.
function medievalFace(g, f, lib, lowRange, h, wall) {
  if (f.l < 2.05) {
    g.panel('ragstone', wall, f, 0, f.l, 0, h);
    return;
  }
  const n = Math.max(1, Math.round(f.l / (lib ? 4.05 : 4.9))),
    step = f.l / n;
  for (let i = 0; i < n; i++) {
    const mid = (i + 0.5) * step,
      a = i * step,
      b = a + step;
    const divide = lowRange ? 3.47 : 2.54;
    for (let floor = 0; floor < 2; floor++) {
      const foot = floor ? divide : 0,
        top = floor ? h : divide,
        high = floor === 1;
      if (high && lowRange && i % 3 !== 2) {
        g.panel('ragstone', wall, f, a, b, foot, top);
        continue;
      }
      const lights = lib ? (high ? 2 : 1) : i % 3 === 1 ? 1 : 3;
      const w = Math.min(step * 0.66, lights * (lib ? 0.55 : 0.68)),
        sill = foot + (high ? 0.63 : 0.72),
        head = top - (high ? 0.48 : 0.46);
      const l = mid - w / 2,
        r = mid + w / 2;
      g.panel('ragstone', wall, f, a, l, foot, top);
      g.panel('ragstone', wall, f, r, b, foot, top);
      g.panel('ragstone', wall, f, l, r, foot, sill);
      g.panel('ragstone', wall, f, l, r, head, top);
      reveal(g, f, mid, sill, w, head - sill, lights, lib ? 1 : 2, 0, '#cabc9d');
      g.block('fine', '#cdbfa1', f, l - 0.13, r + 0.13, head, head + 0.16, -0.1, 0.16);
      for (const u of [l, r])
        g.block('fine', '#b2a58d', f, u - 0.045, u + 0.045, sill - 0.01, head, 0.01, 0.08);
    }
  }
}
function libraryOriel(g, f) {
  const mid = f.l / 2,
    base = 2.42,
    plan = [
      f.plan(mid - 1.51, 0.01),
      f.plan(mid - 1.04, 0.95),
      f.plan(mid + 1.04, 0.95),
      f.plan(mid + 1.51, 0.01),
    ];
  for (let j = 0; j < 3; j++) {
    const a = plan[j],
      b = plan[j + 1],
      e = frame(a, b),
      wall = frame(a, b, Math.sign(e.nx * f.nx + e.nz * f.nz || 1));
    const segment = wall.l;
    g.tri('fine', '#b6a389', atY(a, base + 0.51), atY(b, base + 0.51), f.point(mid, base - 0.69, 0.12));
    g.panel('stone', chalk, wall, 0, segment, base + 0.51, base + 1.04);
    const w = segment * 0.75,
      center = segment / 2;
    g.panel('stone', chalk, wall, 0, center - w / 2, base + 1.04, 6.25);
    g.panel('stone', chalk, wall, center + w / 2, segment, base + 1.04, 6.25);
    g.panel('ink', '#6c7972', wall, center - w / 2, center + w / 2, base + 1.04, 6.25, -0.05);
    g.block('fine', chalk, wall, 0, segment, 4.9, 5.0, -0.1, 0.06);
    course(g, wall, 6.23, 0.18, 0.12, chalk);
  }
  g.cap('lead', '#8d918b', plan, 6.41);
}
function mobRange(g, r, s, key) {
  const lib = s.family === 'mobLibrary',
    b = orientedBox(r[0]),
    wall = lib ? '#c7bca4' : '#cbb99e';
  const h = lib ? 5.55 : 5.85,
    rise = lib ? 3.95 : 3.6;
  // The south library turns the SW corner. Split at the return so both
  // library roofs follow the two ranges, meeting over their common corner.
  const pieces = key === 'w228196820' ? s.roofs : [r];
  for (const part of pieces) ridgeRoof(g, part, h, rise, stoneSlate, wall);
  for (const f of faces(elevationRing(r[0]))) {
    const long = Math.abs(f.ux * b.ux + f.uz * b.uz) > 0.89;
    mappedPortal(g, f, s.passages, h, wall, (e) => medievalFace(g, e, lib, key === 'w39606975', h, wall));
    course(g, f, h - 0.11, 0.1, 0.13, '#b9aa91');
    if (key === 'w228196820' && f.nx > 0.85 && f.l > 5) libraryOriel(g, f);
    // The long library elevation on Chestnut Lawn has an uninterrupted roof
    // slope and projecting oriel at its east gable; dormers address Mob Quad.
    if (long && f.l > 6.5 && !(key === 'w228196820' && f.nz > 0.6)) {
      const n = Math.max(2, Math.round(f.l / 5.05));
      for (let j = 0; j < n; j++)
        dormer(
          g,
          frame(f.plan(0, -0.72), f.plan(f.l, -0.72), Math.sign(f.nx * f.uz - f.nz * f.ux)),
          ((j + 0.5) * f.l) / n,
          h + 0.44,
          1.47,
        );
    }
  }
  for (let j = 0; j < Math.max(1, Math.floor(b.L / 11)); j++)
    chimney(g, b, ((j + 0.53) * b.L) / Math.max(1, Math.floor(b.L / 11)), h + rise);
}
function fourOrders(g, f, h) {
  const mid = f.l / 2,
    width = 3.54,
    base = mid - width / 2;
  // The small frontispiece on the courtyard side rises through four orders.
  // It stands against the south range. The central aedicule is empty.
  for (let storey = 0; storey < 4; storey++) {
    const y = 0.42 + storey * 2.66,
      cap = y + 2.43,
      col = ['#c9b898', '#d4c1a2', '#d9c9ae', '#d9cbb2'][storey];
    g.block('stone', col, f, base, base + width, y, y + 0.16, 0.08, 0.58);
    const back = frame(
      f.plan(base + 0.44, 0.18),
      f.plan(base + width - 0.44, 0.18),
      Math.sign(f.nx * f.uz - f.nz * f.ux),
    );
    lancet(g, back, back.l / 2, y + 0.31, storey === 3 ? 1.04 : 1.34, 1.81, 1, {
      glass: storey === 2 ? '#a39981' : '#778078',
      shadow: '#665f51',
      trim: chalk,
      round: true,
    });
    for (const u of [base + 0.28, base + width - 0.28]) {
      const p = f.plan(u, 0.58);
      g.frustum('stone', col, p, y + 0.16, y + 0.38, 0.29, 0.23, 8);
      g.frustum('fine', col, p, y + 0.38, cap - 0.26, 0.213, 0.155, 10);
      g.frustum('fine', chalk, p, cap - 0.26, cap - 0.13, 0.16, 0.28 + storey * 0.015, 8);
      if (storey >= 1)
        for (const side of [-1, 1]) {
          const end = f.plan(u + side * 0.18, 0.65);
          g.frustum('fine', chalk, end, cap - 0.23, cap - 0.05, 0.09, 0.115, 7);
        }
    }
    g.block('fine', chalk, f, base - 0.12, base + width + 0.12, cap - 0.12, cap + 0.22, 0.06, 0.73);
  }
  pediment(g, f, mid, width + 0.55, 10.95, 0.92, chalk, 0.51);
  const p = f.plan(mid, 0.22);
  g.frustum('stone', limestone, p, 11.53, 13.06, 0.7, 0.56, 8);
  pinnacle(g, p, 13.03, 1.28, 0.36);
}
function fellows(g, r, s, key) {
  const b = orientedBox(r[0]),
    h = 9.5,
    roof = '#87857c',
    tint = '#d1c0a2';
  for (const f of faces(elevationRing(r[0]))) {
    mappedPortal(g, f, s.passages, h, tint, (e) => windowRows(g, e, h, 3, 4.35, tint));
    coping(g, f, h - 0.1, { width: 0.28, color: chalk });
    if (f.l < 8.7) continue;
    const n = Math.max(1, Math.round(f.l / 7.45));
    for (let j = 0; j < n; j++) {
      const u = ((j + 0.5) * f.l) / n,
        w = Math.min(3.75, (f.l / n) * 0.68);
      const a = f.point(u - w / 2, h - 0.15, 0.07),
        bpt = f.point(u + w / 2, h - 0.15, 0.07),
        peak = f.point(u, h + 2.15, 0.07);
      g.tri('stone', tint, a, bpt, peak);
      const rear = f.point(u, h + 2.35, -2.7);
      g.tri('roof', roof, a, peak, rear);
      g.tri('roof', roof, bpt, rear, peak);
      for (const corner of [a, bpt]) g.bar('fine', chalk, corner, peak, 0.1, 5);
      lancet(g, f, u, h + 0.05, 0.76, 1.18, 1, { d: 0.11 });
    }
    if (key === 'w301499011' && f.nz < -0.76) fourOrders(g, f, h);
  }
  ridgeRoof(g, r, h, 3.22, roof, tint);
  if (b.L > 12) for (const portion of [0.23, 0.76]) chimney(g, b, b.L * portion, h + 3.24);
}
function sacristy(g, q, r) {
  // The square treasury occupies the NE corner beside the sacristy. Its
  // steep, stone-clad pyramidal roof has no central spire.
  for (const [name, parts] of Object.entries(q.treasuryVolumes))
    for (const parcel of parts) {
      const tower = name === 'treasury',
        h = tower ? 8.45 : 6.5;
      for (const f of faces(elevationRing(parcel[0]))) {
        g.panel('ragstone', limestone, f, 0, f.l, 0, h);
        if (f.l > 3.8)
          lancet(g, f, f.l / 2, h - 3.65, tower ? 0.66 : 1.15, tower ? 1.6 : 2.25, tower ? 1 : 2);
        coping(g, f, h, { width: 0.18 });
      }
      if (tower) {
        const b = orientedBox(parcel[0]),
          top = atY(b.at(b.L / 2, b.W / 2), h + 5.75);
        for (const f of faces(parcel[0]))
          g.tri('roof', '#aaa48f', atY(f.a, h + 0.12), atY(f.b, h + 0.12), top);
      } else ridgeRoof(g, parcel, h + 0.1, 2.45, stoneSlate, limestone);
    }
}
export function buildMerton(g, q, records) {
  for (const [outer, ...holes] of q.cobbles) g.cap('setts', '#b7ab97', outer, 0.029, holes);
  for (const [outer, ...holes] of q.courtLawns) g.cap('grass', '#9fae7c', outer, 0.033, holes);
  for (const [key, r] of records) {
    const s = q.buildings[key];
    switch (s?.family) {
      case 'mertonChoir':
        for (const [part, volumes] of Object.entries(q.chapelVolumes))
          for (const v of volumes) {
            if (part === 'crossing') belfry(g, v[0], true);
            else
              chapelWing(
                g,
                v,
                r[0],
                part === 'choir' ? 14.55 : 13.65,
                part === 'choir' ? 5.45 : 4.6,
                'merton',
              );
          }
        break;
      case 'mobLibrary':
      case 'mobRange':
        mobRange(g, r, s, key);
        break;
      case 'mobTreasury':
        sacristy(g, q, r);
        break;
      case 'fellows':
        fellows(g, r, s, key);
        break;
      case 'mertonGate':
        for (const f of faces(elevationRing(r[0]))) {
          mappedPortal(g, f, s.passages, 10.5, limestone, (e) => windowRows(g, e, 10.5, 2, 4, limestone));
          coping(g, f, 10.45);
          merlons(g, f, 10.62, Math.max(2, Math.round(f.l / 1.16)), 0.47);
          if (Math.abs(f.nz) > 0.7) lancet(g, f, f.l / 2, 5.35, 1.52, 2.55, 2);
        }
        g.cap('lead', '#89908c', r[0], 10.61);
        break;
      case 'mertonHall':
        for (const f of faces(elevationRing(r[0]))) {
          g.panel('stone', limestone, f, 0, f.l, 0, 9.4);
          const n = Math.max(1, Math.round(f.l / 4.65));
          if (f.l > 3.2)
            for (let i = 0; i < n; i++)
              lancet(g, f, ((i + 0.5) * f.l) / n, 3.25, Math.min(3.42, (f.l / n) * 0.68), 5.05, 3);
          coping(g, f, 9.3);
        }
        ridgeRoof(g, r, 9.4, 4.3, '#828789', limestone);
        break;
    }
  }
}
