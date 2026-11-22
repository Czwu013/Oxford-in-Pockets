import { makeBird } from './bird-rig.js';
import { clamp, seeded, lerp } from './geometry.js';
import { getTreeCrowns } from './vegetation.js';

const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const round = (x) => Math.round(x * 10000) / 10000;
const coords = (p) => p.map(round);
const yard = { id: 'west-cloister', at: [-18.6, -33.1], radius: 3.0, min: 6, max: 18 };
const north = { id: 'north-cloister', at: [3.3, -57.7], radius: 3.8, min: 6, max: 18 };
const eastern = { id: 'east-cloister', at: [35, -40.4], radius: 3.7, min: 6, max: 18 };
const bank = {
  id: 'addisons-footbridge',
  at: [64.1, -45.8],
  radius: 2.9,
  min: 0.12,
  max: 2.7,
  bridge: true,
};
const hall = { id: 'hall-roof', at: [3.1, 7.0], radius: 3.5, min: 8.0, max: 24 };
const chapel = { id: 'chapel-roof', at: [-33.4, -9.8], radius: 3.5, min: 9, max: 27.5 };
const northeast = { id: 'north-east-cloister', at: [20.3, -51.6], radius: 2.7, min: 6, max: 18 };
const lowerEast = { id: 'riverside-gallery', at: [26.1, -23], radius: 3.0, min: 6, max: 18 };
const lodge = { id: 'porters-lodge-roof', at: [-60.1, -7.2], radius: 3.1, min: 5.5, max: 26 };

// Order follows the two wings of the cloister and the open stream. Heights
// below are computed from the actual meshes, never from these plan points.
const territories = [
  {
    id: 'cloister-jackdaw',
    seats: [yard, north, northeast],
    wait: 1.8,
    speed: 6.0,
    corridors: [
      [
        [-12, -31],
        [-5, -26],
        [4, -25],
        [12, -31],
        [11, -39],
        [4, -44],
        [-4, -40],
        [-6, -33],
        [0, -35],
        [6, -45],
        [6, -53],
      ],
      [
        [-14, -33],
        [-5, -28],
        [3, -29],
        [11, -37],
        [19, -36],
        [24, -43],
      ],
      [
        [3, -51],
        [-1, -44],
        [3, -37],
        [12, -34],
        [18, -39],
        [23, -45],
      ],
    ],
  },
  {
    id: 'riverside-woodpigeon',
    pigeon: true,
    seats: [bank, eastern, lowerEast],
    wait: 4.9,
    speed: 6.7,
    corridors: [
      [
        [64, -52],
        [68, -61],
        [74, -66],
        [74, -75],
        [66, -77],
        [60, -69],
        [59, -59],
        [56, -48],
        [48, -42],
        [40, -42],
      ],
      [
        [63, -51],
        [65, -58],
        [71, -58],
        [74, -47],
        [61, -36],
        [47, -27],
        [33, -24],
      ],
      [
        [39, -41],
        [49, -47],
        [58, -55],
        [66, -59],
        [68, -51],
        [62, -38],
        [51, -28],
        [35, -25],
      ],
    ],
  },
  {
    id: 'high-street-jackdaw',
    seats: [hall, chapel, lodge],
    wait: 9.8,
    speed: 7.3,
    corridors: [
      [
        [5, 13],
        [1, 20],
        [-9, 27],
        [-16, 33],
        [-21, 40],
        [-33, 43],
        [-40, 35],
        [-38, 24],
        [-40, 13],
        [-44, 3],
        [-39, -6],
      ],
      [
        [5, 16],
        [-2, 24],
        [-13, 27],
        [-26, 36],
        [-43, 28],
        [-55, 19],
        [-61, 4],
      ],
      [
        [-33, -4],
        [-35, 5],
        [-30, 12],
        [-41, 22],
        [-52, 16],
        [-56, 7],
        [-55, -1],
      ],
    ],
  },
];

