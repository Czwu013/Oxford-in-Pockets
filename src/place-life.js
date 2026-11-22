import * as T from 'three';
import { plantSite } from './magdalen/life/vegetation.js';
import { moundHeight } from './castle.js';
import { museumPoint } from './museum.js';
import district from './data/districts.json';
import { journeys, broadWalk } from './data/views.js';

// Forecourt and pavement routes in the same local metre grid as the map.
export const civicPaths = [
  broadWalk,
  // North and south footways of the High, the Logic Lane bridleway and the
  // mapped paths across the two college gardens. These tracks do not cross traffic.
  [
    [-377.73, -102.04],
    [-349.14, -100.42],
    [-302.13, -94.52],
    [-287.06, -92.2],
  ],
  [
    [-377.48, -84.32],
    [-368.2, -84.45],
    [-347.62, -82.96],
    [-322.06, -79.45],
  ],
  [
    [-322.98, -70.63],
    [-324.73, -37.75],
    [-327.23, -0.12],
  ],
  [
    [-382.16, -72.61],
    [-380.95, -43.3],
  ],
  [
    [-312.71, -169.66],
    [-311.81, -196.11],
  ],
  [
    [-709.0, -283.3],
    [-711.7, -298.0],
    [-726.2, -356.1],
  ],
  [
    [-798.3, -337.7],
    [-809.0, -379.2],
    [-810.9, -384.4],
    [-791.0, -387.9],
  ],
  ...['newcollege', 'merton'].map((id) => journeys[id].steps.map(({ eye: [x, , z] }) => [x, z])),
  [
    [-403.8, 108.8],
    [-400.0, 123.6],
    [-416.1, 127.8],
    [-419.9, 113.0],
  ],
  [
    [-924.17, -366.02],
    [-933.9, -365.1],
    [-935.71, -372.45],
    [-936.64, -377.23],
  ],
  [
    [-784.0, -9.1],
    [-773.55, 1.31],
    [-764.7, 18.28],
    [-758.39, 37.6],
  ],
];

