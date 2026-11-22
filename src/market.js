import * as T from 'three';
import { batch, strip, ridgeRoof } from './palette.js';
import { faces, frame, atY, clip } from './magdalen/architecture/geometry.js';
import { sash } from './magdalen/architecture/masonry.js';
import { furnishAvenues, shopJoinery } from './market-craft.js';

const origin = [-720.43, -30.42],
  dx = 0.9751,
  dz = -0.2218;
const unit = Math.hypot(dx, dz),
  ux = dx / unit,
  uz = dz / unit;
export const marketPoint = (u, v) => [origin[0] + ux * u + uz * v, origin[1] + uz * u - ux * v];
const invert = (p) => [
  (p[0] - origin[0]) * ux + (p[1] - origin[1]) * uz,
  (p[0] - origin[0]) * uz - (p[1] - origin[1]) * ux,
];
const P = (u, y, v) => atY(marketPoint(u, v), y);
const shades = ['#647b66', '#a66549', '#b29a62', '#547977', '#996864', '#698293'];
const box = (g, k, c, u0, u1, v0, v1, y0, y1) =>
  g.prism(k, c, [marketPoint(u0, v0), marketPoint(u1, v0), marketPoint(u1, v1), marketPoint(u0, v1)], y0, y1);
function sign(group, label, u, v, y, direction, color) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = color;
  c.fillRect(0, 0, 256, 64);
  c.strokeStyle = '#e5d2a5';
  c.lineWidth = 2;
  c.strokeRect(5, 5, 246, 54);
  c.fillStyle = '#fff0d2';
  c.font = 'bold 29px Georgia';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, 128, 32, 228);
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  const board = new T.Mesh(
    new T.PlaneGeometry(3.6, 0.9),
    new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide }),
  );
  board.position.fromArray(P(u, y, v));
  board.rotation.y = Math.atan2(direction * ux, direction * uz);
  group.add(board);
  return board;
}
function lightRuns(end) {
  return [
    [13, 32],
    [42, 67],
    [77, end - 7],
  ].filter(([a, b]) => b - a > 4);
}
function roofBand(g, poly, u0, u1, ridge, c, runs) {
  const covered = [];
  let vStart = -10;
  for (const [a, b] of runs) {
    covered.push([vStart, a]);
    vStart = b;
  }
  covered.push([vStart, 145]);
  for (const [a, b, along] of [
    [u0, ridge - 1.22, [[-10, 145]]],
    [ridge - 1.22, ridge, covered],
    [ridge, ridge + 1.22, covered],
    [ridge + 1.22, u1, [[-10, 145]]],
  ])
    for (const [v0, v1] of along) {
      let ring = clip(
        clip(poly, (p) => p[0], a, 1),
        (p) => p[0],
        b,
        -1,
      );
      if (ring.length < 3) continue;
      ring = clip(ring, (p) => p[1], v0, 1);
      if (ring.length < 3) continue;
      ring = clip(ring, (p) => p[1], v1, -1);
      if (ring.length < 3) continue;
      const H = (p) =>
        6.9 + 2.3 * (1 - Math.min(1, Math.abs(p[0] - ridge) / (p[0] < ridge ? ridge - u0 : u1 - ridge)));
      for (const tri of g.planTriangles(ring)) g.tri('roof', c, ...tri.map((p) => P(p[0], H(p), p[1])));
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i],
          q = ring[(i + 1) % ring.length];
        if (
          Math.abs(p[0] - q[0]) > 0.6 &&
          (p[1] < 2 || p[1] > 83) &&
          Math.abs(p[1] - v0) > 0.01 &&
          Math.abs(p[1] - v1) > 0.01
        ) {
          g.quad(
            'stone',
            '#b9a38a',
            P(p[0], 6.86, p[1]),
            P(q[0], 6.86, q[1]),
            P(q[0], H(q), q[1]),
            P(p[0], H(p), p[1]),
          );
        }
      }
    }
}
function skylights(g, lo, hi, vEnd, runs) {
  const mid = (lo + hi) / 2;
  for (const [start, end] of runs) {
    for (const sign of [-1, 1]) {
      const a = mid,
        b = mid + sign * 1.28,
        top = (u) => 10.05 - Math.abs(mid - u) * 0.49;
      g.quad(
        'skylight',
        sign === 1 ? '#c3c9bc' : '#b7c6c1',
        P(a, top(a), start),
        P(a, top(a), end),
        P(b, top(b), end),
        P(b, top(b), start),
      );
      for (const u of [a, b])
        g.bar('lead', '#807e70', P(u, top(u) + 0.047, start), P(u, top(u) + 0.047, end), 0.073, 4);
      for (const y of [8.83, 9.04, 9.24])
        g.quad(
          'trim',
          '#b5ab94',
          P(b, y, start),
          P(b, y, end),
          P(b + sign * 0.07, y + 0.11, end),
          P(b + sign * 0.07, y + 0.11, start),
        );
      for (let z = start; z <= end + 0.1; z += 1.7) {
        g.bar('lead', '#8a8878', P(a, top(a) + 0.04, z), P(b, top(b) + 0.04, z), 0.047, 4);
        g.bar('trim', '#9b917c', P(b, 8.8, z), P(b, top(b), z), 0.057, 4);
      }
    }
  }
  g.bar('lead', '#a39988', P(mid, 9.26, 7), P(mid, 9.26, 12.8), 0.105, 6);
}
function stack(g, side, edge, v0, v1, index, color) {
  const x = edge - side * 0.22,
    middle = (v0 + v1) * 0.5,
    kind = index % 3,
    depth = 0.74;
  const wall = edge - side * 1.42;
  const f = frame(marketPoint(wall, v0 + 0.24), marketPoint(wall, v1 - 0.24), side < 0 ? 1 : -1);
  g.panel('trim', ['#758679', '#b19673', '#8d9c87'][kind], f, 0, f.l, 0.18, 2.86, 0.025);
  for (let k = 0; k < Math.ceil(f.l / 0.137); k++)
    g.panel('trim', '#747968', f, k * 0.137, k * 0.137 + 0.012, 0.22, 2.82, 0.031);
  for (const y of [0.91, 1.48, 2.05, 2.64]) g.block('trim', '#a78d6b', f, 0, f.l, y, y + 0.074, 0.035, 0.39);
  for (let k = 0; k < 11; k++)
    for (let level = 0; level < 3; level++) {
      const u = 0.29 + (k * (f.l - 0.58)) / 10,
        y = 0.984 + level * 0.57,
        p = f.plan(u, 0.19),
        a = (k + level + index) % 4;
      if (a === 0 || a === 3) {
        g.frustum(
          'trim',
          ['#8b7771', '#a48c68', '#7d8b79', '#ab987b'][(k + index) % 4],
          p,
          y,
          y + 0.23,
          0.095,
          0.093,
          10,
        );
        g.frustum('fine', '#d8cbab', p, y + 0.09, y + 0.177, 0.095, 0.095, 10);
        g.frustum('trim', '#73766a', p, y + 0.23, y + 0.264, 0.092, 0.093, 10);
      } else {
        g.block('trim', a === 1 ? '#c8ab79' : '#a98567', f, u - 0.1, u + 0.1, y, y + 0.272, 0.09, 0.29);
        g.block('fine', '#d8c8a5', f, u - 0.077, u + 0.077, y + 0.07, y + 0.16, 0.29, 0.295);
        g.block('trim', '#7e795d', f, u - 0.054, u + 0.053, y + 0.11, y + 0.118, 0.295, 0.298);
      }
    }
  for (let j = 0; j < 5; j++) {
    const z = v0 + 0.6 + (j * (v1 - v0 - 1.1)) / 4;
    const low = (u) => Math.min(u, u + side * depth),
      high = (u) => Math.max(u, u + side * depth);
    const u = edge - side * 0.66;
    box(g, 'trim', '#997654', low(u), high(u), z - 0.44, z + 0.44, 1.025, 1.17);
    for (const off of [-0.39, 0.39])
      box(g, 'trim', '#b08a5e', low(u), high(u), z + off - 0.024, z + off + 0.024, 1.15, 1.3);
    for (let q = 0; q < 6; q++) {
      const xx = x + side * ((q % 2) - 0.5) * 0.25,
        zz = z + 0.23 * (Math.floor(q / 2) - 1);
      const pos = marketPoint(xx, zz);
      if (kind === 0) {
        const col = ['#af564a', '#d4a34d', '#87a05c'][j % 3];
        g.frustum('trim', col, pos, 1.14, 1.27, 0.102, 0.137, 7, j);
        g.frustum('trim', col, pos, 1.27, 1.36, 0.137, 0.073, 7, j);
      } else if (kind === 1) {
        g.frustum('trim', '#ceab71', pos, 1.14, 1.28, 0.14, 0.131, 8);
        g.frustum('fine', '#d5b279', pos, 1.28, 1.33, 0.131, 0.072, 8);
      } else {
        g.frustum('trim', '#986e50', pos, 1.08, 1.35, 0.1, 0.14, 7);
        for (let j = 0; j < 3; j++) {
          const leaf = marketPoint(xx + Math.cos(j * 2) * 0.09, zz + Math.sin(j * 2) * 0.07);
          g.bar('trim', '#71845f', atY(pos, 1.28), atY(leaf, 1.57 + 0.06 * j), 0.015, 4);
          g.frustum(
            'trim',
            ['#c88883', '#d3a567', '#c699ad'][j],
            leaf,
            1.53 + 0.06 * j,
            1.63 + 0.06 * j,
            0.075,
            0.09,
            6,
          );
        }
      }
    }
  }
  for (const z of [v0 + 0.45, middle, v1 - 0.4])
    box(
      g,
      'trim',
      color,
      Math.min(wall, wall + side * 0.15),
      Math.max(wall, wall + side * 0.15),
      z - 0.064,
      z + 0.064,
      1.03,
      2.83,
    );
}
function laneCoordinates(avenues) {
  return [1, 2, 3, 4].map((id) => {
    const pts = avenues
      .filter((a) => a[0] === id)
      .flatMap((a) => a[1].map(invert))
      .sort((a, b) => a[1] - b[1]);
    return {
      points: pts,
      min: pts[0][1],
      max: pts.at(-1)[1],
      at(v) {
        let i = 1;
        while (i < pts.length - 1 && pts[i][1] < v) i++;
        const a = pts[i - 1],
          b = pts[i];
        return a[0] + (b[0] - a[0]) * Math.max(0, Math.min(1, (v - a[1]) / (b[1] - a[1] || 1)));
      },
    };
  });
}
export function buildMarket(scene, data) {
  const group = new T.Group(),
    cover = new T.Group();
  group.name = 'Oxford Covered Market';
  group.userData.pocket = 'market';
  cover.name = 'Lift-off roof';
  group.add(cover);
  scene.add(group);
  const fabric = batch(),
    inside = batch(),
    interior = new T.Group(),
    roofs = batch(),
    ring = data.buildings.find((b) => b[0] === 'w3663178')[1][0];
  group.add(interior);
  let g = fabric;
  const poly = ring.map(invert),
    lanes = laneCoordinates(data.avenues);
  g.cap('brick', '#c6ab95', ring, 0.055);
  const end = [-2, 9.5, 24.7, 39.3, 48.4];
  for (let k = 0; k < 4; k++) {
    const runs = lightRuns(lanes[k].max - 3);
    roofBand(
      roofs,
      poly,
      end[k],
      end[k + 1],
      (end[k] + end[k + 1]) / 2,
      ['#977767', '#ac8773', '#947d70', '#a88c77'][k],
      runs,
    );
    skylights(roofs, end[k], end[k + 1], lanes[k].max - 3, runs);
  }
  for (const [id, r] of data.buildings.filter((b) => b[3] === 'market' && b[0] !== 'w3663178')) {
    const y = id === 'w1278860864' ? 8.9 : 9.65;
    g.prism('stone', '#bda482', r[0], 4.12, y, r.slice(1));
    ridgeRoof(roofs, r, y, 0.98, '#8e8274', '#bca58a');
    for (const f of faces(r[0]))
      if (f.l > 3.7) {
        const n = Math.max(1, Math.floor(f.l / 3.3));
        for (let j = 0; j < n; j++) sash(g, f, ((j + 0.5) * f.l) / n, 5.03, 1.45, 2.5, { color: '#dbccac' });
      }
  }
  g = inside;
  for (let a = 0; a < 4; a++) {
    const l = lanes[a];
    const route = [];
    for (let v = l.min; v <= l.max; v += 1.6) route.push(marketPoint(l.at(v), v));
    strip(g, 'flagstone', '#cbb6a3', route, 2.7, 0.081);
    for (let v = 9; v < l.max - 2; v += 7.2) {
      const x = l.at(v),
        span = 2.27;
      for (const side of [-1, 1]) {
        const u = x + span * side;
        if (u < 0.1 || u > 47) continue;
        g.frustum('trim', '#67756b', marketPoint(u, v), 0.085, 5.15, 0.13, 0.105, 8);
        g.frustum('trim', '#bbaa8c', marketPoint(u, v), 0.1, 0.43, 0.29, 0.22, 4, 0.76);
      }
      const mid = P(x, 7.45, v),
        left = P(x - span, 5.15, v),
        right = P(x + span, 5.15, v);
      g.bar('trim', '#606b65', left, right, 0.103, 5);
      g.bar('trim', '#736d5a', left, mid, 0.118, 5);
      g.bar('trim', '#736d5a', mid, right, 0.118, 5);
      g.bar('ink', '#6f7568', P(x, 5.17, v), mid, 0.056, 5);
      for (const s of [-1, 1]) {
        g.bar('trim', '#768276', P(x + s * span, 5.16, v), P(x + s * 0.57, 6.83, v), 0.064, 5);
        g.bar('ink', '#68766d', P(x + s * 1.16, 5.16, v), P(x + s * 1.16, 6.27, v), 0.056, 5);
      }
      g.bar('ink', '#635d50', P(x, 5.1, v), P(x, 4.7, v), 0.028, 5);
      g.frustum('trim', '#637667', marketPoint(x, v), 4.49, 4.72, 0.29, 0.1, 10);
      g.frustum('lamp', '#edcc7d', marketPoint(x, v), 4.45, 4.5, 0.23, 0.24, 10);
    }
  }
  const words = ['FLOWERS', 'THE BAKER', 'FRESH FRUIT', 'MARKET TEA', 'PROVISIONS', 'GREENGROCER'];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 10; i++) {
      const v0 = 7.5 + i * 8.8,
        v1 = v0 + 7.45,
        vm = (v0 + v1) / 2;
      if (i === 3 || i === 6 || v1 > Math.min(lanes[row].max, lanes[row + 1].max) - 1) continue;
      const lo = lanes[row].at(vm) + 2.05,
        hi = lanes[row + 1].at(vm) - 2.05;
      if (hi - lo < 3.4) continue;
      const mid = (lo + hi) / 2;
      box(g, 'trim', '#b29879', mid - 0.11, mid + 0.11, v0, v1, 0.11, 3.36);
      for (const end of [v0, v1 - 0.1])
        box(g, 'brick', '#ccb398', lo + 0.7, hi - 0.7, end, end + 0.1, 0.12, 3.27);
      box(g, 'roof', '#827b6a', lo + 0.35, hi - 0.35, v0 - 0.1, v1 + 0.1, 3.38, 3.62);
      for (const side of [-1, 1]) {
        const edge = side < 0 ? lo : hi,
          inner = edge - side * 0.83,
          clr = shades[(row * 2 + i + (side + 1) / 2) % shades.length];
        box(g, 'trim', clr, Math.min(inner, edge), Math.max(inner, edge), v0 + 0.12, v1 - 0.12, 0.22, 1.04);
        box(g, 'trim', clr, Math.min(inner, edge), Math.max(inner, edge), v0 + 0.08, v1 - 0.08, 2.84, 3.19);
        for (let j = 0; j < 6; j++) {
          const va = v0 + 0.2 + (j * (v1 - v0 - 0.4)) / 6,
            vb = va + (v1 - v0 - 0.4) / 6;
          g.quad(
            'trim',
            j % 2 ? '#e4d5b0' : clr,
            P(inner, 2.83, va),
            P(inner, 2.83, vb),
            P(edge + side * 0.45, 2.47, vb),
            P(edge + side * 0.45, 2.47, va),
          );
        }
        stack(g, side, edge, v0, v1, i + row, clr);
        const frontage = frame(marketPoint(edge, v0 + 0.1), marketPoint(edge, v1 - 0.1), side < 0 ? 1 : -1);
        shopJoinery(g, interior, frontage, i + row + (side > 0 ? 1 : 0), clr);
        if ((i + row) % 2 === 0)
          sign(
            interior,
            words[(row + i + (side + 1) / 2) % words.length],
            edge + side * 0.09,
            vm,
            3.05,
            side,
            clr,
          );
        for (const v of [v0 + 0.16, v1 - 0.16])
          g.frustum('trim', '#a38968', marketPoint(edge, v), 0.12, 3.24, 0.13, 0.12, 4);
      }
    }
  // High Street's shopfronts sit over the entrances, with actual voids underneath.
  g = fabric;
  const entrances = lanes.map((l) => l.at(l.min));
  let start = 0;
  for (const opening of [...entrances, 49.25]) {
    const stop = Math.min(46.55, opening - 1.58);
    if (stop > start + 0.3) {
      box(g, 'stone', '#c1a782', start, stop, 0, 3.5, 0, 4.1);
      const face = frame(marketPoint(start, 0), marketPoint(stop, 0), -1);
      if (face.l > 3)
        sash(g, face, face.l / 2, 0.67, Math.min(4.4, face.l * 0.68), 2.7, { color: '#bba479' });
    }
    start = Math.max(start, opening + 1.58);
  }
  box(g, 'stone', '#c8ad84', 0, 46.45, 0, 4.3, 4.13, 7.37);
  const street = frame(marketPoint(0, 0), marketPoint(46.45, 0), -1);
  for (let i = 0; i < 11; i++) sash(g, street, 2.3 + i * 4.1, 4.55, 1.72, 2.13, { color: '#dfc9a2' });
  for (const p of [1, 2, 3])
    sign(group, 'COVERED MARKET', entrances[p], 0.02, 3.78, 1, '#49675a').rotation.y = Math.atan2(-uz, ux);
  const minuteHands = furnishAvenues(inside, interior, lanes, marketPoint);
  g.finish(group, 'High Street frontage');
  inside.finish(interior, 'Avenues and stalls');
  roofs.finish(cover, 'Market roof');
  let lift = 0,
    target = 0;
  const roofMaterials = cover.children.map((m) => {
    const source = m.material;
    m.material = source.clone();
    m.material.onBeforeCompile = source.onBeforeCompile;
    m.material.customProgramCacheKey = source.customProgramCacheKey;
    m.material.transparent = true;
    if (source.name === 'Market roof glazing') m.castShadow = false;
    return [m.material, source.opacity];
  });
  return {
    group,
    cover,
    lanes,
    open(value) {
      target = value ? 1 : 0;
    },
    update(dt, near, hour = 10, night = 0) {
      minuteHands(hour, night);
      interior.visible = near || lift > 0.02;
      lift = T.MathUtils.damp(lift, target, 5.5, dt);
      cover.position.y = lift * 3;
      cover.visible = lift < 0.987;
      for (const [m, opacity] of roofMaterials) {
        m.opacity = (1 - lift) * opacity;
        m.depthWrite = lift < 0.03 && opacity > 0.99;
      }
    },
    get lift() {
      return lift;
    },
  };
}
