import * as T from 'three';
import museumAsset from './assets/museum.gz';
import detail from './data/districts.json';
import { detailed } from './landmarks.js';
import { batch, strip } from './palette.js';
import { faces, atY } from './magdalen/architecture/geometry.js';
import { lancet, coping } from './magdalen/architecture/masonry.js';
import { kerb, bench, fence, downpipe } from './street-craft.js';

const { origin, axis, lawn, rear, hallUV } = detail.museum;
export const museumPoint = (u, v) => [
  origin[0] + axis[0] * u + axis[1] * v,
  origin[1] + axis[1] * u - axis[0] * v,
];
const P = (u, v, y) => atY(museumPoint(u, v), y);
const sills = ['#9f725d', '#c1ad8e', '#e0ccb1', '#a79575'];
const dark = '#505d60',
  steel = '#858e87';
function outline(rx, rv, y) {
  return [
    [-rx, 4.2 - rv, y],
    [rx, 4.2 - rv, y],
    [rx, 4.2 + rv, y],
    [-rx, 4.2 + rv, y],
  ];
}
const base = outline(4.12, 4.38, 22.94),
  top = outline(0.14, 1.27, 35.26);

// Face parameters s (across) and t (up) define both the apertures and the
// flight destinations. A hood shelters a real pocket in the sloping slate.
function roofFace(g, i, nests) {
  const j = (i + 1) % 4,
    normal2 = faces(base.map(([u, v]) => museumPoint(u, v)))[i];
  function point(s, t, out = 0) {
    const interp = (k) =>
      T.MathUtils.lerp(
        T.MathUtils.lerp(base[i][k], base[j][k], s),
        T.MathUtils.lerp(top[i][k], top[j][k], s),
        t,
      );
    const p = P(interp(0), interp(1), interp(2));
    p[0] += normal2.nx * out;
    p[2] += normal2.nz * out;
    return p;
  }
  const holes = [],
    vents = [];
  for (const [row, level] of [0.135, 0.307, 0.483, 0.663].entries()) {
    const cols = i % 2 ? [4, 4, 3, 2][row] : [4, 3, 2, 1][row];
    const faceWidth = Math.hypot(...point(1, level).map((v, k) => v - point(0, level)[k]));
    for (let c = 0; c < cols; c++) {
      const s = (c + 0.65) / (cols + 0.3),
        ws = 0.23 / faceWidth,
        ht = 0.54 / (35.26 - 22.94);
      const ring = [
        [s - ws, level],
        [s - ws, level + ht * 0.42],
        [s - ws * 0.75, level + ht * 0.78],
        [s, level + ht],
        [s + ws * 0.75, level + ht * 0.78],
        [s + ws, level + ht * 0.42],
        [s + ws, level],
      ];
      holes.push(ring);
      vents.push({ s, level, ws, ht, ring });
    }
  }
  // Triangulate on the actual planar face, then project to world. Width decreases
  // towards the ridge, so the plan uses real lateral metres rather than a UV rectangle.
  const loWidth = normal2.l,
    hiWidth = Math.hypot(...point(1, 1).map((v, k) => v - point(0, 1)[k]));
  const profile = ([s, t]) => [(s - 0.5) * T.MathUtils.lerp(loWidth, hiWidth, t), t];
  const back = ([x, t]) => point(0.5 + x / T.MathUtils.lerp(loWidth, hiWidth, t), t);
  for (const tri of g.planTriangles(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(profile),
    holes.map((r) => r.map(profile)),
  ))
    g.tri('roof', ['#687476', '#738187', '#6a797f', '#71808a'][i], ...tri.map(back));
  for (const { s, level, ht, ring } of vents) {
    const lip = ring.map(([u, v], k) => point(u, v, 0.26 * (1 - (v - level) / ht) + 0.065));
    const rear = ring.map(([u, v]) => point(u, v, -0.53));
    for (let k = 0; k < ring.length; k++) {
      const n = (k + 1) % ring.length;
      g.quad('trim', '#4a5552', point(...ring[k]), point(...ring[n]), rear[n], rear[k]);
      if (k < ring.length - 1) {
        g.quad('lead', k % 3 === 0 ? '#a6aea6' : steel, point(...ring[k]), point(...ring[n]), lip[n], lip[k]);
        g.bar('trim', '#9ca399', lip[k], lip[n], 0.022, 5);
      }
    }
    const mid = point(s, level + ht * 0.38, -0.55);
    for (let k = 1; k < rear.length; k++) g.tri('ink', '#353e3b', mid, rear[k - 1], rear[k]);
    const width = (ring.at(-1)[0] - ring[0][0]) * 0.5;
    const ribs = [
      [1, 0.035, 0.3],
      [0.95, 0.25, 0.23],
      [0.68, 0.58, 0.13],
      [0.23, 0.89, 0.036],
      [0.045, 0.98, 0.012],
    ];
    const arc = (entry, k) => {
      const [spread, rise, stand] = entry,
        angle = (k * Math.PI) / 12;
      return point(
        s + width * spread * Math.cos(angle),
        level + ht * (rise + 0.32 * spread * Math.sin(angle)),
        stand + 0.055 * spread * Math.sin(angle),
      );
    };
    for (let j = 1; j < ribs.length; j++)
      for (let k = 0; k < 12; k++) {
        g.quad(
          'trim',
          ['#899394', '#949c9b', '#a3a8a2', '#a9afa9'][Math.min(3, Math.floor(k / 3))],
          arc(ribs[j - 1], k),
          arc(ribs[j - 1], k + 1),
          arc(ribs[j], k + 1),
          arc(ribs[j], k),
        );
        if (j === 1) g.bar('trim', '#939d9e', arc(ribs[0], k), arc(ribs[0], k + 1), 0.013, 5);
      }
    nests.push({
      side: i,
      row: Math.round(level * 100),
      mouth: point(s, level + ht * 0.29, 0.27),
      inner: point(s, level + ht * 0.29, -0.3),
      normal: [normal2.nx, 0, normal2.nz],
    });
  }
  // Fine slate joints follow the taper; their spacing stays in world metres.
  for (let k = 1; k < 40; k++) {
    const t = k / 41;
    const segments = vents
      .filter((v) => t >= v.level - 0.009 && t < v.level + v.ht + 0.007)
      .map((v) => [v.s - v.ws - 0.005, v.s + v.ws + 0.005]);
    let last = 0.004;
    for (const [l, r] of [...segments, [0.996, 0.996]]) {
      if (l > last) g.bar('trim', '#59676a', point(last, t, 0.009), point(l, t, 0.009), 0.015, 4);
      last = r;
    }
  }
  g.bar('lead', '#a1a69a', point(0, 0, 0.025), point(0, 1, 0.025), 0.054, 6);
}
function glassCourt(g) {
  const [u0, u1, v0, v1] = hallUV;
  const bays = [
    [-16.76, -10.65, 14.7, 2.6],
    [-10.65, -7.5, 13.0, 1.1],
    [-7.5, 7.5, 15.25, 4.7],
    [7.5, 10.65, 13, 1.1],
    [10.65, 16.76, 14.7, 2.6],
  ];
  for (const [a, b, y, h] of bays) {
    const curve = (i, v) => P(a + ((b - a) * i) / 12, v, y + h * Math.sin((Math.PI * i) / 12));
    for (let i = 0; i < 12; i++) {
      for (let k = 0; k < 15; k++) {
        const va = v0 + ((v1 - v0) * k) / 15,
          vb = v0 + ((v1 - v0) * (k + 1)) / 15;
        g.quad(
          'skylight',
          ['#9dadae', '#a6b5b4', '#a1b2b3', '#a7b5b3'][(k + Math.floor(i / 2)) % 4],
          curve(i, va),
          curve(i + 1, va),
          curve(i + 1, vb),
          curve(i, vb),
        );
        if (i % 2 === 0) g.bar('trim', '#718480', curve(i, va), curve(i, vb), 0.043, 5);
        g.bar(
          'trim',
          k % 3 === 0 ? '#6c7974' : '#84918a',
          curve(i, va),
          curve(i + 1, va),
          k % 3 === 0 ? 0.074 : 0.034,
          5,
        );
      }
    }
    for (const v of [v0, v1]) {
      for (let i = 0; i < 12; i++)
        g.quad(
          'glass',
          '#9caeaa',
          curve(i, v),
          curve(i + 1, v),
          P(a + ((b - a) * (i + 1)) / 12, v, 12.8),
          P(a + ((b - a) * i) / 12, v, 12.8),
        );
    }
    for (let k = 0; k <= 5; k++) {
      const v = v0 + ((v1 - v0) * k) / 5;
      for (const u of [a, b]) {
        g.frustum('trim', '#778678', museumPoint(u, v), 0.1, y, 0.18, 0.115, 8);
        g.bar('trim', '#859481', P(u, v, y - 1.2), P(u + (u === a ? 1 : -1) * 0.78, v, y + 0.16), 0.073, 6);
      }
    }
  }
  g.cap(
    'flagstone',
    '#c0b49b',
    [museumPoint(u0, v0), museumPoint(u1, v0), museumPoint(u1, v1), museumPoint(u0, v1)],
    0.08,
  );
}
function lawnDetails(g) {
  g.cap('grass', '#9eac81', lawn, 0.018);
  kerb(g, lawn, 0.076, '#bcae94');
  const approach = [museumPoint(0, -49), museumPoint(-0.65, -27), museumPoint(0, -0.7)];
  strip(g, 'flagstone', '#c9bba2', approach, 2.08, 0.083);
  // Cast footprints run diagonally across the lawn, alternating left and right.
  for (let j = 0; j < 22; j++) {
    const t = j / 21,
      u = -23.5 + t * 43 + (j % 2 ? 0.25 : -0.25),
      v = -37 + t * 26;
    const A = (du, dv) => museumPoint(u + du * 0.9 - dv * 0.42, v + du * 0.42 + dv * 0.9);
    const bed = [
      [-0.47, -0.41],
      [0.72, -0.35],
      [0.84, 0.19],
      [0.48, 0.58],
      [-0.51, 0.47],
      [-0.72, -0.02],
    ].map((p) => A(...p));
    g.prism('ragstone', j % 3 === 1 ? '#a4a38c' : '#b7b19a', bed, 0.025, 0.074);
    const toe = [
      [-0.25, -0.23],
      [0.04, -0.11],
      [0.42, -0.3],
      [0.18, 0.015],
      [0.58, 0.23],
      [0.095, 0.14],
      [0.09, 0.44],
      [-0.12, 0.17],
      [-0.27, 0.12],
    ].map((p) => A(...p));
    g.cap('paving', '#797f6d', toe, 0.077);
  }
  bench(g, museumPoint(12, -6.5), Math.atan2(axis[1], axis[0]));
  bench(g, museumPoint(-14, -6.6), Math.atan2(axis[1], axis[0]));
  const redwood = [-689.41, -749.39],
    ring = Array.from({ length: 17 }, (_, i) => [
      redwood[0] + 3.5 * Math.cos((i * Math.PI) / 8),
      redwood[1] + 3.5 * Math.sin((i * Math.PI) / 8),
    ]);
  fence(g, ring, () => 0.06, 0.86);
}
export async function buildMuseum(scene) {
  const group = new T.Group();
  group.name = 'University Museum and west lawn';
  group.userData.pocket = 'museum';
  scene.add(group);
  const front = await detailed(
    'Museum west front',
    museumAsset,
    origin,
    Math.atan2(-axis[1], axis[0]),
    group,
  );
  front.traverse((o) => {
    if (/steep.slate.tower/i.test(o.name)) o.visible = false;
  });
  const g = batch(),
    nests = [];
  for (let i = 0; i < 4; i++) roofFace(g, i, nests);
  for (const v of [2.93, 5.47]) {
    const p = museumPoint(0, v);
    g.frustum('lead', steel, p, 35.19, 35.87, 0.12, 0.08, 10);
    g.frustum('trim', '#838c7a', p, 35.8, 35.98, 0.18, 0.12, 8);
    g.frustum('lead', '#858b82', p, 35.96, 36.67, 0.083, 0.012, 8);
  }
  for (const rr of rear) {
    for (const ring of rr)
      for (const f of faces(ring)) {
        g.panel('stone', '#c9b797', f, 0, f.l, 0.02, 12.55);
        coping(g, f, 12.49, { color: '#cbbca4' });
        if (f.l < 4.7) continue;
        const n = Math.floor(f.l / 4.6);
        for (let j = 0; j < n; j++)
          for (const y of [2.45, 7.85])
            lancet(g, f, (f.l * (j + 0.5)) / n, y, 2.04, 3.16, 2, {
              glass: '#81908c',
              trim: sills[(j + 1) % 4],
              n: 8,
            });
        if (f.l > 12) downpipe(g, f, 0.6, 12.62);
      }
  }
  for (const tri of detail.museum.roofs)
    g.tri('roof', '#778489', ...tri.map(([x, z, lift]) => [x, 12.55 + lift, z]));
  for (const [u, v] of [
    [-21, 17.4],
    [-21.4, 31.8],
    [21.5, 15.1],
    [21.7, 29.4],
  ]) {
    const c = museumPoint(u, v);
    g.frustum('stone', '#bcac94', c, 14.22, 17.12, 0.52, 0.5, 4, 0.44);
    g.frustum('fine', '#cfbea2', c, 17.05, 17.31, 0.61, 0.61, 4, 0.44);
    for (const x of [-0.19, 0.19])
      g.frustum('trim', '#aa816a', museumPoint(u + x, v), 17.28, 17.72, 0.13, 0.15, 8);
  }
  glassCourt(g);
  lawnDetails(g);
  g.finish(group, 'Slate tower, glass court and lawn');
  return { group, nests };
}
