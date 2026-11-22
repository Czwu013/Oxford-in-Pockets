import { TAU, clamp, lerp, seeded } from './geometry.js';

const coats = [
  '#627d83',
  '#9d715b',
  '#a4a286',
  '#676879',
  '#b38f70',
  '#6a7464',
  '#785d59',
  '#526871',
  '#baa68e',
];
const trousers = ['#485558', '#595454', '#656455', '#464d5c', '#535b60'];
const skinTones = ['#ce9e81', '#e4b99a', '#bf8f73', '#97735c', '#d7ac8b', '#986e53', '#ab7c60'];
const hairTones = ['#584d40', '#77705f', '#52453b', '#9c8264', '#645142', '#9e9b90'];
const pick = (a, r) => a[Math.floor(r() * a.length)];
const ease = (t) => {
  const v = clamp(t);
  return v * v * (3 - 2 * v);
};
const wrap = (x, n) => ((x % n) + n) % n;
const wrapAngle = (a) => wrap(a + Math.PI, TAU) - Math.PI;

// Express vehicle shells as longitudinal stations. Rounded wheel arches,
// windows, roof pillars and metal fittings are added as separate painted parts.
function shell(T, stations) {
  const verts = [],
    faces = [];
  for (const [z, w, bottom, top, shoulder] of stations) {
    verts.push(
      -w * 0.88,
      bottom,
      z,
      -w,
      bottom + 0.08,
      z,
      -w,
      top - shoulder,
      z,
      -w * 0.83,
      top,
      z,
      w * 0.83,
      top,
      z,
      w,
      top - shoulder,
      z,
      w,
      bottom + 0.08,
      z,
      w * 0.88,
      bottom,
      z,
    );
  }
  const per = 8;
  for (let j = 0; j < stations.length - 1; j++)
    for (let i = 0; i < per; i++) {
      const a = j * per + i,
        b = j * per + ((i + 1) % per);
      faces.push(a, b, a + per, b, b + per, a + per);
    }
  for (let j = 0; j < per - 2; j++) {
    faces.push(0, j + 2, j + 1);
    const end = (stations.length - 1) * per;
    faces.push(end, end + j + 1, end + j + 2);
  }
  const g = new T.BufferGeometry();
  g.setIndex(faces);
  g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

function jacket(T) {
  const ring = [
    [0, 0.64, 0.68],
    [0.13, 0.81, 0.78],
    [0.59, 0.8, 0.77],
    [0.84, 1, 0.84],
    [0.96, 0.84, 0.67],
    [1, 0.54, 0.59],
  ];
  const g = new T.BufferGeometry(),
    pos = [],
    ix = [],
    segs = 8;
  for (const [y, x, z] of ring)
    for (let i = 0; i < segs; i++) {
      const a = (TAU * i) / segs;
      pos.push(x * Math.cos(a), y, z * Math.sin(a));
    }
  for (let j = 0; j < ring.length - 1; j++)
    for (let i = 0; i < segs; i++) {
      const a = j * segs + i,
        b = j * segs + ((i + 1) % segs);
      ix.push(a, a + segs, b, b, a + segs, b + segs);
    }
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}

function opacityPatch(material, depth) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute float lifeOpacity; varying float vLifeOpacity;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvLifeOpacity=lifeOpacity;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying float vLifeOpacity;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      `#include <alphatest_fragment>\nif(vLifeOpacity<0.999 && fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))))>vLifeOpacity) discard;`,
    );
  };
  material.customProgramCacheKey = () => `oxford-miniatures-dissolve-v2-${depth}`;
}

