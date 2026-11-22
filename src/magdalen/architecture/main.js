import { Stonework } from './geometry.js';
import { makeMaterials } from './materials.js';
import { greatTower, foundersTower, munimentTower, swithunTower } from './towers.js';
import { cloister, chapel, hall } from './college.js';
import { contextBuilding, newBuilding } from './ranges.js';
import { riversideRanges, oldKitchen, gothicks } from './riverside.js';

const builders = {
  'great-tower': greatTower,
  'founders-tower': foundersTower,
  'muniment-tower': munimentTower,
  'swithun-tower': swithunTower,
  chapel,
  cloister,
  hall,
  'new-building': newBuilding,
  'porters-lodge': contextBuilding,
  context: contextBuilding,
};
const mappedRanges = { w297556577: riversideRanges, w77881441: oldKitchen, w297556575: gothicks };
export function buildArchitecture(T, scene, map) {
  const paint = makeMaterials(T),
    block = new T.Group();
  block.name = 'Magdalen College · architectural model';
  const core = new Stonework(T, paint.materials),
    neighbours = new Stonework(T, paint.materials),
    tower = new Stonework(T, paint.materials);
  for (const b of map.buildings) {
    if (!b.outer || b.outer.length < 3) continue;
    const g =
      b.role === 'great-tower' ? tower : b.role === 'context' && !mappedRanges[b.id] ? neighbours : core;
    (mappedRanges[b.id] || builders[b.role] || contextBuilding)(g, b);
  }
  core.finish(block, 'College fabric');
  const contextMeshes = neighbours.finish(block, 'Neighbouring buildings');
  const towerPick = tower.finish(block, 'Great Tower');
  for (const m of towerPick) m.userData.landmark = 'great-tower';
  scene.add(block);
  return { update: paint.update, towerPick, contextMeshes };
}
