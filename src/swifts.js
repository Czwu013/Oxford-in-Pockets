import * as T from 'three';

const tau = 2 * Math.PI,
  up = new T.Vector3(0, 1, 0),
  rad = 180 / Math.PI;
const ease = (t) => t * t * (3 - 2 * t);
const vec = (a) => new T.Vector3(...a);
function birdShape() {
  const rig = new T.Group(),
    dark = new T.MeshLambertMaterial({ color: '#414947', side: T.DoubleSide }),
    pale = new T.MeshLambertMaterial({ color: '#b7b4a0' });
  const egg = (sx, sy, sz, z, y, material) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 10, 7), material);
    m.scale.set(sx, sy, sz);
    m.position.set(0, y, z);
    rig.add(m);
  };
  egg(0.029, 0.031, 0.071, 0.003, 0, dark);
  egg(0.023, 0.024, 0.032, 0.06, 0.003, dark);
  egg(0.012, 0.009, 0.02, 0.071, -0.012, pale);
  const wings = [];
  for (const side of [-1, 1]) {
    const geom = new T.BufferGeometry(),
      pos = new Float32Array(21);
    geom.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    geom.setIndex([0, 1, 5, 1, 2, 5, 2, 3, 4, 2, 4, 5, 5, 6, 0]);
    // Fixed bound encloses every stroke including the folded pose.
    geom.boundingSphere = new T.Sphere(new T.Vector3(), 0.26);
    const wing = new T.Mesh(geom, dark);
    rig.add(wing);
    const tail = new T.BufferGeometry();
    tail.setAttribute(
      'position',
      new T.Float32BufferAttribute(
        [0, -0.003, -0.031, 0.031 * side, -0.006, -0.119, 0.007 * side, 0.002, -0.083],
        3,
      ),
    );
    tail.computeVertexNormals();
    rig.add(new T.Mesh(tail, dark));
    wings.push({ side, pos, geom });
  }
  function pose(phase, fold, glide) {
    const stroke = Math.sin(phase) * (1 - glide),
      reach = 1 - 0.78 * fold,
      back = 0.12 * fold;
    for (const { side, pos, geom } of wings) {
      const profile = [
        [0.013, 0.006, 0.044],
        [0.094 * reach, 0.012 + 0.031 * stroke, 0.065 - back * 0.32],
        [0.16 * reach, 0.003 + 0.057 * stroke, 0.009 - back * 0.66],
        [0.212 * reach, -0.015 + 0.083 * stroke, -0.119 - back * 0.41],
        [0.153 * reach, -0.008 + 0.055 * stroke, -0.05 - back * 0.6],
        [0.095 * reach, -0.002 + 0.027 * stroke, -0.015 - back * 0.7],
        [0.018, -0.004, -0.033],
      ];
      for (let i = 0; i < profile.length; i++) {
        pos[3 * i] = profile[i][0] * side;
        pos[3 * i + 1] = profile[i][1];
        pos[3 * i + 2] = profile[i][2];
      }
      geom.attributes.position.needsUpdate = true;
      geom.computeVertexNormals();
    }
  }
  return {
    rig,
    pose,
    fade(alpha) {
      for (const mat of [dark, pale]) {
        mat.opacity = alpha;
        const transparent = alpha < 0.995;
        if (mat.transparent !== transparent) {
          mat.transparent = transparent;
          mat.depthWrite = !transparent;
          mat.needsUpdate = true;
        }
      }
    },
  };
}
function circuit(nest, index) {
  const m = vec(nest.mouth),
    N = vec(nest.normal),
    S = new T.Vector3(N.z, 0, -N.x),
    inside = vec(nest.inner);
  const P = (out, across, rise) =>
    m.clone().addScaledVector(N, out).addScaledVector(S, across).addScaledVector(up, rise);
  const bez = (a, b, c, d) => new T.CubicBezierCurve3(a, b, c, d);
  const side = index % 2 ? -1 : 1,
    turn = 10 + ((index * 3) % 9);
  const lift = 3 + (index % 3) * 1.7;
  const leg = P(5.4, side * 0.72, -0.62),
    corner = P(18, side * turn, lift),
    far = P(31, -side * (turn + 0.5), lift + 0.8),
    close = P(5.6, -side * 0.55, -1.1);
  const curves = [
    bez(inside, P(0.18, 0, -0.04), P(2.4, side * 0.12, -0.63), leg),
    bez(leg, P(10, side * 2, -0.56), P(11, side * (turn - 1), lift - 0.6), corner),
    bez(corner, P(34, side * (turn + 3), lift + 1.4), P(46, -side * (turn - 4), lift + 3.8), far),
    bez(far, P(18, -side * (turn + 1), lift - 1.9), P(10, -side * 1.5, -2.1), close),
    bez(close, P(2.65, -side * 0.16, -0.72), P(0.2, 0, -0.03), inside),
  ];
  const dur = [1.07, 2.75, 4.85 + index * 0.08, 3.75, 1.65],
    air = dur.reduce((a, b) => a + b, 0),
    rest = 4.9 + (index % 4) * 1.08;
  return { m, N, curves, dur, air, period: air + rest, offset: index * 4.14 + (index % 2) * 0.6 };
}
export function swiftColony(group, nests) {
  const openings = nests.filter((n) => n.side === 0 && [31, 48].includes(n.row)),
    flanks = nests.filter((n) => n.side === 1 && n.row === 31);
  const entries = [...openings, ...flanks.slice(0, 2)].map((nest, i) => {
    const shape = birdShape();
    group.add(shape.rig);
    shape.rig.name = 'Common swift ' + (i + 1);
    return {
      ...shape,
      ...circuit(nest, i),
      nest,
      index: i,
      state: 'inNest',
      clock: 0,
      drawn: false,
      distance: 0,
    };
  });
  const pos = new T.Vector3(),
    tangent = new T.Vector3(),
    ahead = new T.Vector3(),
    look = new T.Matrix4();
  let observation = entries[0],
    breeding = 1;
  function update(time, weights, near) {
    breeding = weights[0] + weights[1];
    for (const b of entries) {
      const t = (time + b.offset) % b.period;
      b.clock = t;
      if (t > b.air) {
        b.state = 'inNest';
        b.drawn = false;
        b.rig.visible = false;
        b.rig.position.copy(b.curves[4].v3);
        b.distance = b.rig.position.distanceTo(b.m);
        continue;
      }
      let seg = 0,
        local = t;
      while (seg < 4 && local > b.dur[seg]) {
        local -= b.dur[seg];
        seg++;
      }
      const ratio = Math.min(1, local / b.dur[seg]),
        curve = b.curves[seg];
      curve.getPoint(ratio, pos);
      curve.getTangent(ratio, tangent);
      b.distance = pos.distanceTo(b.m);
      b.state = ['leaving', 'climbing', 'circling', 'approaching', 'entering'][seg];
      // Each arriving swift continues through its registered throat. Once the
      // tail clears the outer lip the bird is occluded by the roof and nest box.
      const inBox = (seg === 4 || seg === 0) && pos.clone().sub(b.m).dot(b.N) < -0.22;
      const alpha = ease(
        T.MathUtils.clamp((breeding - (b.index + 0.15) / (entries.length + 1)) / 0.13, 0, 1),
      );
      b.drawn = alpha > 0.006 && !inBox;
      b.rig.visible = near && b.drawn;
      b.rig.position.copy(pos);
      if (!b.rig.visible) continue;
      b.fade(alpha);
      const fold =
        seg === 4
          ? ease(T.MathUtils.clamp((1.65 - b.distance) / 1.5, 0, 1))
          : seg === 0
            ? 1 - ease(T.MathUtils.clamp(b.distance / 1.65, 0, 1))
            : 0;
      curve.getTangent(Math.min(1, ratio + 0.045), ahead);
      const yaw = tangent.x * ahead.z - tangent.z * ahead.x,
        bank = T.MathUtils.clamp(-yaw * 5, -0.82, 0.82);
      look.lookAt(tangent, new T.Vector3(), up);
      b.rig.quaternion.setFromRotationMatrix(look);
      b.rig.rotateZ(bank);
      b.pose(time * 45 + b.index * 1.7, fold, seg === 2 ? 0.82 : seg === 3 ? 0.57 : seg === 4 ? 0.31 : 0);
    }
  }
  function nextArrival() {
    const until = (b) => (b.air - b.clock + b.period) % b.period;
    const choices = entries.filter(
      (b) => b.nest.side === 0 && (breeding < 0.08 || breeding > (b.index + 0.3) / (entries.length + 1)),
    );
    observation =
      choices.sort((a, b) => {
        const delay = (bird) => {
          const t = until(bird);
          return t < 1.8 ? t + bird.period : t;
        };
        return delay(a) - delay(b);
      })[0] || entries[0];
    const { m, N } = observation;
    return {
      x: m.x + N.x * 0.82,
      z: m.z + N.z * 0.82,
      y: m.y + 0.32,
      az: Math.atan2(N.x, N.z) * rad + 19,
      alt: 8,
      span: 7.2,
      lens: 48,
    };
  }
  return {
    update,
    nextArrival,
    inspect: () => ({
      weight: breeding,
      watch: observation.index,
      birds: entries.map((b) => ({
        id: b.index,
        phase: b.state,
        visible: b.rig.visible,
        mouth: b.nest.mouth,
        position: b.rig.position.toArray(),
        distance: b.distance,
      })),
    }),
  };
}