class PaintRack {
  constructor(T, group, capacity) {
    this.T = T;
    this.batches = {};
    this.colors = new Map();
    this.root = new T.Matrix4();
    this.matrix = new T.Matrix4();
    this.position = new T.Vector3();
    this.scale = new T.Vector3();
    this.rotation = new T.Quaternion();
    this.euler = new T.Euler();
    this.up = new T.Vector3(0, 1, 0);
    this.vector = new T.Vector3();
    const bodyStations = [
      [-1.94, 0.66, 0.35, 0.78, 0.11],
      [-1.65, 0.82, 0.31, 0.86, 0.07],
      [-0.7, 0.84, 0.3, 0.89, 0.08],
      [0.72, 0.84, 0.3, 0.84, 0.075],
      [1.58, 0.76, 0.31, 0.72, 0.065],
      [1.85, 0.65, 0.36, 0.69, 0.1],
    ];
    const glassStations = [
      [-1.39, 0.69, 0.75, 0.88, 0.04],
      [-0.91, 0.69, 0.82, 1.31, 0.1],
      [-0.65, 0.66, 0.83, 1.4, 0.1],
      [0.35, 0.65, 0.83, 1.39, 0.1],
      [0.94, 0.69, 0.79, 0.88, 0.04],
    ];
    const boatStations = [
      [-2.85, 0.42, 0.09, 0.36, 0.03],
      [-2.54, 0.5, 0.045, 0.32, 0.03],
      [-1.85, 0.52, 0, 0.28, 0.03],
      [1.82, 0.52, 0, 0.28, 0.03],
      [2.55, 0.49, 0.05, 0.33, 0.03],
      [2.85, 0.4, 0.09, 0.38, 0.03],
    ];
    const shapes = {
      oval: new T.SphereGeometry(1, 8, 5),
      hair: new T.SphereGeometry(1, 8, 4, 0, TAU, 0, Math.PI * 0.58),
      coat: jacket(T),
      box: new T.BoxGeometry(1, 1, 1),
      stem: new T.CylinderGeometry(0.8, 1, 1, 6),
      wheel: new T.TorusGeometry(1, 0.08, 5, 14),
      car: shell(T, bodyStations),
      glass: shell(T, glassStations),
      boat: shell(T, boatStations),
    };
    const surface = new T.MeshLambertMaterial({ side: T.DoubleSide });
    opacityPatch(surface, false);
    const depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, side: T.DoubleSide });
    opacityPatch(depth, true);
    for (const [name, g] of Object.entries(shapes)) {
      const attr = new T.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(
        T.DynamicDrawUsage,
      );
      g.setAttribute('lifeOpacity', attr);
      const mesh = new T.InstancedMesh(g, surface, capacity);
      mesh.name = 'Miniatures · ' + name;
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.customDepthMaterial = depth;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      group.add(mesh);
      this.batches[name] = { mesh, attr, used: 0, keys: [], colorDirty: false, alphaDirty: false };
    }
  }
  begin() {
    for (const b of Object.values(this.batches)) {
      b.used = 0;
      b.colorDirty = false;
      b.alphaDirty = false;
    }
  }
  finish() {
    for (const b of Object.values(this.batches)) {
      b.mesh.count = b.used;
      if (!b.used) continue;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.colorDirty) b.mesh.instanceColor.needsUpdate = true;
      if (b.alphaDirty) b.attr.needsUpdate = true;
    }
  }
  place(x, y, z, yaw, size, alpha = 1, pitch = 0) {
    this.position.set(x, y, z);
    this.rotation.setFromEuler(this.euler.set(pitch, yaw, 0, 'YXZ'));
    this.scale.setScalar(size);
    this.root.compose(this.position, this.rotation, this.scale);
    this.opacity = clamp(alpha);
  }
  stamp(shape, pigment) {
    const b = this.batches[shape],
      slot = b.used++;
    this.matrix.compose(this.position, this.rotation, this.scale).premultiply(this.root);
    b.mesh.setMatrixAt(slot, this.matrix);
    if (b.keys[slot] !== pigment) {
      let color = this.colors.get(pigment);
      if (!color) {
        color = new this.T.Color(pigment);
        this.colors.set(pigment, color);
      }
      b.mesh.setColorAt(slot, color);
      b.keys[slot] = pigment;
      b.colorDirty = true;
    }
    if (Math.abs(this.opacity - b.attr.getX(slot)) > 0.00015) {
      b.attr.setX(slot, this.opacity);
      b.alphaDirty = true;
    }
  }
  part(shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    this.position.set(x, y, z);
    this.scale.set(sx, sy, sz);
    this.rotation.setFromEuler(this.euler.set(rx, ry, rz, 'YXZ'));
    this.stamp(shape, color);
  }
  link(color, x, y, z, X, Y, Z, r) {
    this.vector.set(X - x, Y - y, Z - z);
    const len = this.vector.length();
    if (len < 0.0001) return;
    this.vector.multiplyScalar(1 / len);
    this.rotation.setFromUnitVectors(this.up, this.vector);
    this.position.set((x + X) * 0.5, (y + Y) * 0.5, (z + Z) * 0.5);
    this.scale.set(r, len, r);
    this.stamp('stem', color);
  }
}

