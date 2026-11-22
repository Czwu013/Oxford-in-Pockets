import { atY, clean, faces, frame, mix, orientedBox } from './magdalen/architecture/geometry.js';
import { buttress, coping, merlons, openBay, pinnacle } from './magdalen/architecture/masonry.js';
import { wallWithWindows } from './magdalen/architecture/deep-windows.js';
import { reveal } from './civic-masonry.js';
import { ridgeRoof } from './palette.js';

export const limestone = '#cdbda0',
  chalk = '#ddceb0',
  stoneSlate = '#8d8980';
export const sideOf = (f) => Math.sign(f.nx * f.uz - f.nz * f.ux);
// Keep all surveyed corners in caps and roofs. Combine collinear points only
// for elevations, so a node shared with a footpath does not restart a window bay.
export function elevationRing(points) {
  const ring = clean(points);
  return ring.filter((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length],
      b = ring[(i + 1) % ring.length];
    const f = frame(a, b);
    return Math.abs((p[0] - a[0]) * f.nx + (p[1] - a[1]) * f.nz) > 0.16;
  });
}
function chapelWindow(x, w, h, sill, lights, seed) {
  return { x, w, y: sill, h, rise: Math.min(w * 0.61, h * 0.41), lights, seed, depth: 0.57 };
}
export function chapelWing(g, rings, outer, eaves, rise, chapel, isAnte = false) {
  ridgeRoof(g, rings, eaves, rise, chapel === 'new' ? '#73828a' : '#797f80', limestone);
  const surveyed = faces(outer);
  for (const f of faces(elevationRing(rings[0]))) {
    const p = f.plan(f.l / 2);
    // The clipping cuts lie behind adjacent roof volumes, not on an outside face.
    const street = surveyed.some((edge) => {
      const x = p[0] - edge.a[0],
        z = p[1] - edge.a[1],
        u = x * edge.ux + z * edge.uz;
      return u > -0.25 && u < edge.l + 0.25 && Math.abs(x * edge.nx + z * edge.nz) < 0.35;
    });
    if (!street || f.l < 2) {
      g.panel('stone', limestone, f, 0, f.l, 0, eaves);
      continue;
    }
    const westFront = isAnte && f.nx < -0.8 && f.l > 20;
    const terminal = chapel === 'merton' && (f.nx > 0.88 || (Math.abs(f.nz) > 0.84 && f.l < 14));
    const n = westFront ? 3 : terminal ? 1 : Math.max(1, Math.round(f.l / 5.35));
    const step = f.l / n;
    const windows = Array.from({ length: n }, (_, i) => {
      const broad = westFront && i === 1,
        w = Math.min(step * (broad ? 0.9 : terminal ? 0.78 : 0.76), terminal ? 9.3 : 8.5);
      const sill = westFront ? 4.3 : 3.05,
        h = eaves - sill - (broad ? 0.92 : 1.55);
      return chapelWindow((i + 0.5) * step, w, h, sill, broad || terminal ? 7 : w > 4.2 ? 5 : 3, i + 9);
    });
    wallWithWindows(g, f, 0, eaves, windows, limestone);
    coping(g, f, eaves, { width: 0.36, color: chalk });
    for (let i = 0; i <= n; i++) {
      const u = Math.max(0.17, Math.min(f.l - 0.17, i * step));
      buttress(g, f, u, 0, eaves + 0.12, 0.53, 0.86);
      if (westFront || (chapel === 'new' && f.l > 19 && i % 2 === 0))
        pinnacle(g, f.plan(u, 0.3), eaves + 0.13, westFront ? 3.3 : 2.0, 0.39);
    }
  }
}
export function belfry(g, ring, isMerton) {
  const shape = elevationRing(ring),
    sides = faces(shape);
  const top = isMerton ? 31.45 : 29.35;
  const bellBase = isMerton ? 20.6 : 21.1;
  for (const f of sides) {
    if (f.l < 3) {
      g.panel('stone', limestone, f, 0, f.l, 0, top);
      continue;
    }
    const width = isMerton ? Math.min(3.48, f.l * 0.34) : 1.15;
    const apertures = [0.28, 0.72].map((part, i) => ({
      ...chapelWindow(f.l * part, width, isMerton ? 7.8 : 4.1, bellBase, isMerton ? 3 : 1, i),
      bell: true,
      depth: 0.65,
    }));
    if (isMerton) g.panel('stone', limestone, f, 0, f.l, 0, bellBase - 0.9);
    else {
      const lo = [chapelWindow(f.l * 0.52, 0.72, 2.5, 9.1, 1, 3)];
      wallWithWindows(g, f, 0, bellBase - 0.9, lo, '#c3b697', 'ragstone');
    }
    if (isMerton) {
      wallWithWindows(g, f, bellBase - 0.9, top, apertures, '#bfb395');
      for (const o of apertures) {
        const x = o.x,
          base = bellBase + 0.28;
        for (let j = 0; j < 3; j++)
          g.block(
            'stone',
            '#b0a691',
            f,
            x - o.w / 2 + 0.16 + (j * o.w) / 3,
            x - o.w / 2 + 0.26 + (j * o.w) / 3,
            base,
            base + 2.4,
            -0.48,
            -0.19,
          );
      }
    } else {
      let cursor = 0;
      for (const o of apertures) {
        const a = o.x - width / 2,
          b = o.x + width / 2,
          head = o.y + o.h;
        g.panel('ragstone', '#c5baa0', f, cursor, a, bellBase - 0.9, top);
        g.panel('ragstone', '#c5baa0', f, a, b, bellBase - 0.9, o.y);
        g.panel('ragstone', '#c5baa0', f, a, b, head, top);
        g.panel('ink', '#525c58', f, a, b, o.y, head, -0.52);
        for (const u of [a, b])
          g.quad(
            'stone',
            chalk,
            f.point(u, o.y, -0.52),
            f.point(u, head, -0.52),
            f.point(u, head, 0.04),
            f.point(u, o.y, 0.04),
          );
        for (let j = 0; j < 10; j++) {
          const y = o.y + 0.19 + j * 0.37;
          g.quad(
            'trim',
            '#827e6f',
            f.point(a, y, -0.3),
            f.point(b, y, -0.3),
            f.point(b, y + 0.13, -0.43),
            f.point(a, y + 0.13, -0.43),
          );
        }
        g.block('fine', chalk, f, a - 0.14, b + 0.14, head, head + 0.25, -0.08, 0.22);
        g.block('stone', '#bfb49a', f, a - 0.18, b + 0.18, o.y - 0.2, o.y, -0.55, 0.27);
        cursor = b;
      }
      g.panel('ragstone', '#c5baa0', f, cursor, f.l, bellBase - 0.9, top);
    }
    for (let j = 1; j < Math.floor(top / 1.1); j++) {
      const y = j * 1.08,
        len = j % 2 ? 0.63 : 0.38;
      for (const u of [0, f.l - len])
        g.panel('fine', j % 4 ? '#c4b99f' : '#cebea0', f, u, u + len, y, y + 0.46, 0.038);
    }
    for (const y of [isMerton ? 17.5 : 7.2, bellBase - 0.85, top - 1.2, top - 0.05])
      coping(g, f, y, { width: 0.46, color: chalk });
    g.block('stone', limestone, f, 0, f.l, top, top + 0.71, -0.42, 0.02);
    if (isMerton) merlons(g, f, top + 0.71, Math.max(3, Math.round(f.l / 1.65)), 0.53, 0.4);
    else {
      coping(g, f, top + 0.69, { width: 0.42, color: chalk });
      merlons(g, f, top + 0.78, 3, 0.52, 0.39);
    }
    if (isMerton) for (const u of [0.33, f.l - 0.33]) buttress(g, f, u, 14.6, top - 14.7, 0.7, 0.5);
  }
  g.cap('lead', '#7e8988', ring, top + 0.13);
  const box = orientedBox(shape);
  if (isMerton) {
    for (const p of shape) pinnacle(g, p, top + 0.55, 5.45, 0.66);
    for (const f of sides) if (f.l > 6) pinnacle(g, f.plan(f.l / 2, -0.17), top + 0.7, 3.13, 0.38);
  } else {
    const southwest = [...shape].sort((a, b) => a[0] - a[1] - (b[0] - b[1]))[0];
    const p = mix(southwest, box.at(box.L / 2, box.W / 2), 0.14);
    g.frustum('ragstone', '#c5b89a', p, 0, 31.78, 0.98, 0.97, 8, 0.3927);
    g.frustum('fine', chalk, p, 31.78, 32.3, 1.08, 0.98, 8, 0.3927);
    for (let j = 0; j < 5; j++) {
      const y = 4.1 + j * 4.8;
      g.block(
        'ink',
        '#5d6157',
        frame([p[0] - 0.16, p[1] + 0.95], [p[0] + 0.16, p[1] + 0.95], -1),
        0.04,
        0.28,
        y,
        y + 0.77,
        -0.055,
        0.022,
      );
    }
  }
}
function rectWindow(g, f, a, b, y0, y1, mid, w, sill, head, lights, rows, tint) {
  const left = mid - w / 2,
    right = mid + w / 2;
  g.panel('stone', tint, f, a, left, y0, y1);
  g.panel('stone', tint, f, right, b, y0, y1);
  g.panel('stone', tint, f, left, right, y0, sill);
  g.panel('stone', tint, f, left, right, head, y1);
  reveal(g, f, mid, sill, w, head - sill, lights, rows, 0, chalk);
  g.block('fine', chalk, f, left - 0.12, right + 0.12, head + 0.025, head + 0.13, -0.05, 0.19);
}
export function windowRows(g, f, height, floors, spacing, tint = limestone, library = false) {
  if (f.l < 2.35) {
    g.panel('stone', tint, f, 0, f.l, 0, height);
    return;
  }
  const n = Math.max(1, Math.round(f.l / spacing)),
    step = f.l / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < floors; j++) {
      const bottom = (j * height) / floors,
        top = ((j + 1) * height) / floors;
      const wide = library && j === 1,
        width = Math.min(step * (wide ? 0.54 : 0.51), wide ? 2.46 : 2.67);
      rectWindow(
        g,
        f,
        i * step,
        (i + 1) * step,
        bottom,
        top,
        (i + 0.5) * step,
        width,
        bottom + (top - bottom) * 0.23,
        top - (top - bottom) * 0.16,
        wide ? 2 : width > 2 ? 3 : 2,
        wide ? 1 : 2,
        tint,
      );
    }
}
export function mappedPortal(g, f, paths, height, tint, paint) {
  const door = [];
  for (const line of paths || [])
    for (let i = 1; i < line.length; i++) {
      const raw = frame(line[i - 1], line[i]);
      if (raw.l < 0.02) continue;
      const a = raw.plan(-0.14),
        b = raw.plan(raw.l + 0.14);
      const signed = (p) => (p[0] - f.a[0]) * f.nx + (p[1] - f.a[1]) * f.nz;
      const da = signed(a),
        db = signed(b);
      if (Math.abs(da - db) < 0.001 || da * db > 0) continue;
      const p = mix(a, b, da / (da - db)),
        u = (p[0] - f.a[0]) * f.ux + (p[1] - f.a[1]) * f.uz;
      if (u > 0.2 && u < f.l - 0.2 && !door.some((v) => Math.abs(u - v) < 0.6)) door.push(u);
    }
  if (!door.length) {
    paint(f);
    return;
  }
  let cursor = 0;
  const section = (a, b) => {
    if (b - a > 0.05) paint(frame(f.plan(a), f.plan(b), sideOf(f)));
  };
  for (const mid of door.sort((a, b) => a - b)) {
    const a = Math.max(cursor, mid - 1.46),
      b = Math.min(f.l, mid + 1.46);
    if (b - a < 1.2) continue;
    section(cursor, a);
    openBay(g, f, a, b, 0, 2.15, 0.95, 3.55, 1.2, { pier: 0.23, wall: 0.69, noBack: true, color: tint });
    g.panel('stone', tint, f, a, b, 3.55, height);
    if (height > 8) {
      const upper = frame(f.plan(a), f.plan(b), sideOf(f));
      // A small projecting niche on the upper gatehouse is backed by masonry.
      buttress(g, upper, 0.21, 3.57, 2.65, 0.26, 0.28);
    }
    cursor = b;
  }
  section(cursor, f.l);
}
export function dormer(g, f, u, y, w, colour = stoneSlate) {
  const e = y + 1.12,
    front = 0.08,
    back = -1.4;
  const a = f.point(u - w / 2, e, front),
    b = f.point(u + w / 2, e, front),
    peak = f.point(u, e + 0.86, front);
  g.block('stone', limestone, f, u - w / 2, u + w / 2, y - 0.18, e, back, front);
  g.tri('stone', chalk, a, b, peak);
  for (const sign of [-1, 1]) {
    const edge = f.point(u + sign * (w / 2 + 0.1), e - 0.04, 0.16),
      inner = f.point(u + sign * (w / 2 + 0.1), e - 0.04, back);
    g.quad('roof', colour, edge, inner, f.point(u, e + 0.96, back), f.point(u, e + 0.96, 0.16));
  }
  g.panel('ink', '#58655e', f, u - w * 0.29, u + w * 0.29, y + 0.08, e - 0.12, front + 0.02);
  g.block('fine', chalk, f, u - 0.04, u + 0.04, y + 0.08, e - 0.08, front + 0.02, front + 0.12);
}
