import * as T from 'three';
import quarters from './data/quarters.json';
import ecology from './magdalen/data/ecology.json';
import { inside } from './magdalen/ground.js';
import { seeded } from './magdalen/architecture/geometry.js';
import { moundHeight } from './castle.js';
import { quadHeight } from './college-craft.js';
import { gardenHeight, moundTrees } from './new-college.js';

function inParcel(x, z, rings) {
  return inside(x, z, rings[0]) && !rings.slice(1).some((r) => inside(x, z, r));
}
function obstacleIndex(buildings) {
  const cells = new Map(),
    cell = 32,
    key = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
  for (const [, rings] of buildings) {
    const xs = rings[0].map((p) => p[0]),
      zs = rings[0].map((p) => p[1]);
    for (let x = Math.floor(Math.min(...xs) / cell); x <= Math.floor(Math.max(...xs) / cell); x++)
      for (let z = Math.floor(Math.min(...zs) / cell); z <= Math.floor(Math.max(...zs) / cell); z++) {
        const id = x + ',' + z;
        if (!cells.has(id)) cells.set(id, []);
        cells.get(id).push(rings);
      }
  }
  return (x, z) => cells.get(key(x, z))?.some((rings) => inParcel(x, z, rings));
}

// One gently folded blade, coloured per instance. Its central ridge catches the
// sun as it rolls. Every lane starts on a particular deciduous tree in the map.
function leafGeometry() {
  const g = new T.BufferGeometry();
  g.setAttribute(
    'position',
    new T.Float32BufferAttribute(
      [
        -0.55, 0.01, 0, -0.23, 0.01, -0.24, 0.2, 0.015, -0.21, 0.55, 0, 0.005, 0.13, 0, 0.22, -0.26, 0, 0.215,
        -0.02, 0.13, 0, -0.67, 0, 0.015, -0.51, 0, 0.027, -0.54, 0.015, -0.022,
      ],
      3,
    ),
  );
  g.setIndex([0, 6, 1, 1, 6, 2, 2, 6, 3, 3, 6, 4, 4, 6, 5, 5, 6, 0, 7, 8, 9]);
  g.computeVertexNormals();
  return g;
}
export function fallingFoliage(scene, city, magSurfaces) {
  const blocked = obstacleIndex(city.buildings),
    lanes = [],
    colour = new T.Color(),
    dummy = new T.Object3D();
  const spring = ['#bc965a', '#b59e65', '#ae8b55', '#cbaf70'].map((c) => new T.Color(c));
  const autumn = ['#ba682d', '#d19336', '#d6ae45', '#b25f30'].map((c) => new T.Color(c));
  function addTree(id, x, z, h, r, mag = false) {
    const rand = seeded(Math.abs(Math.round(x * 37 + z * 83)) + 311);
    const base = mag
      ? magSurfaces.sample(x, z).y
      : Math.max(0.14, moundHeight(x, z), quadHeight(x, z), gardenHeight(x, z));
    if (base < -0.5 || base > 22) return;
    const water = quarters[id]?.water || [];
    const shift = rand();
    let accepted = 0;
    for (let j = 0; j < 18 && accepted < 9; j++) {
      const a = rand() * Math.PI * 2,
        extent = (0.55 + 0.41 * rand()) * r;
      const sx = x + Math.cos(a) * extent,
        sz = z + Math.sin(a) * extent;
      const dx = 1.3 + rand() * 2.9,
        dz = (rand() - 0.32) * 3.8,
        bend = 0.49 + rand() * 0.44;
      let ground = base,
        clear = true;
      for (let k = 0; k <= 8; k++) {
        const f = k / 8,
          px = sx + dx * f + Math.sin(f * Math.PI * 3) * bend,
          pz = sz + dz * f + Math.sin(f * Math.PI * 4) * bend * 0.53;
        if (mag) {
          const hit = magSurfaces.sample(px, pz);
          if (['roof', 'stone', 'outside', 'water'].includes(hit.kind)) {
            clear = false;
            break;
          }
          ground = hit.y;
        } else {
          if (blocked(px, pz) || water.some((rings) => inParcel(px, pz, rings))) {
            clear = false;
            break;
          }
          ground = Math.max(0.14, moundHeight(px, pz), quadHeight(px, pz), gardenHeight(px, pz));
        }
      }
      if (!clear) continue;
      const fall = 4.15 + h * 0.19 + rand() * 1.3,
        still = 4 + rand() * 4,
        cycle = fall + still + 3 + rand() * 5;
      lanes.push({
        id,
        x: sx,
        z: sz,
        y: base + h * (0.5 + rand() * 0.29),
        dx,
        dz,
        bend,
        ground: ground + 0.075,
        fall,
        still,
        cycle,
        phase: ((shift + ((accepted % 3) + rand() * 0.18) / 3 + Math.floor(accepted / 3) * 0.09) % 1) * cycle,
        yaw: rand() * 6.28,
        spin: 0.8 + rand() * 1.2,
        size: 0.17 + rand() * 0.09,
        slot: accepted++,
        tone: Math.floor(rand() * 4),
      });
    }
  }
  for (const t of ecology.trees)
    if (!/evergreen|yew|cedar|conifer/i.test(t.kind)) addTree('magdalen', t.x, t.z, t.height, t.radius, true);
  for (const [id, q] of Object.entries(quarters))
    for (const [x, z, h, r, conifer] of q.trees) if (!conifer) addTree(id, x, z, h, r);
  for (const [x, z, h, r] of moundTrees) addTree('newcollege', x, z, h, r);
  const mesh = new T.InstancedMesh(
    leafGeometry(),
    new T.MeshLambertMaterial({
      color: 0xffffff,
      side: T.DoubleSide,
      flatShading: true,
    }),
    lanes.length,
  );
  mesh.name = 'Deciduous leaves in the wind and at rest';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.receiveShadow = true;
  scene.add(mesh);
  let stats = {};
  function update(time, sim, pose, scope) {
    let n = 0,
      airborne = 0,
      settled = 0,
      nearest = null,
      best = Infinity;
    const limit = Math.min(119, pose.span * 0.77 + 19),
      springWeight = sim.weights[0],
      autumnWeight = sim.weights[2];
    if (pose.span < 460 && springWeight + autumnWeight > 0.002) {
      for (const t of lanes) {
        if (scope && t.id !== scope) continue;
        const distance = (t.x - pose.x) ** 2 + (t.z - pose.z) ** 2;
        if (distance > limit * limit) continue;
        // Magdalen and the two trees on the mound have their own autumn shedding simulation.
        const residentAutumn =
          t.id === 'magdalen' || (t.id === 'castle' && Math.abs(t.x + 1142) < 15 && Math.abs(t.z + 19) < 6);
        const amount = (t.slot < 3 ? springWeight : 0) + (residentAutumn ? 0 : autumnWeight);
        if (amount < 0.008) continue;
        const age = (time + t.phase) % t.cycle;
        if (age > t.fall + t.still) continue;
        const f = Math.min(1, age / t.fall),
          move = Math.sin(Math.PI * f);
        const x = t.x + t.dx * f + Math.sin(f * Math.PI * 3) * t.bend,
          z = t.z + t.dz * f + Math.sin(f * Math.PI * 4) * t.bend * 0.53;
        const y = T.MathUtils.lerp(t.y, t.ground, f) + move * (0.155 * Math.sin(f * Math.PI * 7) + 0.105);
        const fade = Math.min(1, age / 0.52, (t.fall + t.still - age) / 1.3);
        dummy.position.set(x, y, z);
        dummy.rotation.set(
          move * (Math.sin(age * 2.9 + t.yaw) * 0.74 + 0.29),
          t.yaw + f * t.spin * 2.6,
          move * Math.sin(age * 2.16 + t.yaw) * 1.23 + 0.06,
        );
        dummy.scale.setScalar(t.size * fade * amount);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        colour.copy(spring[t.tone]).lerp(autumn[t.tone], autumnWeight / (springWeight + autumnWeight || 1));
        mesh.setColorAt(n++, colour);
        if (f < 1) {
          airborne++;
          if (distance < best) {
            best = distance;
            nearest = [x, y, z];
          }
        } else settled++;
      }
    }
    mesh.count = n;
    mesh.visible = n > 0;
    if (n) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    }
    stats = { airborne, settled, nearest, lanes: lanes.length, spring: springWeight, autumn: autumnWeight };
  }
  return {
    update,
    inspect: () => ({ ...stats }),
    display: (visible) => {
      mesh.visible = visible && mesh.count > 0;
    },
  };
}