function drawnPerson(r, a, step, pace, choir = false, watch = 0, clock = 0) {
  const sway = Math.sin(step),
    bob = (0.014 - 0.014 * Math.cos(step * 2)) * pace,
    headY = 1.54 + bob;
  const coatHem = choir ? 0.77 : a.longCoat ? 0.59 : 0.765,
    collar = choir ? 1.41 : 1.345;
  const tilt = watch * (-0.23 + 0.046 * Math.sin(clock * 0.55 + a.phase));
  const glance = watch * 0.24 * Math.sin(clock * 0.24 + a.phase);
  r.part('coat', choir ? '#efeee5' : a.coat, 0, coatHem + bob, 0, 0.235, collar - coatHem, 0.175);
  if (choir) r.part('coat', '#42484a', 0, 0.27, 0, 0.21, 0.62, 0.16);
  r.part('oval', a.skin, 0, headY, 0.012, 0.119, 0.151, 0.115, tilt, glance);
  r.part(
    'oval',
    a.skin,
    0.107 * Math.sin(glance),
    headY + 0.009 - tilt * 0.12,
    0.109,
    0.033,
    0.036,
    0.043,
    tilt,
    glance,
  );
  r.part('hair', a.hair, 0, headY + 0.014, -0.013, 0.121, 0.147, 0.122, -0.18 + tilt, glance);
  if (a.hat && !choir)
    r.part('oval', a.accent, 0, headY + 0.103, -0.006, 0.14, 0.069, 0.143, -0.16 + tilt, glance);
  if (a.scarf && !choir) r.part('oval', a.accent, 0, 1.354 + bob, 0, 0.123, 0.061, 0.103);
  if (a.pack && !choir) r.part('oval', a.bag, 0, 1.1 + bob, -0.17, 0.151, 0.218, 0.081, 0.055);
  for (const side of [-1, 1]) {
    const footZ = 0.25 * side * sway * pace,
      footY = 0.062 + 0.113 * Math.max(0, side * Math.cos(step)) * pace,
      kneeZ = 0.073 + footZ * 0.54;
    const x = side * 0.084;
    r.link(a.legs, x, 0.83 + bob, -0.01, x, 0.46 + bob, kneeZ, 0.087);
    r.link(a.legs, x, 0.46 + bob, kneeZ, x, footY, footZ, 0.068);
    r.part('oval', '#4b4a43', x, footY, footZ + 0.039, 0.078, 0.065, 0.127);
    const raised = side === 1 && a.raised && !choir ? watch : 0;
    const armZ = choir ? 0.16 : -0.16 * side * sway * pace + 0.17 * raised,
      elbow = 0.075 + armZ * 0.53;
    const wrist = (choir ? 1.145 : 0.88) + raised * 0.45;
    r.link(
      choir ? '#eeece0' : a.coat,
      side * 0.192,
      1.288 + bob,
      -0.012,
      side * 0.219,
      1.038 + bob,
      elbow,
      0.071,
    );
    r.link(
      choir ? '#eeece0' : a.coat,
      side * 0.219,
      1.038 + bob,
      elbow,
      side * (choir ? 0.114 : 0.201),
      wrist + bob,
      armZ + 0.045,
      0.059,
    );
    r.part(
      'oval',
      a.skin,
      side * (choir ? 0.109 : 0.2),
      wrist - 0.015 + bob,
      armZ + 0.052,
      0.045,
      0.06,
      0.053,
    );
    if (raised > 0.96)
      r.part('box', '#565c59', side * 0.19, wrist + 0.052, armZ + 0.055, 0.079, 0.12, 0.025, -0.17);
  }
  if (choir) {
    r.part('box', '#67513e', 0, 1.16 + bob, 0.205, 0.26, 0.029, 0.17, -0.3);
    r.part('box', '#e3d5aa', 0, 1.177 + bob, 0.194, 0.234, 0.015, 0.143, -0.3);
  }
}

