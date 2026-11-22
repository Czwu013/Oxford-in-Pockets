import { getTreeCrowns } from './vegetation.js';
import { clamp, lerp, seeded } from './geometry.js';

const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const rounded = (n) => Math.round(n * 10000) / 10000;
const vector = (p) => p.map(rounded);
const litter = ['#d1a041', '#bb7138', '#b97846', '#ce8d42', '#c29552', '#b78949'];
const land = new Set(['path', 'road', 'ground', 'lawn']);
// The longest vertex, including the stalk, is 0.123 m from the pivot.
// At the largest individual scale (1.33) every orientation fits this radius.
const bladeRadius = 0.17;
// A real, exposed branch on the poplar beside the near stretch of Addison's
// Walk introduces the autumn fall. Later releases use the seeded lane choices.
const opening = {
  treeId: 100,
  fork: [66.08, 6.73, -28.08],
  bearing: (105 * Math.PI) / 180,
  verge: [68.05, -24.0],
};
const lanes = [
  { id: 'addison-path', at: [69, -45], kind: 'path', delay: 0.2, interval: 3.35 },
  { id: 'stream-current', at: [66, -53], kind: 'water', delay: 1.05, interval: 5.6 },
  { id: 'cloister-corner', at: [27.57, -40.02], kind: 'court', delay: 1.65, interval: 7.8 },
  { id: 'street-verge', at: [48, 46], kind: 'path', delay: 3.7, interval: 8.1 },
  { id: 'garden-windrow', at: [-111, -99], kind: 'edge', delay: 6.0, interval: 10.5 },
];