function perch(map, surfaces, plan) {
  let best = null;
  const steps = 13;
  for (let i = -steps; i <= steps; i++)
    for (let j = -steps; j <= steps; j++) {
      const x = plan.at[0] + (i * plan.radius) / steps,
        z = plan.at[1] + (j * plan.radius) / steps,
        s = surfaces.sample(x, z);
      if (!s || s.normalY < 0.43 || s.y < plan.min || s.y > plan.max) continue;
      const kind = s.kind,
        valid = plan.bridge ? /bridge|stone|wood|path|roof/.test(kind) : /roof|stone/.test(kind);
      if (!valid) continue;
      if (canopyTop(map, x, z, 0.48) > s.y + 0.075) continue;
      const roughScore =
        (plan.bridge ? 1.9 : 0.58) * s.y +
        (kind === 'roof' ? 1 : 0) +
        0.22 * s.normalY -
        0.29 * Math.hypot(x - plan.at[0], z - plan.at[1]);
      if (best && roughScore <= best.score) continue;
      const neighbours = [
        [0.12, 0],
        [-0.12, 0],
        [0, 0.12],
        [0, -0.12],
      ].map(([dx, dz]) => surfaces.sample(x + dx, z + dz));
      if (neighbours.some((n) => !n || Math.abs(n.y - s.y) > 0.21)) continue;
      let safe = true;
      for (const radius of [0.2, 0.31, 0.45])
        for (let a = 0; a < 12; a++) {
          const n = surfaces.sample(
            x + Math.cos((a * Math.PI) / 6) * radius,
            z + Math.sin((a * Math.PI) / 6) * radius,
          );
          if (n.y > s.y + (radius > 0.34 ? 0.18 : 0.074)) {
            safe = false;
            break;
          }
        }
      if (safe) best = { id: plan.id, point: [x, s.y, z], kind, normalY: s.normalY, score: roughScore };
    }
  return best;
}

function canopyTop(map, x, z, padding = 0) {
  let y = -Infinity;
  for (const tree of getTreeCrowns(map)) {
    if (
      Math.abs(x - tree.x) > tree.radius * 2.3 + padding ||
      Math.abs(z - tree.z) > tree.radius * 2.3 + padding
    )
      continue;
    for (const spray of tree.sprays) {
      const [cx, cy, cz] = spray.center,
        [rx, ry, rz] = spray.size;
      // View-facing spray skins have both projected width and convex depth.
      // Enclose each drawn lobe independently; empty gaps remain flyable.
      const r = Math.hypot(1.4 * Math.max(Math.sqrt(rx * rz), ry), 0.53 * Math.min(rx, rz));
      const d = Math.max(0, Math.hypot(x - cx, z - cz) - padding);
      if (d < r) y = Math.max(y, cy + Math.sqrt(r * r - d * d));
    }
  }
  return y;
}

function prepareTrip(T, map, surfaces, start, end, turns, speed) {
  const a = start.point,
    b = end.point;
  const curve = new T.CatmullRomCurve3(
    [[a[0], a[2]], ...turns, [b[0], b[2]]].map(([x, z]) => new T.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const distance = curve.getLength(),
    steps = Math.max(90, Math.ceil(distance / 0.52)),
    spacing = distance / steps;
  const points = curve.getSpacedPoints(steps);
  for (let i = 0; i <= steps; i++) {
    const p = points[i],
      t = i / steps,
      d = Math.min(t, 1 - t) * distance;
    const half = Math.min(0.45, d * 0.27),
      gap = Math.min(1.14, d * 0.66);
    let top = -Infinity;
    for (const [dx, dz] of [
      [0, 0],
      [half, 0],
      [-half, 0],
      [0, half],
      [0, -half],
      [half * 0.76, half * 0.76],
      [half * 0.76, -half * 0.76],
      [-half * 0.76, half * 0.76],
      [-half * 0.76, -half * 0.76],
    ])
      top = Math.max(top, surfaces.sample(p.x + dx, p.z + dz)?.y ?? 0);
    const trees = canopyTop(map, p.x, p.z, 0.72);
    const required = Math.max(top + gap, trees + 0.87);
    p.y = Math.max(required, lerp(a[1], b[1], t) + Math.sin(Math.PI * t) * (3.0 + 1.4 * Math.sin(t * 3.7)));
  }
  // Spread climbs and descents ahead of each obstruction. Contacts are exact
  // while the wings and toes are being folded or extended on the final metre.
  const slope = 0.82;
  for (let i = 1; i < steps; i++) points[i].y = Math.max(points[i].y, points[i - 1].y - spacing * slope);
  for (let i = steps - 1; i > 0; i--)
    points[i].y = Math.max(points[i].y, points[i + 1].y - spacing * slope);
  points[0].y = a[1];
  points[steps].y = b[1];
  const lengths = [0];
  for (let i = 1; i <= steps; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = lengths.at(-1);
  function sample(t) {
    const s = clamp(t) * total;
    let lo = 0,
      hi = steps;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] < s) lo = mid;
      else hi = mid;
    }
    const k = clamp((s - lengths[lo]) / Math.max(0.0001, lengths[hi] - lengths[lo]));
    return points[lo].clone().lerp(points[hi], k);
  }
  return { sample, total, duration: total / speed, preflightSamples: points.length };
}