function drawCycle(r, a, phase) {
  const ink = '#4e5350',
    metal = '#a3a59a',
    frame = a.accent;
  for (const z of [-0.5, 0.54]) {
    r.part('wheel', ink, 0, 0.335, z, 0.323, 0.323, 0.42, 0, Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const angle = phase * 0.94 + (i * Math.PI) / 4,
        dy = Math.cos(angle) * 0.29,
        dz = Math.sin(angle) * 0.29;
      r.link(metal, 0, 0.335 - dy, z - dz, 0, 0.335 + dy, z + dz, 0.012);
    }
  }
  for (const [y, z, Y, Z] of [
    [0.34, -0.5, 0.32, -0.045],
    [0.34, -0.5, 0.82, -0.24],
    [0.82, -0.24, 0.32, -0.045],
    [0.32, -0.045, 0.79, 0.36],
    [0.79, 0.36, 0.78, -0.24],
    [0.86, 0.34, 0.34, 0.54],
  ])
    r.link(frame, 0, y, z, 0, Y, Z, 0.026);
  r.link(metal, 0, 0.8, 0.36, 0, 1.04, 0.31, 0.024);
  r.link(metal, -0.17, 1.04, 0.3, 0.17, 1.04, 0.3, 0.019);
  r.part('oval', '#574c42', 0, 0.88, -0.24, 0.115, 0.046, 0.15);
  r.part('coat', a.coat, 0, 0.93, -0.21, 0.2, 0.48, 0.145, 0.39);
  r.part('oval', a.skin, 0, 1.535, 0.058, 0.11, 0.137, 0.104, 0.11);
  r.part('hair', a.hair, 0, 1.555, 0.046, 0.112, 0.135, 0.105, -0.12);
  if (a.pack) r.part('oval', a.bag, 0, 1.24, -0.145, 0.149, 0.196, 0.086, 0.41);
  for (const side of [-1, 1]) {
    const pedalY = 0.35 + Math.sin(phase) * 0.14 * side,
      pedalZ = -0.045 + Math.cos(phase) * 0.14 * side;
    const kneeY = 0.68 + (pedalY - 0.35) * 0.5,
      kneeZ = 0.026 + (pedalZ + 0.045) * 0.45;
    r.link(a.legs, side * 0.074, 0.94, -0.21, side * 0.115, kneeY, kneeZ, 0.076);
    r.link(a.legs, side * 0.115, kneeY, kneeZ, side * 0.12, pedalY + 0.045, pedalZ, 0.06);
    r.part('oval', '#565148', side * 0.117, pedalY + 0.026, pedalZ + 0.033, 0.064, 0.046, 0.113);
    r.link(a.coat, side * 0.158, 1.322, 0.0, side * 0.198, 1.147, 0.138, 0.064);
    r.link(a.coat, side * 0.198, 1.147, 0.138, side * 0.15, 1.047, 0.302, 0.05);
    r.part('oval', a.skin, side * 0.149, 1.049, 0.309, 0.047, 0.043, 0.056);
  }
}

