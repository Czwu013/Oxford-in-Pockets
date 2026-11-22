import * as T from 'three';
import { faces, atY, orientedBox } from './magdalen/architecture/geometry.js';
import { batch, gray, ridgeRoof, strip } from './palette.js';
import { detailedTree } from './place-life.js';
import { hasQuarterTree, isQuarterBuilding } from './quarters.js';
import outside from './data/quarter-context.json';

const widths = {
  primary: 10.3,
  secondary: 8.6,
  tertiary: 7,
  residential: 5.8,
  unclassified: 5.6,
  service: 3.4,
  living_street: 4,
  pedestrian: 6,
  footway: 1.65,
  path: 1.4,
  cycleway: 2,
  steps: 1.6,
};
const roofs = ['#aaaba7', '#afafaa', '#b7b7b2', '#a4a5a3', '#b6b6b2'];
const walls = ['#c7c6bf', '#c1c1bb', '#cdcdc7', '#c6c6c1', '#c0c1bc'];
export function buildCity(scene, data) {
  const land = batch(gray),
    road = batch(gray),
    green = batch(gray),
    tiles = new Map(),
    group = new T.Group();
  scene.add(group);
  for (const r of data.land) {
    land.cap('ground', '#deded7', r[0], -0.15, r.slice(1));
    for (const ring of r)
      for (const f of faces(ring)) land.panel('ground', '#ababaa', f, 0, f.l, -5.3, -0.15);
  }
  for (const [i, r] of data.water.entries())
    for (const rr of outside.water[i] || [r]) land.cap('ground', '#abb6b4', rr[0], -1.89, rr.slice(1));
  for (const [i, r] of data.green.entries())
    for (const rr of outside.green[i] || [r]) green.cap('grass', '#bfc3bb', rr[0], -0.115, rr.slice(1));
  for (const [i, [typ, l]] of data.streets.entries()) {
    const w = widths[typ] || 2;
    if (i in outside.streets) {
      const [apron, lane] = outside.streets[i];
      for (const [r, ...holes] of apron)
        road.cap('ground', w > 3.5 ? '#b0b1ab' : '#c7c8c1', r, -0.074, holes);
      for (const [r, ...holes] of lane) road.cap('ground', w > 4 ? '#c5c7bf' : '#d7d8d0', r, -0.032, holes);
      continue;
    }
    strip(road, 'ground', w > 3.5 ? '#b0b1ab' : '#c7c8c1', l, w + 1.55, -0.074);
    strip(road, 'ground', w > 4 ? '#c5c7bf' : '#d7d8d0', l, w, -0.032);
  }
  const receivers = [
    ...land.finish(group, 'City section'),
    ...green.finish(group, 'Parkland'),
    ...road.finish(group, 'Surveyed streets'),
  ];
  for (const mesh of receivers) mesh.castShadow = false;
  for (const [id, r, h, pocket] of data.buildings) {
    if (pocket || isQuarterBuilding(id)) continue;
    const outer = r[0],
      n = Number(id.slice(1)),
      j = n % walls.length,
      tag = Math.floor(outer[0][0] / 230) + ',' + Math.floor(outer[0][1] / 230);
    if (!tiles.has(tag)) tiles.set(tag, batch(gray));
    const g = tiles.get(tag);
    const roof = roofs[(n * 3) % roofs.length],
      wall = walls[j];
    for (const ring of r) for (const f of faces(ring)) g.panel('wall', wall, f, 0, f.l, -0.16, h);
    const b = orientedBox(outer),
      rise = r.length === 1 && b && b.W > 2 && b.W < 31 ? Math.min(b.W * 0.24, 3.35) : 0;
    ridgeRoof(g, r, h, rise, roof, wall, 'roof', 'wall');
    const near = [
      [0, 0],
      [-520, -171],
      [-706, -86],
      [-650, 185],
      [-642, -747],
      [-1141, 12],
    ].some(([x, z]) => Math.hypot(outer[0][0] - x, outer[0][1] - z) < 140);
    if (near)
      for (const f of faces(outer)) {
        if (f.l < 4.2) continue;
        const bays = Math.min(26, Math.max(1, Math.floor(f.l / 4.1))),
          step = f.l / bays,
          floors = Math.max(1, Math.min(4, Math.floor((h - 0.5) / 3.1)));
        g.block('wall', '#c3c3bd', f, 0, f.l, h - 0.27, h + 0.06, 0, 0.19);
        for (let j = 0; j < bays; j++)
          for (let k = 0; k < floors; k++) {
            const x = (j + 0.5) * step,
              w = Math.min(step * 0.43, 1.66),
              y = 1.13 + (k * (h - 0.7)) / floors,
              top = Math.min(y + 1.63, h - 0.41);
            if (top <= y) continue;
            g.panel('wall', '#959895', f, x - w / 2, x + w / 2, y, top, 0.036);
            g.panel('wall', '#c1c3bc', f, x - 0.052, x + 0.052, y, top, 0.047);
            g.panel(
              'wall',
              '#c1c3bc',
              f,
              x - w / 2,
              x + w / 2,
              y + (top - y) * 0.55,
              y + (top - y) * 0.55 + 0.075,
              0.047,
            );
          }
      }
    if (n % 5 === 0 && b?.W > 5 && b.L > 10 && r.length === 1 && outer.length < 12) {
      const chimney = b.at(b.L * 0.31, b.W * 0.45);
      g.frustum('wall', '#aaa9a5', chimney, h + rise * 0.88, h + rise + 1.1, 0.53, 0.52, 4, 0.6);
    }
  }
  for (const [key, g] of tiles) g.finish(group, 'City block ' + key);
  const trees = batch(gray);
  for (const [x, z] of data.trees) {
    if (detailedTree(x, z) || hasQuarterTree(x, z)) continue;
    const seed = Math.abs(Math.round(x * 17 + z * 31));
    const h = 4.8 + (seed % 5);
    trees.frustum('wall', '#999b94', [x, z], 0, h * 0.62, 0.3, 0.17, 5);
    const rad = h * 0.32;
    let last = 0;
    for (const [f, r] of [
      [0.35, 0.24],
      [0.47, 0.84],
      [0.65, 1],
      [0.82, 0.83],
      [1, 0.13],
    ]) {
      if (last)
        trees.frustum(
          'grass',
          seed % 2 ? '#afb4a9' : '#b9bcb4',
          [x, z],
          last[0] * h,
          f * h,
          last[1] * rad,
          r * rad,
          9,
          seed % 6,
        );
      last = [f, r];
    }
  }
  trees.finish(group, 'Surveyed grey trees');
  group.name = 'Oxford · monochrome city';
  return group;
}
