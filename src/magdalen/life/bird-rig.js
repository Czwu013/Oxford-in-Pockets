import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const mix = (a, b, t) => a + (b - a) * t;

function baked(T, components, name) {
  const pieces = components.map(([shape, color, center, size, turn = 0]) => {
    const g =
      shape === 'beak' ? new T.ConeGeometry(1, 1, 7).rotateX(Math.PI / 2) : new T.SphereGeometry(1, 12, 8);
    g.scale(...size)
      .rotateX(turn)
      .translate(...center);
    const ink = new T.Color(color),
      rgb = [];
    for (let i = 0; i < g.attributes.position.count; i++) rgb.push(ink.r, ink.g, ink.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
    return g;
  });
  const geometry = mergeGeometries(pieces);
  pieces.forEach((p) => p.dispose());
  const mesh = new T.Mesh(geometry, new T.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeBird(T, parent, pigeon, name) {
  const root = new T.Group(),
    bodyGroup = new T.Group();
  root.name = name;
  root.add(bodyGroup);
  parent.add(root);
  const base = pigeon ? '#7f858b' : '#393d45',
    breast = pigeon ? '#ac9393' : '#424650',
    crown = pigeon ? '#78858c' : '#34373c';
  const wing = pigeon ? '#727a84' : '#404750',
    second = pigeon ? '#848b92' : '#545b61',
    primary = pigeon ? '#555b66' : '#353a43';
  const toe = pigeon ? '#b18a83' : '#6e6b64',
    eye = pigeon ? '#bfad85' : '#adafa1';
  const body = baked(
    T,
    [
      ['oval', base, [0, 0.177, -0.03], [0.076, 0.085, 0.186], -0.17],
      ['oval', breast, [0, 0.19, 0.059], [0.067, 0.081, 0.109], -0.26],
    ],
    'Breast and mantle',
  );
  bodyGroup.add(body);
  const head = baked(
    T,
    [
      ['oval', pigeon ? '#8c9396' : '#838688', [0, -0.013, -0.018], [0.056, 0.065, 0.066]],
      ['oval', crown, [0, 0.01, 0.018], [0.056, 0.055, 0.059]],
      ['beak', pigeon ? '#9a8776' : '#434747', [0, -0.008, 0.089], [0.02, 0.016, 0.08], 0.02],
      ...[-1, 1].flatMap((s) => [
        ['oval', eye, [s * 0.049, 0.013, 0.034], [0.007, 0.006, 0.0075]],
        ['oval', '#292c2c', [s * 0.054, 0.013, 0.036], [0.0035, 0.0034, 0.0038]],
        ...(pigeon ? [['oval', '#e2dfcd', [s * 0.053, -0.038, -0.005], [0.009, 0.017, 0.032]]] : []),
      ]),
    ],
    'Nape, eye and bill',
  );
  head.position.set(0, 0.261, 0.111);
  bodyGroup.add(head);
  const capacity = 330,
    positions = new Float32Array(capacity * 3),
    colors = new Float32Array(capacity * 3);
  const dynamic = new T.BufferGeometry();
  dynamic.setAttribute('position', new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage));
  dynamic.setAttribute('color', new T.BufferAttribute(colors, 3));
  const skin = new T.Mesh(dynamic, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
  skin.name = 'Articulated primary feathers, fan and feet';
  skin.frustumCulled = false;
  skin.castShadow = true;
  skin.receiveShadow = true;
  bodyGroup.add(skin);
  let used = 0,
    paletteSet = false;
  const paints = new Map();
  const footWorld = [new T.Vector3(), new T.Vector3()],
    wingWorld = [new T.Vector3(), new T.Vector3()];
  function tri(a, b, c, color) {
    let ink = paints.get(color);
    if (!ink) {
      ink = new T.Color(color);
      paints.set(color, ink);
    }
    for (const v of [a, b, c]) {
      const k = used++ * 3;
      positions[k] = v[0];
      positions[k + 1] = v[1];
      positions[k + 2] = v[2];
      if (!paletteSet) {
        colors[k] = ink.r;
        colors[k + 1] = ink.g;
        colors[k + 2] = ink.b;
      }
    }
  }
  function sheet(a, b, c, d, color) {
    tri(a, b, d, color);
    tri(b, c, d, color);
  }
  function twig(a, b, r, color) {
    const dx = b[0] - a[0],
      dz = b[2] - a[2],
      d = Math.hypot(dx, dz) || 1,
      ox = (r * dz) / d,
      oz = (-r * dx) / d;
    const p = [a[0] + ox, a[1], a[2] + oz],
      q = [a[0] - ox, a[1], a[2] - oz];
    const s = [b[0] - ox * 0.7, b[1], b[2] - oz * 0.7],
      t = [b[0] + ox * 0.7, b[1], b[2] + oz * 0.7];
    sheet(p, q, s, t, color);
    tri(p, [a[0], a[1] + r, a[2]], [b[0], b[1] + r * 0.65, b[2]], color);
  }
  function pose(p) {
    root.position.set(...p.position);
    root.rotation.set(p.pitch, p.yaw, p.bank, 'YXZ');
    root.scale.setScalar(pigeon ? 1.15 : 1.04);
    bodyGroup.position.y = p.crouch - 0.034 * (1 - p.open);
    head.rotation.set(p.headNod, p.headTurn, 0, 'YXZ');
    used = 0;
    for (let side = -1; side <= 1; side += 2) {
      const o = p.open,
        flap = p.stroke;
      const point = (x, y, z) => [side * x, y, z];
      const shoulder = point(0.046, 0.218, 0.062),
        leading = point(mix(0.09, 0.19, o), 0.22 + flap * 0.088, mix(-0.014, 0.066, o));
      const wrist = point(mix(0.103, 0.31, o), 0.195 + flap * 0.177, mix(-0.105, 0.05, o));
      const back = point(0.062, 0.184, -0.118),
        midBack = point(mix(0.092, 0.2, o), 0.185 + flap * 0.073, mix(-0.184, -0.133, o));
      const wristBack = point(mix(0.09, 0.27, o), 0.177 + flap * 0.146, mix(-0.211, -0.088, o));
      const dome = point(mix(0.081, 0.118, o), 0.234 + flap * 0.053, mix(-0.049, -0.015, o));
      tri(shoulder, leading, dome, second);
      tri(leading, midBack, dome, wing);
      tri(midBack, back, dome, wing);
      tri(back, shoulder, dome, second);
      sheet(leading, wrist, wristBack, midBack, second);
      const barred = point(mix(0.091, 0.228, o), 0.195 + flap * 0.1, mix(-0.117, 0.008, o));
      tri(leading, barred, midBack, pigeon ? '#d7d9cc' : '#4c525a');
      for (let k = 0; k < 6; k++) {
        const t = k / 5,
          f0 = k / 6,
          f1 = Math.min(1, (k + 1.24) / 6);
        const start = wrist.map((v, j) => mix(v, wristBack[j], f0)),
          baseB = wrist.map((v, j) => mix(v, wristBack[j], f1));
        const tip = point(
          mix(0.069 + t * 0.018, 0.397 - 0.081 * t, o),
          0.135 + o * 0.026 + flap * (0.211 - 0.055 * t),
          mix(-0.263 + t * 0.046, -0.021 - 0.135 * t, o),
        );
        const endB = [tip[0] - side * 0.012, tip[1] - 0.002, tip[2] - 0.019];
        sheet(start, tip, endB, baseB, k % 2 ? primary : wing);
        if (k === 0) wingWorld[side > 0 ? 1 : 0].set(...tip);
      }
      const s = side > 0 ? 1 : 0,
        x = side * 0.034;
      const footY = mix(0.133, p.footOffsets[s] / root.scale.y - bodyGroup.position.y + 0.002, p.legs);
      const footZ = mix(-0.087, 0.032, p.legs),
        ankle = [x, footY, footZ];
      twig([x, 0.136, 0.009], [x, Math.max(footY + 0.025, 0.081), -0.019], 0.007, toe);
      twig([x, Math.max(footY + 0.025, 0.081), -0.019], ankle, 0.007, toe);
      for (const a of [-0.63, 0.05, 0.6, 2.86]) {
        const len = a > 2 ? 0.023 : 0.037;
        twig(ankle, [x + Math.sin(a) * len, footY - 0.0015, footZ + Math.cos(a) * len], 0.0041, toe);
      }
      footWorld[s].set(...ankle);
    }
    const fan = 0.045 + 0.047 * p.tail;
    for (let k = 0; k < 7; k++) {
      const x = (k - 3) / 3;
      sheet(
        [x * 0.027 - 0.008, 0.167, -0.111],
        [x * 0.027 + 0.008, 0.167, -0.111],
        [x * fan + 0.01, 0.158 - p.tail * 0.025, -0.279 + 0.019 * Math.abs(x)],
        [x * fan - 0.01, 0.157 - p.tail * 0.025, -0.286 + 0.019 * Math.abs(x)],
        k % 2 ? wing : primary,
      );
    }
    dynamic.setDrawRange(0, used);
    dynamic.attributes.position.needsUpdate = true;
    if (!paletteSet) {
      paletteSet = true;
      dynamic.attributes.color.needsUpdate = true;
    }
    dynamic.computeVertexNormals();
    root.updateMatrixWorld(true);
    const world = (v) => v.applyMatrix4(bodyGroup.matrixWorld).toArray();
    return { feet: footWorld.map(world), wingTips: wingWorld.map(world) };
  }
  return { root, pose };
}