function footSupport(surfaces, p, yaw, size) {
  const s = Math.sin(yaw),
    c = Math.cos(yaw);
  return [-1, 1].map((sign) => {
    const x = p[0] + size * (sign * 0.034 * c + 0.032 * s),
      z = p[2] + size * (-sign * 0.034 * s + 0.032 * c);
    return { x, z, surface: surfaces.sample(x, z) };
  });
}

export function collegeBirds(T, group, map, surfaces) {
  const rand = seeded(2129031),
    birds = [];
  for (const territory of territories) {
    const seats = territory.seats.map((p) => perch(map, surfaces, p));
    if (seats.some((s) => !s)) continue;
    const birdRand = seeded(Math.floor(rand() * 4294967295)),
      graph = Array.from({ length: seats.length }, () => new Map());
    [
      [0, 1],
      [0, 2],
      [1, 2],
    ].forEach(([from, to], index) => {
      const forward = [],
        back = [];
      for (let variant = 0; variant < 2; variant++) {
        const corridor = territory.corridors[index].map(([x, z], i, a) => {
          const strength = variant ? Math.min(1, (i + 1) / 2, (a.length - i) / 2) * 2.7 : 0;
          return [x + (birdRand() - 0.5) * strength, z + (birdRand() - 0.5) * strength];
        });
        const trip = prepareTrip(
          T,
          map,
          surfaces,
          seats[from],
          seats[to],
          corridor,
          territory.speed * (0.96 + birdRand() * 0.09),
        );
        forward.push(trip);
        back.push({ ...trip, sample: (t) => trip.sample(1 - t) });
      }
      graph[from].set(to, forward);
      graph[to].set(from, back);
    });
    birds.push({
      territory,
      seats,
      graph,
      from: 0,
      to: 1,
      lastFrom: -1,
      variant: 0,
      arrivedYaw: null,
      routesTaken: [],
      rand: birdRand,
      uses: new Map(),
      cycle: 0,
      age: 0,
      state: 'perched',
      hold: territory.wait,
      phase: rand() * 6.28,
      model: makeBird(T, group, !!territory.pigeon, territory.id),
      history: { takeoffs: 0, landings: 0, glides: 0 },
      last: null,
    });
  }
  let elapsed = 0;
  function update(dt) {
    elapsed += dt;
    for (const bird of birds) {
      let left = dt;
      while (left > 0) {
        const trip = bird.graph[bird.from].get(bird.to)[bird.variant];
        const span =
          bird.state === 'perched' ? bird.hold : bird.state === 'settling' ? 0.62 : trip.duration;
        const step = Math.min(left, Math.max(0, span - bird.age));
        bird.age += step;
        left -= step;
        if (bird.age < span - 0.000001) break;
        bird.age = 0;
        if (bird.state === 'perched') {
          bird.state = 'flying';
          bird.history.takeoffs++;
          bird.routesTaken.push({
            from: bird.seats[bird.from].id,
            to: bird.seats[bird.to].id,
            variant: bird.variant,
          });
          if (bird.routesTaken.length > 12) bird.routesTaken.shift();
          const key = [bird.from, bird.to].sort().join('-');
          bird.uses.set(key, (bird.uses.get(key) || 0) + 1);
        } else if (bird.state === 'flying') {
          const velocity = trip.sample(1).sub(trip.sample(0.995));
          bird.arrivedYaw = Math.atan2(velocity.x, velocity.z);
          bird.state = 'settling';
          bird.history.landings++;
        } else {
          bird.lastFrom = bird.from;
          bird.from = bird.to;
          // Choose independently after contact. Under-used corridors have a
          // stronger chance; the bird can still revisit the previous ridge.
          const choices = [...bird.graph[bird.from].keys()].map((to) => {
            const key = [bird.from, to].sort().join('-');
            return {
              to,
              score:
                bird.rand() * 1.4 - (bird.uses.get(key) || 0) * 0.92 - (to === bird.lastFrom ? 0.22 : 0),
            };
          });
          choices.sort((a, b) => b.score - a.score);
          bird.to = choices[0].to;
          bird.variant = bird.rand() < 0.5 ? 0 : 1;
          bird.state = 'perched';
          bird.cycle++;
          bird.hold = 6.9 + bird.rand() * 9.8;
        }
      }
      const course = bird.graph[bird.from].get(bird.to)[bird.variant],
        seat = bird.seats[bird.state === 'settling' ? bird.to : bird.from],
        t = bird.state === 'flying' ? clamp(bird.age / course.duration) : 0;
      let position = seat.point.slice(),
        yaw,
        pitch = 0,
        bankAngle = 0,
        open = 0,
        stroke = 0,
        legs = 1,
        tail = 0.12,
        crouch = 0,
        state = bird.state;
      if (state === 'flying') {
        // A short push-off and flare decelerate the body at either contact.
        const pathTime = 0.65 * t + 0.35 * t * t * (3 - 2 * t),
          pos = course.sample(pathTime),
          ahead = course.sample(pathTime + 0.006),
          back = course.sample(pathTime - 0.006);
        const tangent = ahead.clone().sub(back),
          next = course.sample(pathTime + 0.025).sub(ahead),
          previous = back.clone().sub(course.sample(pathTime - 0.025));
        yaw = Math.atan2(tangent.x, tangent.z);
        const turn = Math.atan2(
          next.x * previous.z - next.z * previous.x,
          next.x * previous.x + next.z * previous.z,
        );
        const air = smooth(Math.min(bird.age, course.duration - bird.age) / 0.5);
        bankAngle = clamp(-turn * 1.22, -0.58, 0.58) * air;
        pitch = -clamp(Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)) * 0.63, -0.32, 0.39) * air;
        const enter = bird.territory.pigeon ? 0.35 : 0.4,
          exit = bird.territory.pigeon ? 0.66 : 0.73;
        const glide = smooth((t - enter) / 0.055) * (1 - smooth((t - exit) / 0.062));
        const launch = smooth(bird.age / 0.34),
          arrival = smooth((course.duration - bird.age) / 0.58);
        open = lerp(0.79, 0.19 + 0.81 * launch, arrival);
        const poweredStroke =
          Math.sin(bird.age * (bird.territory.pigeon ? 29 : 24) + bird.phase) * 0.79 * launch;
        const levelStroke = 0.045 + 0.018 * Math.sin(bird.age * 0.79 + bird.phase);
        stroke = lerp(0.25, lerp(poweredStroke, levelStroke, glide), arrival);
        crouch = -0.031 * (1 - smooth(bird.age / 0.17));
        legs = 1 - smooth(bird.age / 0.6) * smooth((course.duration - bird.age) / 1.35);
        tail = 0.3 + 0.54 * (1 - arrival) + 0.28 * Math.abs(bankAngle);
        position = pos.toArray();
        if (bird.age < 0.62) state = 'takeoff';
        else if (course.duration - bird.age < 1.12) state = 'landing';
        else if (glide > 0.8) state = 'gliding';
        else state = Math.abs(bankAngle) > 0.17 ? 'banking' : 'flapping';
        if (state === 'gliding' && bird.last?.state !== 'gliding') bird.history.glides++;
      } else {
        const direction = course.sample(0.004).sub(course.sample(0));
        // On arrival keep the inbound bearing. Turn gradually while resting.
        const arrivalYaw = bird.arrivedYaw ?? Math.atan2(direction.x, direction.z);
        const departureYaw = Math.atan2(direction.x, direction.z);
        if (bird.state === 'settling') yaw = arrivalYaw;
        else if (bird.cycle) {
          const turn = Math.atan2(Math.sin(departureYaw - arrivalYaw), Math.cos(departureYaw - arrivalYaw));
          yaw = arrivalYaw + turn * smooth(bird.age / 2.4);
        } else yaw = departureYaw;
        if (bird.state === 'settling') {
          open = 0.79 * (1 - smooth(bird.age / 0.62));
          stroke = 0.25 * (1 - smooth(bird.age / 0.52));
          crouch = -0.024 * Math.sin((Math.PI * bird.age) / 0.62);
          tail = 0.45 * (1 - smooth(bird.age / 0.62)) + 0.12;
        } else {
          const prestretch = smooth((bird.age - bird.hold + 0.32) / 0.32);
          open = 0.19 * prestretch;
          crouch = -0.031 * prestretch;
        }
      }
      const contact = bird.state !== 'flying' || bird.age < 0.00001;
      const footOffsets = contact
        ? footSupport(surfaces, position, yaw, bird.territory.pigeon ? 1.15 : 1.04).map(
            (f) => (f.surface?.y ?? position[1]) - position[1],
          )
        : [0, 0];
      const pose = bird.model.pose({
        position,
        yaw,
        pitch,
        bank: bankAngle,
        open,
        stroke,
        legs,
        tail,
        crouch,
        footOffsets,
        headTurn: contact ? 0.22 * Math.sin(elapsed * 1.39 + bird.phase) : 0,
        headNod: contact ? 0.07 * Math.sin(elapsed * 2.1 + bird.phase) : 0,
      });
      const surface = surfaces.sample(position[0], position[2]);
      bird.last = {
        id: bird.territory.id,
        state,
        position: coords(position),
        heading: round(yaw),
        bank: round(bankAngle),
        wingSpread: round(open),
        wingStroke: round(stroke),
        legsExtended: round(legs),
        contact,
        perch: contact ? seat.id : null,
        surface: surface?.kind,
        clearance: round(position[1] - (surface?.y ?? 0)),
        feet: pose.feet.map((v) => {
          const floor = surfaces.sample(v[0], v[2]);
          return {
            position: coords(v),
            support: floor.kind,
            supportY: round(floor.y),
            gap: round(v[1] - floor.y),
          };
        }),
        wingTips: pose.wingTips.map((v) => {
          const ground = surfaces.sample(v[0], v[2]),
            top = canopyTop(map, v[0], v[2]);
          return {
            position: coords(v),
            structureGap: round(v[1] - ground.y),
            crownGap: Number.isFinite(top) ? round(v[1] - top) : null,
          };
        }),
        origin: bird.seats[bird.from].id,
        destination: bird.seats[bird.to].id,
        variant: bird.variant,
        flightFraction: round(t),
        ...bird.history,
      };
    }
  }
  update(0);
  return {
    update,
    metrics: () =>
      birds.map((b) => ({
        ...b.last,
        perches: b.seats.map((s) => ({
          id: s.id,
          position: coords(s.point),
          kind: s.kind,
          normalY: round(s.normalY),
        })),
        routesTaken: b.routesTaken.slice(),
        routeSamples: b.graph[b.from].get(b.to)[b.variant].preflightSamples,
      })),
  };
}