function drawCar(r, a) {
  const paint = a.carColor,
    metal = '#737a76',
    glass = '#667e84';
  r.part('car', paint, 0, 0, 0, 1, 1, 1);
  r.part('glass', glass, 0, 0, 0, 1, 1, 1);
  r.part('box', paint, 0, 1.384, -0.167, 1.074, 0.044, 1.11);
  for (const side of [-1, 1]) {
    for (const z of [-1.18, 1.12]) {
      r.part('stem', '#50524f', side * 0.784, 0.326, z, 0.302, 0.145, 0.302, 0, 0, Math.PI / 2);
      r.part('stem', '#a3a49a', side * 0.86, 0.326, z, 0.165, 0.018, 0.165, 0, 0, Math.PI / 2);
    }
    r.link(paint, side * 0.702, 0.834, 0.85, side * 0.571, 1.368, 0.3, 0.043);
    r.link(paint, side * 0.701, 0.84, -1.28, side * 0.582, 1.34, -0.85, 0.051);
    r.link('#505855', side * 0.705, 0.844, -0.28, side * 0.606, 1.351, -0.28, 0.034);
    r.part('box', paint, side * 0.797, 0.95, 0.39, 0.148, 0.086, 0.149);
    r.part('box', '#ddcf9c', side * 0.5, 0.609, 1.842, 0.271, 0.092, 0.039);
    r.part('box', '#b26255', side * 0.526, 0.653, -1.934, 0.194, 0.112, 0.041);
    r.part('box', metal, side * 0.838, 0.6, -0.47, 0.018, 0.029, 0.112);
  }
  r.part('box', '#4c5757', 0, 0.524, 1.861, 0.713, 0.068, 0.032);
  r.part('box', '#dfdcbd', 0, 0.432, 1.866, 0.345, 0.085, 0.031);
  r.part('box', '#d5ac64', 0, 0.493, -1.949, 0.368, 0.081, 0.029);
}

function drawPunt(r, a, phase, duck) {
  const dark = '#765f45',
    grain = '#a78961';
  r.part('boat', dark, 0, 0, 0, 1, 1, 1);
  r.part('box', '#ac8b64', 0, 0.286, 0, 0.899, 0.055, 4.88);
  for (const side of [-1, 1]) {
    r.part('box', grain, side * 0.507, 0.349, -0.04, 0.048, 0.118, 4.48);
    r.link(grain, side * 0.501, 0.373, -2.24, side * 0.409, 0.411, -2.84, 0.029);
    r.link(grain, side * 0.501, 0.373, 2.2, side * 0.403, 0.418, 2.84, 0.029);
  }
  for (const z of [-1.15, 0.25, 1.42]) {
    r.part('box', '#7c664c', 0, 0.358, z, 0.91, 0.09, 0.358);
    r.part('box', '#84938e', 0, 0.427, z, 0.83, 0.061, 0.27);
    r.part('box', '#a78b67', 0, 0.516, z - 0.152, 0.842, 0.25, 0.058, -0.18);
  }
  for (const [side, z, col] of [
    [-0.13, -0.91, '#a7826d'],
    [0.13, 0.36, '#77888a'],
  ]) {
    r.part('coat', col, side, 0.522, z, 0.18, 0.45, 0.143, -0.08);
    r.part('oval', a.skin, side, 1.109, z - 0.04, 0.104, 0.133, 0.102);
    r.part('hair', '#685747', side, 1.126, z - 0.058, 0.105, 0.13, 0.104, -0.16);
    for (const k of [-1, 1]) {
      r.link('#636664', side + k * 0.064, 0.578, z, side + k * 0.08, 0.56, z + 0.23, 0.064);
      r.link('#636664', side + k * 0.08, 0.56, z + 0.23, side + k * 0.08, 0.37, z + 0.26, 0.048);
    }
  }
  const beat = 0.5 + 0.5 * Math.sin(phase),
    stern = -1.98;
  const shoulder = 1.61 - duck * 0.51,
    hip = 1.06 - duck * 0.27,
    shift = 0.03 + 0.16 * beat + 0.28 * duck;
  r.part('coat', '#9eab9c', 0, hip, stern, 0.201, 0.5, 0.151, 0.11 + 0.29 * duck);
  r.part('oval', a.skin, 0, shoulder + 0.169, stern + shift, 0.106, 0.137, 0.105, 0.1);
  r.part('hair', '#746450', 0, shoulder + 0.19, stern + shift - 0.02, 0.109, 0.132, 0.106, -0.1);
  for (const side of [-1, 1]) {
    r.link(
      '#696c64',
      side * 0.079,
      hip,
      stern + 0.02,
      side * 0.09,
      0.66,
      stern + side * 0.14 + duck * 0.11,
      0.064,
    );
    r.link(
      '#696c64',
      side * 0.09,
      0.66,
      stern + side * 0.14 + duck * 0.11,
      side * 0.1,
      0.355,
      stern + side * 0.2,
      0.055,
    );
  }
  // The pole pivots around the hands. Beneath the arch both ends travel
  // along the boat's axis, with the pole and shoulders below the springing.
  const stalk = 0.365,
    gripY = lerp(1.44 + 0.07 * beat, 0.85, duck),
    gripZ = stern + lerp(0.35 + 0.13 * beat, 0.47, duck);
  const slope = lerp(0.26 + 0.36 * beat, 1.39, duck),
    up = Math.cos(slope),
    forward = Math.sin(slope);
  r.link(
    '#a98759',
    stalk - 0.029,
    gripY - 2.01 * up,
    gripZ - 2.01 * forward,
    stalk + 0.045,
    gripY + 2.17 * up,
    gripZ + 2.17 * forward,
    0.028,
  );
  for (const side of [-1, 1]) {
    const handY = gripY + side * 0.15 * up,
      handZ = gripZ + side * 0.15 * forward;
    r.link(
      '#9eab9c',
      side * 0.161,
      shoulder - 0.04,
      stern + shift * 0.7,
      0.21 + side * 0.06,
      handY + 0.04,
      (handZ + stern + shift) * 0.5,
      0.054,
    );
    r.link(
      a.skin,
      0.21 + side * 0.06,
      handY + 0.04,
      (handZ + stern + shift) * 0.5,
      stalk + 0.03,
      handY,
      handZ,
      0.043,
    );
  }
}