// Two folded half-blades, a stalk and a light midrib. The underside remains
// visible as the leaf tumbles. Geometry is in metres before individual scaling.
function leafBlade(T) {
  const pos = [],
    col = [],
    color = new T.Color();
  const tri = (a, b, c, shade) => {
    for (const v of [a, b, c]) {
      pos.push(...v);
      color.setRGB(shade, shade, shade);
      col.push(color.r, color.g, color.b);
    }
  };
  const outline = [
    [0, -0.09],
    [0.023, -0.076],
    [0.043, -0.085],
    [0.035, -0.058],
    [0.065, -0.062],
    [0.053, -0.033],
    [0.084, -0.014],
    [0.048, -0.006],
    [0.055, 0.025],
    [0.034, 0.018],
    [0.037, 0.048],
    [0.021, 0.041],
    [0, 0.103],
  ];
  for (const side of [-1, 1])
    for (let i = 1; i < outline.length; i++) {
      const outer = (p) => [p[0] * side, 0.004 + p[0] * 0.03, p[1]];
      tri(
        [0, 0.014, 0],
        outer(outline[i - 1]),
        outer(outline[i]),
        (side === 1 ? 0.93 : 0.77) + (i % 3) * 0.028,
      );
    }
  tri([-0.003, 0.007, -0.089], [0.002, 0.008, -0.089], [-0.004, 0.008, -0.122], 0.47);
  tri([-0.002, 0.0148, -0.088], [0.003, 0.0148, -0.088], [0, 0.015, 0.087], 1.21);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function nearest(items, point, count) {
  return items
    .slice()
    .sort((a, b) => Math.hypot(a.x - point[0], a.z - point[1]) - Math.hypot(b.x - point[0], b.z - point[1]))
    .slice(0, count);
}
function chooseTarget(lane, tree, surfaces, rand, map) {
  if (lane.kind === 'court') {
    const p = [lane.at[0] - 0.7 + (rand() - 0.5) * 0.87, lane.at[1] + 0.31 + (rand() - 0.5) * 0.73],
      s = surfaces.sample(...p);
    if (land.has(s.kind) && s.y < 0.9) return [p[0], s.y, p[1]];
    return null;
  }
  const candidates = [];
  if (lane.kind === 'edge' || lane.kind === 'path') {
    const beds = nearest(
      (map.flora || []).filter((f) => f.kind === 'leaves'),
      [tree.x, tree.z],
      2,
    );
    for (const f of beds)
      if (Math.hypot(f.x - tree.x, f.z - tree.z) < 13)
        candidates.push([f.x + (rand() - 0.5) * 0.9, f.z + (rand() - 0.5) * 0.9]);
  }
  for (let i = 0; i < 49; i++) {
    const a = (i * 0.61803398875 + rand() * 0.15) * Math.PI * 2,
      r = tree.radius * (0.67 + 1.86 * rand());
    candidates.push([tree.x + Math.cos(a) * r, tree.z + Math.sin(a) * r]);
  }
  let best = null;
  for (const p of candidates) {
    const s = surfaces.sample(...p);
    if (lane.kind === 'water' ? s.kind !== 'water' : !land.has(s.kind)) continue;
    const prefer = s.kind === 'path' || s.kind === 'road' ? 3.7 : 0;
    const underCrown = Math.max(0, 1.23 * tree.radius - Math.hypot(p[0] - tree.x, p[1] - tree.z));
    const score =
      prefer - Math.hypot(p[0] - lane.at[0], p[1] - lane.at[1]) * 0.21 - underCrown * 0.98 + rand() * 0.68;
    if (!best || score > best.score) best = { score, p: [p[0], s.y, p[1]] };
  }
  return best?.p;
}

function trajectory(tree, target, lane, surfaces, rand, openingRelease = false) {
  const toward = Math.atan2(target[2] - tree.z, target[0] - tree.x);
  const bearing = openingRelease ? opening.bearing : toward;
  const ox = Math.cos(bearing),
    oz = Math.sin(bearing);
  const exposure = (s) => {
    const dx = s.center[0] - tree.x,
      dz = s.center[2] - tree.z;
    return (
      dx * ox +
      dz * oz +
      s.autumnGrowth * Math.sqrt(s.size[0] * s.size[2]) * 0.91 -
      0.26 * Math.abs(ox * dz - oz * dx) +
      0.045 * s.center[1]
    );
  };
  const ranked = tree.sprays.slice().sort((a, b) => exposure(b) - exposure(a));
  const choice = Math.floor(rand() * Math.min(2, ranked.length));
  const fromFork = (s) => Math.hypot(...s.center.map((value, i) => value - opening.fork[i]));
  const spray = openingRelease
      ? ranked.reduce((a, b) => (fromFork(a) < fromFork(b) ? a : b))
      : ranked[choice],
    c = spray.center;
  const angle = bearing + (rand() - 0.5) * (openingRelease ? 0.028 : 0.22);
  const vertical = rand();
  // Select an exposed spur on the destination-facing edge of an actual brush.
  const source = [
    c[0] + Math.cos(angle) * spray.size[0] * spray.autumnGrowth * 0.91,
    c[1] + spray.size[1] * (openingRelease ? -0.29 * spray.autumnGrowth : (vertical - 0.37) * 0.16),
    c[2] + Math.sin(angle) * spray.size[2] * spray.autumnGrowth * 0.91,
  ];
  const dx = target[0] - source[0],
    dz = target[2] - source[2],
    distance = Math.hypot(dx, dz) || 1;
  const court = lane.kind === 'court';
  const count = Math.max(31, Math.ceil(distance / (court ? 0.13 : 0.35))),
    phase = rand() * 6.28,
    amp = 0.18 + rand() * 0.46;
  const points = [],
    base = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      envelope = Math.sin(Math.PI * t),
      sway = Math.sin(t * 9.4 + phase) * amp * envelope;
    // The releasing gust moves the blade a little beyond the crown before
    // gravity carries it into the lee. It does not begin deep in a leaf wash.
    const gust = (tree.radius * 0.36 * (t * (1 - t) ** 3)) / (0.25 * 0.75 ** 3);
    // In the cloister a short curl continues into clear air over the quadrangle
    // before turning back towards its eastern corner. This gives the descent
    // room beyond both the roof eaves and the parapet's small stone projections.
    const lee = court ? Math.sin(Math.PI * t) ** 1.12 * 9.1 : 0;
    const x = lerp(source[0], target[0], t) - (sway * dz) / distance + ox * gust - lee,
      z = lerp(source[2], target[2], t) + (sway * dx) / distance + oz * gust + lee * 0.32;
    if (surfaces.sample(x, z).kind === 'outside') return null;
    const falling =
      lerp(source[1], target[1] - 0.002, smooth(t)) +
      0.19 * Math.sin(t * 7.6 + phase) * envelope * envelope;
    base.push(falling);
    points.push([x, 0, z]);
  }
  // A finite leaf can brush an eave while its centre is still over open ground.
  // Bound every triangle under the entire swept width, from one sample to the
  // next. Both vertical endpoints clear that bound, so monotone interpolation
  // stays above it even between samples and at different simulation step sizes.
  const swept = [];
  for (let i = 0; i < count; i++) {
    const a = points[i],
      b = points[i + 1];
    swept.push(
      surfaces.maxHeightInRect(
        Math.min(a[0], b[0]) - bladeRadius,
        Math.min(a[2], b[2]) - bladeRadius,
        Math.max(a[0], b[0]) + bladeRadius,
        Math.max(a[2], b[2]) + bladeRadius,
      ),
    );
  }
  // A twig inside masonry or a landing spot straddling a wall cannot supply
  // a continuous start/end pose. The lane can try a different real tree/site.
  if (swept[0] + bladeRadius > source[1] || swept[count - 1] > target[1] + 0.025) return null;
  const obstacles = points.map((_, i) =>
    Math.max(swept[Math.max(0, i - 1)], swept[Math.min(count - 1, i)]),
  );
  const floor = obstacles.map((y, i) => {
    const overLanding = y <= target[1] + 0.025;
    return y + bladeRadius * (overLanding ? smooth((count - i) / 2.3) : 1);
  });
  const lift = base.map((y, i) => Math.max(0, floor[i] - y));
  // Only the *extra* height needed to clear an obstruction is smoothed.
  // Horizontal travel may be short even when the source is eight metres up.
  const nominal = Math.max(
    4.5,
    Math.abs(source[1] - target[1]) / (1.04 + rand() * 0.35),
    distance / (1.35 + rand() * 0.48),
  );
  if (court) {
    const high = obstacles.map((y, i) => (y > 1.0 ? i : -1)).filter((i) => i >= 0);
    if (!high.length) return null;
    const first = (Math.min(...high) - 3) / count,
      last = (Math.max(...high) + 4) / count;
    if (first < 0.035 || last > 0.9) return null;
    const crest = Math.max(...obstacles) + 0.74;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const safe =
        t < first
          ? lerp(source[1], crest, smooth(t / first))
          : t > last
            ? lerp(crest, target[1] - 0.002, smooth((t - last) / (1 - last)))
            : crest + 0.085 * Math.sin((Math.PI * (t - first)) / (last - first));
      base[i] = safe;
      lift[i] = Math.max(0, floor[i] - safe);
    }
  }
  const intervals = [0];
  for (let i = 1; i <= count; i++)
    intervals.push(Math.max(nominal / count, Math.abs(lift[i] - lift[i - 1]) / 1.14));
  for (let i = 1; i <= count; i++) lift[i] = Math.max(lift[i], lift[i - 1] - 1.26 * intervals[i]);
  for (let i = count - 1; i >= 0; i--) lift[i] = Math.max(lift[i], lift[i + 1] - 1.23 * intervals[i + 1]);
  if (lift[0] > 0.035 || lift[count] > 0.045) return null;
  lift[0] = 0;
  lift[count] = 0;
  for (let i = 0; i <= count; i++) points[i][1] = base[i] + lift[i];
  if (points.some((p) => p[1] > source[1] + (court ? 6.15 : 1.6))) return null;
  const times = [0],
    slopes = [0];
  for (let i = 1; i <= count; i++) {
    const rise = points[i][1] - points[i - 1][1],
      horizontal = Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]);
    const height = (points[i][1] + points[i - 1][1]) * 0.5 - target[1];
    const fallSpeed = 0.38 + 1.05 * smooth(height / 0.85);
    times.push(
      times[i - 1] +
        Math.max(nominal / count, horizontal / 2.12, Math.abs(rise) / (rise > 0 ? 0.9 : fallSpeed)),
    );
  }
  // A monotone Hermite interpolation gives continuous vertical velocity and
  // zero velocity on release/contact, including the lee side of a high roof.
  for (let i = 1; i < count; i++) {
    const a = (points[i][1] - points[i - 1][1]) / (times[i] - times[i - 1]);
    const b = (points[i + 1][1] - points[i][1]) / (times[i + 1] - times[i]);
    slopes.push(a * b > 0 ? (2 * a * b) / (a + b) : 0);
  }
  slopes.push(0);
  return { source, spray: c.slice(), points, times, slopes, duration: times[count] };
}

