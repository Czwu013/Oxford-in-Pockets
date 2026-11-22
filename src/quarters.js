import * as T from 'three';
import quarters from './data/quarters.json';
import map from './magdalen/data/site.json';
import { batch } from './palette.js';
import { detailed } from './landmarks.js';
import { detailedTree } from './place-life.js';
import { plantSite } from './magdalen/life/vegetation.js';
import { frame, ringArea } from './magdalen/architecture/geometry.js';
import { inside } from './magdalen/ground.js';
import { bench, lantern, kerb } from './street-craft.js';
import { drawFabric, nuffieldSpire } from './quarter-fabric.js';
import { buildCivicDetails, isCivicLandmark } from './civic-buildings.js';
import { buildNewCollege, gardenHeight, moundTrees, wallBorder } from './new-college.js';
import { buildMerton } from './merton-college.js';
import { broadHeights, buildBroadStreet, broadGardens } from './broad-street.js';
import { highHeights, buildHighStreet, highGardens } from './high-street.js';
import theatre from './assets/sheldonian.gz';
import sighs from './assets/sighs.gz';

const areas = Object.entries(quarters);
const parcels = new Map(areas.flatMap(([place, q]) => Object.keys(q.buildings).map((id) => [id, place])));
const treeKey = (x, z) => x.toFixed(2) + '/' + z.toFixed(2);
const ownedTrees = new Set(areas.flatMap(([, q]) => q.trees.map(([x, z]) => treeKey(x, z))));
export const hasQuarterTree = (x, z) => ownedTrees.has(treeKey(x, z));
export const isQuarterBuilding = (id) => parcels.has(id);
export const quarterBuilding = (id) => quarters[parcels.get(id)]?.buildings[id];
export const quarterOwner = (id) => parcels.get(id);
function inRings(x, z, rings) {
  return rings.some(([outer, ...holes]) => inside(x, z, outer) && !holes.some((r) => inside(x, z, r)));
}
const architecturalRoofs = {
  ...broadHeights,
  ...highHeights,
  newBell: 32.3,
  newCloister: 6.65,
  newChapel: 20.4,
  newHall: 17.55,
  newMuniment: 16.5,
  mobLibrary: 10.7,
  mobRange: 10.7,
  mobTreasury: 14.2,
  mertonHall: 13.7,
  mertonGate: 11.1,
  fellows: 14.3,
};
export function roofClearance(style, x, z, surveyHeight) {
  if (style?.family === 'mertonChoir')
    return inRings(x, z, quarters.merton.chapelVolumes.crossing) ? 37.5 : 20.1;
  return architecturalRoofs[style?.family] ?? surveyHeight;
}
export function placeAt(x, z) {
  if (inside(x, z, map.boundary.outer)) return 'magdalen';
  return areas.find(([, q]) => inRings(x, z, q.boundary))?.[0];
}
function caps(g, which, material, colour, height) {
  for (const [outer, ...holes] of which) g.cap(material, colour, outer, height, holes);
}
const groundWash = {
  queens: '#d3c6aa',
  univ: '#c8ba9f',
  balliol: '#c7b99d',
  trinity: '#cbbda3',
  newcollege: '#cabea1',
  merton: '#c3b69d',
  ashmolean: '#c5bca6',
  carfax: '#c6b6a1',
  market: '#c9bba0',
  radcliffe: '#ccbfa6',
  christ: '#cdbfa5',
  museum: '#c5bfa6',
  castle: '#c6b79e',
};
function furniture(g, records) {
  for (const [kind, x, z, deg] of records) {
    const a = (deg * Math.PI) / 180;
    if (kind === 'bench') bench(g, [x, z], a);
    if (kind === 'lamp') lantern(g, [x, z], 4.1);
    if (kind === 'bollard') {
      g.frustum('trim', '#58665b', [x, z], 0.03, 0.84, 0.1, 0.075, 7);
      g.frustum('trim', '#b9ac89', [x, z], 0.69, 0.77, 0.083, 0.085, 7);
    }
    if (kind === 'cycles')
      for (let i = 0; i < 3; i++) {
        const X = x + Math.cos(a) * i * 0.88,
          Z = z + Math.sin(a) * i * 0.88;
        const f = frame(
          [X - 0.28 * Math.sin(a), Z + 0.28 * Math.cos(a)],
          [X + 0.28 * Math.sin(a), Z - 0.28 * Math.cos(a)],
        );
        g.bar('trim', '#78877c', f.point(0, 0.02), f.point(0, 0.69), 0.037, 5);
        g.bar('trim', '#78877c', f.point(0, 0.69), f.point(f.l, 0.69), 0.037, 5);
        g.bar('trim', '#78877c', f.point(f.l, 0.69), f.point(f.l, 0.02), 0.037, 5);
      }
    if (kind === 'fountain') g.frustum('fine', '#baa98d', [x, z], 0.02, 0.79, 0.29, 0.21, 9);
  }
}
function publicRealm(group, id, q) {
  const land = batch();
  caps(land, q.land, 'paving', groundWash[id], -0.014);
  caps(land, q.paved, 'flagstone', '#cdbea3', -0.009);
  caps(land, q.grass, 'grass', '#a4b486', -0.004);
  if (['balliol', 'trinity', 'queens', 'univ'].includes(id))
    caps(land, q.courtLawns, 'grass', '#a2b084', -0.002);
  caps(land, q.beds, 'paving', '#b39e7c', 0);
  for (const [kind, mat, col, y] of [
    ['pavement', 'flagstone', '#bfb5a3', 0.004],
    ['road', 'trim', '#92938b', 0.009],
    ['walk', 'paving', '#c6b79b', 0.014],
    ['flags', 'setts', '#beaF97', 0.018],
  ])
    caps(land, q.streets[kind] || [], mat, col, y);
  for (const [outer, ...holes] of q.water) {
    const pond = Math.abs(ringArea(outer)) < 330 && outer.every(([x]) => x > -1175);
    land.cap('water', pond ? '#8ea99a' : '#87a39b', outer, pond ? 0.027 : -1.866, holes);
    if (pond) kerb(land, outer, 0.15, '#b3ad98');
  }
  if (q.broadAsphalt) {
    caps(land, q.broadAsphalt, 'paving', '#a4a199', 0.024);
    caps(land, q.terraces, 'setts', '#b9b4a3', 0.029);
    caps(land, q.gardenPaving || [], 'flagstone', '#c8b99c', 0.024);
  }
  if (q.highPaving) caps(land, q.highPaving, 'flagstone', '#c2b5a0', 0.021);
  if (q.logicSetts) caps(land, q.logicSetts, 'setts', '#a7a192', 0.026);
  for (const l of q.banks)
    for (let i = 1; i < l.length; i++) {
      const f = frame(l[i - 1], l[i]);
      if (f.l > 0.12 && Math.min(f.a[0], f.b[0]) < -1175)
        land.panel('ragstone', '#a49b82', f, 0, f.l, -1.875, -0.012);
    }
  for (const m of land.finish(group, 'Surveyed lanes, courts and gardens')) {
    m.castShadow = false;
    m.userData.quarterSurface = true;
  }
  const edge = batch();
  for (const l of q.walls)
    for (let n = 1; n < l.length; n++) {
      const f = frame(l[n - 1], l[n]);
      if (f.l < 0.65) continue;
      edge.block('ragstone', '#c1ad8c', f, 0, f.l, 0.02, 1.24, -0.15, 0.15);
      edge.block('fine', '#d0c0a2', f, 0, f.l, 1.23, 1.33, -0.2, 0.2);
    }
  furniture(edge, q.furniture);
  edge.finish(group, 'Boundary walls and street furniture');
}
function envelopes(q) {
  const xs = [],
    zs = [];
  for (const [r] of q.boundary)
    for (const [x, z] of r) {
      xs.push(x);
      zs.push(z);
    }
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}
export async function buildQuarters(groups, data) {
  const layers = [];
  for (const [id, q] of areas) {
    const group = new T.Group(),
      trim = new T.Group();
    group.name = id + ' · surrounding streets';
    trim.name = 'Window reveals and arcades';
    groups[id].add(group);
    group.add(trim);
    publicRealm(group, id, q);
    const shell = batch(),
      finish = batch();
    for (const record of data.buildings) {
      const style = q.buildings[record[0]];
      if (
        style &&
        !isCivicLandmark(style.family) &&
        !collegeFamilies.has(style.family) &&
        !Object.hasOwn(broadHeights, style.family) &&
        !Object.hasOwn(highHeights, style.family)
      )
        drawFabric(shell, finish, record, style);
    }
    if (id === 'newcollege') buildNewCollege(shell, q, data.buildings);
    if (id === 'merton') buildMerton(shell, q, data.buildings);
    if (id === 'queens' || id === 'univ') buildHighStreet(shell, id, q, data.buildings);
    const broadClock =
      id === 'balliol' || id === 'trinity' ? buildBroadStreet(shell, id, q, data.buildings, group) : null;
    if (id === 'castle') nuffieldSpire(shell, q.towerPart);
    if (id === 'radcliffe') {
      const [theatreModel, bridgeModel] = await Promise.all([
        detailed(
          'Sheldonian Theatre',
          theatre,
          [q.theatrePoint[0] - 0.19, q.theatrePoint[1] - 0.84],
          0.227,
          group,
        ),
        detailed('Hertford Bridge', sighs, q.bridgePoint, 0.094, group),
      ]);
      theatreModel.scale.set(0.926, 1, 1.18);
      theatreModel.position.y = bridgeModel.position.y = 0.12;
    }
    const plants = plantSite(T, group, {
      trees: [...q.trees, ...(id === 'newcollege' ? moundTrees : [])]
        .filter(([x, z]) => !detailedTree(x, z))
        .map(([x, z, height, radius, conifer]) => ({
          x,
          z,
          height,
          radius,
          kind: conifer === 2 ? 'holm oak' : conifer ? 'evergreen' : 'deciduous',
        })),
      flora: id === 'newcollege' ? wallBorder : highGardens[id] || broadGardens[id] || [],
      heightAt: id === 'newcollege' ? gardenHeight : undefined,
    });
    shell.finish(group, 'Mapped surrounding buildings');
    finish.finish(trim, 'Street and courtyard elevations');
    const clock =
      id === 'ashmolean' || id === 'carfax' ? buildCivicDetails(group, id, q, data.buildings) : broadClock;
    layers.push({ id, trim, plants, clock, box: envelopes(q) });
  }
  return (sim, pose) => {
    for (const l of layers) {
      const [x0, z0, x1, z1] = l.box;
      const dx = Math.max(0, x0 - pose.x, pose.x - x1),
        dz = Math.max(0, z0 - pose.z, pose.z - z1);
      l.trim.visible = pose.span < 550 && Math.hypot(dx, dz) < Math.max(155, pose.span * 0.86);
      l.plants.update({ ...sim, snow: sim.landSnow });
      l.clock?.(sim.solarHour, sim.weights);
    }
  };
}
const collegeFamilies = new Set([
  'newCloister',
  'newBell',
  'newChapel',
  'newOldQuad',
  'newHolywell',
  'newHall',
  'newMuniment',
  'mertonChoir',
  'mertonGate',
  'mertonHall',
  'mobLibrary',
  'mobRange',
  'mobTreasury',
  'fellows',
]);