function routeInfo(input) {
  const points = (input.points || []).slice();
  if (points.length < 2) return null;
  const first = points[0],
    last = points[points.length - 1];
  if (input.loop && Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.01) points.push(first);
  const cumulative = [0];
  for (let i = 1; i < points.length; i++)
    cumulative.push(
      cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]),
    );
  const length = cumulative[cumulative.length - 1];
  return length > 0.15 ? { ...input, points, cumulative, length } : null;
}
function along(path, d) {
  const end = path.points.length - 1;
  d = path.loop ? wrap(d, path.length) : clamp(d, 0, path.length);
  let i = 1;
  while (i < end && path.cumulative[i] < d) i++;
  const p = path.points[i - 1],
    q = path.points[i],
    t = (d - path.cumulative[i - 1]) / Math.max(0.00001, path.cumulative[i] - path.cumulative[i - 1]);
  return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
}
function onPath(path, d, offset, look) {
  const p = along(path, d),
    a = along(path, d - look),
    b = along(path, d + look);
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  return { x: p[0] + Math.cos(yaw) * offset, z: p[1] - Math.sin(yaw) * offset, yaw };
}
function bridgeDistance(point, line) {
  if (!line?.[0] || !line?.[1]) return Infinity;
  const [a, b] = line,
    dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = clamp(((point.x - a[0]) * dx + (point.z - a[1]) * dz) / (dx * dx + dz * dz));
  return Math.hypot(point.x - a[0] - t * dx, point.z - a[1] - t * dz);
}
function costume(rand) {
  return {
    skin: pick(skinTones, rand),
    hair: pick(hairTones, rand),
    coat: pick(coats, rand),
    legs: pick(trousers, rand),
    accent: pick(['#ab8061', '#7c9290', '#a39065', '#995e52', '#596d74'], rand),
    bag: pick(['#846a50', '#666d5e', '#726258'], rand),
    pack: rand() < 0.43,
    scarf: rand() < 0.58,
    longCoat: rand() < 0.28,
    hat: rand() < 0.11,
    raised: rand() < 0.19,
    scale: 0.92 + rand() * 0.16,
    carColor: pick(['#7e9193', '#8a5351', '#485f70', '#a59f88'], rand),
  };
}