const trees = [
  { x: -689.41, z: -749.39, kind: 'cedar', height: 22.5, radius: 5.1 },
  { x: -1149.54, z: -20.07, kind: 'deciduous', height: 10.2, radius: 3.7 },
  { x: -1133.5, z: -18.59, kind: 'deciduous', height: 8.6, radius: 3.4 },
];
export const detailedTree = (x, z) => trees.some((t) => Math.abs(t.x - x) < 0.02 && Math.abs(t.z - z) < 0.02);
export function districtLife(groups, pond, placeAt) {
  const flora = [];
  for (const [k, x, z] of [
    [0, -1149, -20],
    [0, -1133, -18],
    [1, -1145, -12],
    [1, -1154, -46],
    [1, -1159, -36],
    [1, -1123, -40],
    [1, -1143, -59],
    [0, -655, -715],
    [0, -561, -218],
  ])
    flora.push({ kind: k ? 'meadow' : 'leaves', x, z, radius: k ? 2.15 : 1.54 });
  for (const [u, v] of [
    [-23, -8],
    [21, -7],
    [-21, -31],
    [25, -32],
  ]) {
    const [x, z] = museumPoint(u, v);
    flora.push({ x, z, kind: 'bed', radius: 1.22 });
  }
  const slopes = [
    [0.44, 20],
    [0.78, 24],
    [1.8, 26],
    [2.32, 16],
    [2.74, 23],
    [3.2, 27],
    [3.7, 22],
    [4.11, 27],
    [4.46, 18],
    [4.83, 24],
    [5.16, 16],
    [5.49, 27],
    [5.91, 20],
    [6.15, 24],
  ];
  for (const [a, r] of slopes)
    flora.push({
      x: district.castle.summit[0] + r * Math.cos(a),
      z: district.castle.summit[1] + r * Math.sin(a),
      kind: 'meadow',
      radius: 1.4,
    });
  const plants = ['castle', 'museum', 'radcliffe'].map((owner) => {
    const belongs = (p) => placeAt(p.x, p.z) === owner;
    return plantSite(T, groups[owner], {
      trees: trees.filter(belongs),
      flora: flora.filter(belongs),
      heightAt: (x, z) => moundHeight(x, z) + 0.045,
    });
  });
  const ripples = new T.Group();
  ripples.position.set(pond[0], 0.448, pond[1]);
  groups.christ.add(ripples);
  for (let i = 0; i < 5; i++) {
    const mat = new T.MeshBasicMaterial({
      color: i % 2 ? '#b4c8b9' : '#a7bdaf',
      transparent: true,
      opacity: 0.33,
      depthWrite: false,
    });
    const m = new T.Mesh(new T.RingGeometry(0.988, 1, 72), mat);
    m.rotation.x = -Math.PI / 2;
    ripples.add(m);
  }
  // Leaves flutter down to the actual motte profile and come to rest on the slope.
  const leaf = new T.BufferGeometry();
  leaf.setAttribute(
    'position',
    new T.Float32BufferAttribute(
      [
        -0.08, 0, -0.026, 0, 0.016, -0.09, 0.08, 0, 0.02, -0.08, 0, -0.026, 0.08, 0, 0.02, 0.008, 0.003,
        0.097,
      ],
      3,
    ),
  );
  leaf.computeVertexNormals();
  const swarm = new T.InstancedMesh(
    leaf,
    new T.MeshLambertMaterial({ color: '#bf8a4c', side: T.DoubleSide }),
    32,
  );
  swarm.frustumCulled = false;
  groups.castle.add(swarm);
  const dummy = new T.Object3D(),
    up = (x, z) => moundHeight(x, z) + 0.1;
  return (t, sim, nearCastle) => {
    for (const plant of plants) plant.update({ ...sim, snow: sim.landSnow });
    for (const [k, m] of ripples.children.entries()) {
      const phase = (t * 0.21 + k / 5) % 1,
        r = 0.43 + 4.92 * phase;
      m.scale.setScalar(r);
      m.material.opacity = 0.28 * (1 - phase);
    }
    swarm.visible = nearCastle && sim.weights[2] > 0.06;
    if (!swarm.visible) return;
    swarm.count = Math.round(32 * sim.weights[2]);
    for (let i = 0; i < swarm.count; i++) {
      const tree = trees[1 + (i % 2)],
        sg = i * 2.42,
        phase = (t * 0.069 + i * 0.317) % 1,
        d = Math.min(1, phase / 0.69);
      const x =
        tree.x +
        Math.cos(sg) * tree.radius * 0.69 +
        1.5 * d +
        0.44 * Math.sin(sg + d * 13) * Math.sin(d * Math.PI);
      const z =
        tree.z +
        Math.sin(sg) * tree.radius * 0.69 +
        0.7 * d +
        0.34 * Math.cos(sg + d * 12) * Math.sin(d * Math.PI);
      const ground = up(x, z),
        y = ground + (1 - d) * (tree.height * 0.7);
      dummy.position.set(x, y, z);
      dummy.rotation.set((1 - d) * Math.sin(sg + 14 * d), sg + 2 * d, (1 - d) * Math.cos(sg + 18 * d));
      dummy.scale.setScalar(phase > 0.96 ? (1 - phase) / 0.04 : Math.min(1, phase / 0.025));
      dummy.updateMatrix();
      swarm.setMatrixAt(i, dummy.matrix);
    }
    swarm.instanceMatrix.needsUpdate = true;
  };
}
export const visitorPaths = [
  [-39, -31, -22, -14, -7].map((v) => museumPoint(1, v)),
  [
    [-1128, 1.5],
    [-1133, 6.2],
    [-1140.9, 9.6],
    [-1152.7, 14.3],
    [-1159.5, 17.3],
  ],
  district.castle.westPath,
];