export function autumnLeaves(T, group, map, surfaces, mobile) {
  const random = seeded(3414782),
    cap = mobile ? 36 : 48;
  const material = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  const mesh = new T.InstancedMesh(leafBlade(T), material, cap);
  mesh.name = 'Autumn · air, roadside litter and floating leaves';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.count = 0;
  group.add(mesh);
  const dummy = new T.Object3D(),
    up = new T.Vector3(0, 1, 0),
    n = new T.Vector3(),
    flat = new T.Quaternion(),
    inPlane = new T.Quaternion(),
    air = new T.Quaternion(),
    euler = new T.Euler();
  const bladePositions = mesh.geometry.attributes.position,
    contactVertices = [],
    unique = new Set(),
    rotated = new T.Vector3();
  for (let i = 0; i < bladePositions.count; i++) {
    const p = new T.Vector3().fromBufferAttribute(bladePositions, i),
      key = p.toArray().join(',');
    if (!unique.has(key)) {
      unique.add(key);
      contactVertices.push(p);
    }
  }
  const tracks = lanes.map((l) => ({ ...l, next: l.delay })),
    leaves = [],
    history = [];
  let clock = 0,
    sequence = 0,
    wasAutumn = false;
  const totals = { released: 0, groundContacts: 0, waterContacts: 0 };
  function log(type, leaf) {
    history.push({
      event: type,
      id: leaf.id,
      treeId: leaf.treeId,
      lane: leaf.lane,
      position: vector(leaf.position),
      kind: leaf.surface?.kind,
      time: rounded(clock),
    });
    if (history.length > 18) history.shift();
  }
  function spawn(lane) {
    const deciduous = getTreeCrowns(map).filter((t) => !t.evergreen && t.sprays.length);
    if (!deciduous.length) return;
    const trees = nearest(deciduous, lane.at, lane.kind === 'court' ? 1 : lane.kind === 'water' ? 7 : 4);
    const start = Math.floor(random() * trees.length);
    for (let attempt = 0; attempt < Math.min(8, trees.length + 2); attempt++) {
      const openingTree =
        sequence === 0 && attempt === 0 && lane.id === 'addison-path'
          ? deciduous.find((t) => t.id === opening.treeId)
          : null;
      const tree = openingTree || trees[(attempt + start) % trees.length];
      let target = chooseTarget(lane, tree, surfaces, random, map);
      if (openingTree) {
        const [x, z] = opening.verge,
          s = surfaces.sample(x, z);
        if (land.has(s.kind) && s.y < 1) target = [x, s.y, z];
      }
      if (!target) continue;
      const trail = trajectory(tree, target, lane, surfaces, random, !!openingTree);
      if (!trail) continue;
      const size = 0.96 + random() * 0.37,
        id = ++sequence;
      const leaf = {
        id,
        treeId: tree.id,
        kind: tree.kind,
        lane: lane.id,
        age: 0,
        rest: 0,
        phase: random() * 6.28,
        size,
        az: random() * 6.28,
        speed: 1.4 + random() * 2.7,
        tint: new T.Color(litter[Math.floor(random() * litter.length)]),
        mode: 'falling',
        ...trail,
        position: trail.source.slice(),
        surface: surfaces.sample(trail.source[0], trail.source[2]),
        drift: 0,
        life: 22 + random() * 27,
        maxVerticalSpeed: 0,
        lastHalfSecondStep: 0,
        landingStep: 0,
      };
      leaves.push(leaf);
      totals.released++;
      log('detach', leaf);
      return;
    }
  }
  function advanceLeaf(l, dt) {
    l.age += dt;
    if (l.mode === 'falling') {
      const t = clamp(l.age / l.duration);
      let i = 0,
        hi = l.times.length - 1;
      while (hi - i > 1) {
        const mid = (i + hi) >> 1;
        if (l.times[mid] < l.age) i = mid;
        else hi = mid;
      }
      const span = l.times[i + 1] - l.times[i],
        k = clamp((l.age - l.times[i]) / span);
      l.position = l.points[i].map((v, j) => lerp(v, l.points[i + 1][j], k));
      const kk = k * k,
        kkk = kk * k;
      l.position[1] =
        (2 * kkk - 3 * kk + 1) * l.points[i][1] +
        (kkk - 2 * kk + k) * span * l.slopes[i] +
        (-2 * kkk + 3 * kk) * l.points[i + 1][1] +
        (kkk - kk) * span * l.slopes[i + 1];
      l.surface = surfaces.sample(l.position[0], l.position[2]);
      if (t >= 1) {
        l.mode = l.surface.kind === 'water' ? 'floating' : 'settled';
        totals[l.mode === 'floating' ? 'waterContacts' : 'groundContacts']++;
        log('contact', l);
      }
    } else {
      l.rest += dt;
      if (l.mode === 'floating') {
        const angle = -0.31 + 0.3 * Math.sin(l.phase + l.rest * 0.35),
          speed = 0.21 + 0.028 * Math.sin(l.rest * 0.59 + l.phase);
        const dx = Math.sin(angle) * speed * dt,
          dz = Math.cos(angle) * speed * dt;
        for (const [x, z] of [
          [l.position[0] + dx, l.position[2] + dz],
          [l.position[0], l.position[2] + dz],
          [l.position[0] + dx, l.position[2]],
        ]) {
          const s = surfaces.sample(x, z);
          if (s.kind !== 'water') continue;
          l.drift += Math.hypot(x - l.position[0], z - l.position[2]);
          l.position = [x, s.y + 0.014 + 0.0018 * Math.sin(l.age * 2 + l.phase), z];
          l.surface = s;
          break;
        }
      }
    }
  }
  function update(dt, sim) {
    const autumn = sim.weights[2];
    clock += dt;
    if (autumn > 0.18) {
      if (!wasAutumn) for (const l of tracks) l.next = l.delay;
      for (const lane of tracks) {
        lane.next -= dt * autumn;
        if (lane.next <= 0 && leaves.length < cap) {
          spawn(lane);
          lane.next = lane.interval * (0.76 + random() * 0.52);
        }
      }
      wasAutumn = true;
    } else wasAutumn = false;
    let drawn = 0;
    for (let i = leaves.length - 1; i >= 0; i--) {
      const l = leaves[i];
      const previousY = l.position[1],
        previousMode = l.mode;
      advanceLeaf(l, dt);
      if (l.rest > l.life || autumn < 0.008) {
        leaves.splice(i, 1);
        continue;
      }
      const settling = l.mode === 'falling' ? smooth((l.age / l.duration - 0.8) / 0.2) : 1;
      const roll = l.phase + l.age * l.speed,
        tilt = 0.94 * Math.sin(l.age * 2.25 + l.phase);
      air.setFromEuler(euler.set(tilt, roll * 0.49, roll, 'YXZ'));
      if (settling > 0.001) {
        const [x, y, z] = l.position;
        if (l.surface.kind === 'water')
          n.set(
            0.024 * Math.sin(l.phase + l.rest),
            1,
            0.018 * Math.sin(l.phase + 0.6 * l.rest),
          ).normalize();
        else {
          const h = 0.11,
            sx = surfaces.sample(x + h, z).y - surfaces.sample(x - h, z).y,
            sz = surfaces.sample(x, z + h).y - surfaces.sample(x, z - h).y;
          n.set(-clamp(sx / (2 * h), -0.85, 0.85), 1, -clamp(sz / (2 * h), -0.85, 0.85)).normalize();
        }
        flat.setFromUnitVectors(up, n);
        inPlane.setFromAxisAngle(
          up,
          l.az + (l.mode === 'floating' ? 0.17 * Math.sin(l.rest * 0.32 + l.phase) : 0),
        );
        flat.multiply(inPlane);
        air.slerp(flat, settling);
      }
      const scale = l.size * smooth(autumn / 0.56) * smooth((l.life - l.rest) / 4);
      dummy.quaternion.copy(air);
      dummy.scale.setScalar(scale);
      // Vertical radius of the rotated blade prevents a low wing of the leaf
      // crossing its supporting triangle on the last turn before touchdown.
      const rot = dummy.quaternion,
        verticalX = 2 * (rot.x * rot.y + rot.w * rot.z),
        verticalZ = 2 * (rot.y * rot.z - rot.w * rot.x);
      const needed = scale * (Math.abs(verticalX) * 0.081 + Math.abs(verticalZ) * 0.121);
      let clearance = l.position[1] - needed - l.surface.y;
      if (l.mode !== 'falling' || clearance < 0.32) {
        // A tilted leaf can rest at a roof/path slope with one edge below the
        // *centre's* elevation. Use the triangles under the individual vertices.
        let highest = -Infinity;
        if (l.mode === 'settled' && l.contactY !== undefined && Math.abs(l.lockScale - scale) < 0.001)
          highest = l.contactY;
        else {
          for (const vertex of contactVertices) {
            rotated.copy(vertex).multiplyScalar(scale).applyQuaternion(rot);
            const floor =
              l.surface.kind === 'water'
                ? l.surface.y
                : surfaces.sample(l.position[0] + rotated.x, l.position[2] + rotated.z).y;
            highest = Math.max(highest, floor - rotated.y);
          }
          if (l.mode === 'settled') {
            l.contactY = highest;
            l.lockScale = scale;
          }
        }
        const film = l.mode === 'floating' ? 0.0022 + 0.0008 * Math.sin(l.age * 2 + l.phase) : 0.0024;
        l.position[1] = l.mode === 'falling' ? Math.max(l.position[1], highest + film) : highest + film;
        clearance = l.position[1] - highest;
      }
      dummy.position.set(...l.position);
      dummy.updateMatrix();
      mesh.setMatrixAt(drawn, dummy.matrix);
      mesh.setColorAt(drawn, l.tint);
      drawn++;
      l.orientation = [rot.x, rot.y, rot.z, rot.w];
      l.clearance = clearance;
      if (dt > 0) {
        const dy = Math.abs(l.position[1] - previousY);
        l.maxVerticalSpeed = Math.max(l.maxVerticalSpeed, dy / dt);
        if (previousMode === 'falling' && l.duration - l.age <= 0.5)
          l.lastHalfSecondStep = Math.max(l.lastHalfSecondStep, dy);
        if (previousMode === 'falling' && l.mode !== 'falling') l.landingStep = dy;
      }
    }
    mesh.count = drawn;
    if (drawn) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    }
  }
  return {
    update,
    metrics: () => ({
      active: leaves.length,
      ...totals,
      history: history.map((h) => ({ ...h })),
      items: leaves.map((l) => ({
        id: l.id,
        treeId: l.treeId,
        treeKind: l.kind,
        lane: l.lane,
        state: l.mode,
        age: rounded(l.age),
        duration: rounded(l.duration),
        source: vector(l.source),
        sourceSpray: vector(l.spray),
        position: vector(l.position),
        orientation: vector(l.orientation || [0, 0, 0, 1]),
        support: l.surface.kind,
        supportY: rounded(l.surface.y),
        centreGap: rounded(l.position[1] - l.surface.y),
        undersideGap: rounded(l.clearance ?? 0),
        maxVerticalSpeed: rounded(l.maxVerticalSpeed),
        maxFinalHalfSecondStep: rounded(l.lastHalfSecondStep),
        landingStep: rounded(l.landingStep),
        floatDistance: rounded(l.drift),
      })),
    }),
  };
}