export function animateSite(T, scene, map) {
  const group = new T.Group();
  group.name = 'College life and the May Morning choir';
  scene.add(group);
  const paths = (map.routes || []).map(routeInfo).filter(Boolean);
  const actors = [],
    singers = [],
    tower = map.towerTop || [-28.2, 35.1, 19.81],
    rand = seeded(710430);
  const at = (x, z) => Number(map.heightAt?.(x, z)) || 0;
  const statistics = { walker: 0, cycle: 0, car: 0, punt: 0, event: 0, choir: 0 };
  for (const path of paths) {
    const count = path.count ?? 1,
      kind = path.kind;
    const gathering = [];
    for (let i = 0; i < count; i++) {
      const a = costume(rand);
      a.id = path.id + '-' + i;
      a.kind = kind;
      a.path = path;
      a.phase = rand() * TAU;
      const seed = rand();
      a.start = kind === 'punt' ? 0.405 : (i + seed * 0.66 + 0.12) / count;
      if (kind === 'car' || kind === 'cycle')
        a.start = path.id.includes('west') ? 0.37 + seed * 0.11 : 0.5 + seed * 0.15;
      a.start *= path.length;
      a.side = kind === 'walker' ? (rand() - 0.5) * (path.loop ? 0.27 : 0.63) : 0;
      a.speed =
        kind === 'cycle'
          ? 2.9 + rand() * 0.61
          : kind === 'car'
            ? 4.8 + rand() * 1.1
            : kind === 'punt'
              ? 0.62
              : 0.86 + rand() * 0.37;
      a.period = 17 + rand() * 17;
      a.wait = 1.15 + rand() * 2.7;
      a.clockOffset = rand() * a.period;
      a.backwards = rand() < 0.45;
      if (kind === 'event') {
        // Small groups take distinct positions inside the width of the mapped
        // pavement. A fixed seed keeps their attendance reproducible.
        let fromEnd, side;
        for (let attempt = 0; attempt < 30; attempt++) {
          fromEnd = 1.75 + rand() * (count * 0.7 + attempt * 0.06);
          side = (rand() - 0.5) * 1.91;
          if (gathering.every((p) => Math.hypot(p[0] - fromEnd, p[1] - side) > 0.72)) break;
        }
        gathering.push([fromEnd, side]);
        a.side = side;
        a.target = path.length - fromEnd;
        a.start = Math.max(0.8, a.target - (6 + rand() * 21));
        a.born = -4 + rand() * 13;
        a.scale *= rand() < 0.09 ? 0.8 : 0.97 + rand() * 0.04;
      }
      actors.push(a);
      statistics[kind] = (statistics[kind] || 0) + 1;
    }
  }
  for (let i = 0; i < 11; i++) {
    const a = costume(rand);
    a.phase = rand() * TAU;
    singers.push(a);
  }
  statistics.choir = singers.length;
  const rack = new PaintRack(T, group, Math.max(512, (actors.length + singers.length) * 10 + 180));
  let dailyClock = 0,
    simClock = 0,
    visibleCrowd = 0,
    visibleBoat = 0;
  const positioned = [];
  function update(dt, sim) {
    const festival = clamp(sim.event || 0),
      sungTime = Math.max(0, sim.eventTime || 0);
    dailyClock += Math.max(0, dt) * (1 - festival);
    simClock += Math.max(0, dt);
    rack.begin();
    visibleCrowd = 0;
    visibleBoat = 0;
    positioned.length = 0;
    for (const a of actors) {
      const { kind, path } = a,
        L = path.length;
      let d = 0,
        alpha = 1,
        heading = 0,
        pace = 1;
      if (kind === 'event') {
        if (festival < 0.003) continue;
        const age = sungTime - a.born,
          range = a.target - a.start,
          travel = clamp(age * a.speed, 0, range);
        d = a.start + travel;
        pace = ease((range - travel) / 1.2) * ease(age / 1.3);
        alpha = festival * ease((age + 1.6) / 2.4);
        if (alpha < 0.015) continue;
        visibleCrowd++;
      } else if (kind === 'walker') {
        const t = dailyClock + a.clockOffset,
          local = wrap(t, a.period),
          held = a.period - a.wait;
        const moving = Math.floor(t / a.period) * held + Math.min(local, held);
        pace = ease(Math.min(local, 0.49) / 0.49) * ease((held - local) / 0.55);
        let travelled = a.start + (a.backwards ? -1 : 1) * a.speed * moving;
        if (path.loop) {
          d = wrap(travelled, L);
          heading = a.backwards ? Math.PI : 0;
        } else {
          const turn = 1.25,
            leg = L + turn,
            k = wrap(travelled, 2 * leg),
            reverse = k > leg,
            offset = reverse ? k - leg : k;
          d = reverse ? L - Math.min(offset, L) : Math.min(offset, L);
          heading =
            (reverse ? Math.PI : 0) +
            (offset > L ? Math.PI * ease((offset - L) / turn) : 0) +
            (a.backwards ? Math.PI : 0);
          if (offset > L) pace = 0;
        }
        alpha = 1 - 0.75 * festival;
      } else {
        const extra = kind === 'punt' ? 18 : 0;
        d = wrap(a.start + dailyClock * a.speed, L + extra);
        alpha = ease(Math.min(d, L - d) / (kind === 'punt' ? 8 : 4)) * (1 - festival);
        if (kind === 'punt') {
          alpha *= ease((sim.weights[1] - 0.06) / 0.83);
          visibleBoat = alpha;
        }
        if (alpha < 0.007) continue;
      }
      const where = onPath(path, d, a.side, kind === 'punt' ? 1.95 : kind === 'car' ? 1.35 : 0.43);
      let yaw = where.yaw + heading;
      if (kind === 'event' && pace < 1) {
        const face = Math.atan2(tower[0] - where.x, tower[2] - where.z);
        yaw += wrapAngle(face - yaw) * (1 - pace);
      }
      const y =
        kind === 'punt'
          ? -1.9 + 0.035 + 0.022 * Math.sin(simClock * 0.78 + a.phase)
          : at(where.x, where.z) + 0.026;
      if (kind === 'walker' && positioned.length < 3)
        positioned.push([+where.x.toFixed(3), +where.z.toFixed(3)]);
      rack.place(where.x, y, where.z, yaw, kind === 'walker' || kind === 'event' ? a.scale : 1, alpha);
      const stride = d * 4.32 + a.phase;
      if (kind === 'walker' || kind === 'event')
        drawnPerson(rack, a, stride, pace, false, kind === 'event' ? 1 - pace : 0, simClock);
      else if (kind === 'cycle') drawCycle(rack, a, d * 2.5 + a.phase);
      else if (kind === 'car') drawCar(rack, a);
      else if (kind === 'punt') {
        const nearStone = bridgeDistance(where, map.bridge?.axis),
          nearFoot = bridgeDistance(where, map.addisonBridge);
        const duck = Math.max(ease((13 - nearStone) / 5), ease((5.5 - nearFoot) / 2.5));
        drawPunt(rack, a, simClock * 0.78 + a.phase, duck);
      }
    }
    if (festival > 0.003) {
      for (let i = 0; i < singers.length; i++) {
        const a = singers[i],
          row = i < 6 ? 0 : 1,
          col = i < 6 ? i - 2.5 : i - 8;
        const dx = col * 0.82,
          dz = row ? 0.74 : -0.72;
        rack.place(
          tower[0] + 0.753 * dx - 0.658 * dz,
          tower[1] + 0.025,
          tower[2] + 0.658 * dx + 0.753 * dz,
          -0.72 + 0.045 * Math.sin(simClock * 0.6 + i),
          a.scale * 0.97,
          festival,
        );
        drawnPerson(rack, a, simClock * 0.68 + a.phase, 0.047, true);
      }
    }
    rack.finish();
  }
  return {
    update,
    stats: () => ({
      ...statistics,
      visibleCrowd,
      puntVisibility: +visibleBoat.toFixed(3),
      clock: +dailyClock.toFixed(3),
      sampleWalkerXZ: positioned.map((v) => v.slice()),
    }),
  };
}
