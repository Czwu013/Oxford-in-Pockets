import * as T from 'three';
import { Batches, beam, box, post, quad, geometry, brushed, washMaterial, randomSeed } from './drawing.js';

const mix = (a, b, t) => a + (b - a) * t;
function curve(t, a, b) {
  const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
}
function sample(profile, u) {
  if (u <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++)
    if (u <= profile[i][0]) {
      const [a, v] = profile[i - 1],
        [b, w] = profile[i];
      return mix(v, w, (u - a) / (b - a));
    }
  return profile.at(-1)[1];
}
export function bridgeFrame(map) {
  const [[ax, az], [bx, bz]] = map.bridge.axis,
    length = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / length,
    uz = (bz - az) / length;
  const at = (u, y, v) => [ax + u * ux - v * uz, y, az + u * uz + v * ux];
  const local = (x, z) => [(x - ax) * ux + (z - az) * uz, -(x - ax) * uz + (z - az) * ux];
  const deck = (u) =>
    curve(u, -14, 5) *
    (1 - curve(u, 117, length + 0.05)) *
    (2.18 + 0.72 * Math.sin(Math.PI * Math.max(0, Math.min(1, u / length))));
  const north = [
    [-6, -6.15],
    [0, -6.13],
    [31, -6.3],
    [51.3, -6.27],
    [52.2, -7.9],
    [55, -9.26],
    [68.2, -9.48],
    [70, -8.9],
    [72.3, -6.28],
    [101, -7.05],
    [122, -7.04],
    [136, -10.36],
  ];
  const south = [
    [-6, 7.1],
    [0, 7.36],
    [29, 7.11],
    [52.7, 7.48],
    [54, 9.36],
    [58.8, 10.1],
    [68, 10.38],
    [70.1, 9.76],
    [72.2, 8.19],
    [96, 9.23],
    [122, 10.46],
    [136, 11.76],
  ];
  const edge = (u, side) => sample(side < 0 ? north : south, u);
  const sidewalk = (u, sign) =>
    sample(
      sign < 0
        ? [
            [-7, -4.5],
            [51, -4.35],
            [96, -4.65],
            [122, -4.75],
            [136, -5.65],
          ]
        : [
            [-7, 4.7],
            [33, 4.7],
            [94, 5.48],
            [135, 6.25],
          ],
      u,
    );
  const footA = map.addisonBridge[0],
    footB = map.addisonBridge.at(-1);
  const shoreGrid = new Map(),
    cell = 8;
  for (const line of map.softShore) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1],
        b = line[i];
      for (
        let gx = Math.floor((Math.min(a[0], b[0]) - 2) / cell);
        gx <= Math.floor((Math.max(a[0], b[0]) + 2) / cell);
        gx++
      )
        for (
          let gz = Math.floor((Math.min(a[1], b[1]) - 2) / cell);
          gz <= Math.floor((Math.max(a[1], b[1]) + 2) / cell);
          gz++
        ) {
          const key = gx + ' ' + gz;
          if (!shoreGrid.has(key)) shoreGrid.set(key, []);
          shoreGrid.get(key).push([a, b]);
        }
    }
  }
  function heightAt(x, z) {
    const [u, v] = local(x, z);
    if (u >= -14 && u <= length + 0.12 && v >= edge(u, -1) - 0.3 && v <= edge(u, 1) + 0.3)
      return deck(u) + (v < sidewalk(u, -1) || v > sidewalk(u, 1) ? 0.14 : 0.04);
    const dx = footB[0] - footA[0],
      dz = footB[1] - footA[1],
      d = dx * dx + dz * dz;
    const t = ((x - footA[0]) * dx + (z - footA[1]) * dz) / d;
    if (t >= -0.04 && t <= 1.04 && Math.abs((x - footA[0]) * dz - (z - footA[1]) * dx) < Math.sqrt(d) * 1.45)
      return 0.06 + 0.47 * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    const nearby = shoreGrid.get(Math.floor(x / cell) + ' ' + Math.floor(z / cell));
    if (nearby) {
      let nearest = 1.8;
      for (const [a, b] of nearby) {
        const dx = b[0] - a[0],
          dz = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        nearest = Math.min(nearest, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
      }
      if (nearest < 1.8) return -1.91 * Math.pow(1 - nearest / 1.8, 1.45) + 0.018;
    }
    return 0.045;
  }
  return { length, at, local, deck, edge, sidewalk, heightAt };
}
export function buildBridges(scene, map, frame) {
  const { length, at, deck, edge, sidewalk } = frame,
    batch = new Batches(scene, 'Magdalen Bridge');
  const stoneTex = brushed('stone'),
    roadTex = brushed('road'),
    slabTex = brushed('paving');
  const wall = washMaterial('Oxford limestone', '#b5a68a', stoneTex, 6, 'wall');
  const face = washMaterial('Stone panels', '#c5b79c', stoneTex, 6.8, 'wall');
  const dark = washMaterial('Vault soffits', '#a89d85', stoneTex, 5.4, 'wall');
  const shadeVault = dark.onBeforeCompile;
  dark.onBeforeCompile = (shader) => {
    shadeVault(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vaultUV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvaultUV=uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vaultUV;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float recess=smoothstep(.016,.40,min(vaultUV.x,1.-vaultUV.x));
        diffuseColor.rgb*=mix(vec3(1.12,1.09,1.),vec3(.38,.48,.49),recess);
        float radialJoint=abs(fract(vaultUV.y*15.+.5)-.5);
        float barrelJoint=abs(fract(vaultUV.x*11.+floor(vaultUV.y*15.+.5)*.5+.5)-.5);
        float worn=1.-min(smoothstep(.005,.055,radialJoint),smoothstep(.004,.022,barrelJoint));
        diffuseColor.rgb*=1.-.16*worn;`,
      );
  };
  const rim = washMaterial('Dressed coping', '#d9ccae', stoneTex, 6, 'wall');
  const curb = washMaterial('Pale kerb', '#b9af97', stoneTex, 4.6, 'wall');
  const walk = washMaterial('Bridge paving', '#c4bba8', slabTex, 9.5);
  const road = washMaterial('Bridge deck', '#898b84', roadTex, 9);
  const simple = (n, c) =>
    Object.assign(new T.MeshStandardMaterial({ color: c, roughness: 0.85, side: T.DoubleSide }), {
      name: n,
    });
  const iron = simple('Painted iron', '#48554e'),
    mark = simple('Faded road markings', '#c9c3a3'),
    ochre = simple('Kerb line', '#d1b875');
  const glass = simple('Lantern glass', '#e7d7a5'),
    rng = randomSeed(915);
  const voussoir = washMaterial('Voussoirs · hand-cut stone', '#d0bea0', stoneTex, 8.4, 'wall');
  const shadeVoussoir = voussoir.onBeforeCompile;
  voussoir.onBeforeCompile = (shader) => {
    shadeVoussoir(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 voussoirUV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvoussoirUV=uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 voussoirUV;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float stoneIndex=floor(voussoirUV.x*.5), ringX=fract(voussoirUV.x*.5)*2.;
        float ochre=fract(sin(stoneIndex*19.67)*4537.31);
        float cutMarks=pow(max(0.,sin(voussoirUV.y*96.+ringX*10.+ochre*28.)),6.);
        float lip=smoothstep(.84,1.,voussoirUV.y)*(1.-smoothstep(.03,.22,ringX));
        diffuseColor.rgb*=mix(vec3(.88,.84,.75),vec3(1.16,1.15,1.11),ochre)*(1.-.035*cutMarks+.063*lip);`,
      );
  };
  const ringPositions = [],
    ringUV = [];
  const archData = map.bridge.wetArches;
  const openings = [
    [-5.5, -1.25, 0.2, 'towpath'],
    ...archData.slice(0, 3).map((a) => [...a, 1.52, 'channel']),
    [29.6, 34.1, 0.86, 'towpath'],
    [55.1, 68.4, 1.93, 'island'],
    [94.8, 98.9, 1.22, 'towpath'],
    ...archData.slice(3).map((a) => [...a, 1.41, 'channel']),
    [123.2, 128.2, 0.62, 'towpath'],
  ];
  function baseArch(u) {
    for (const [lo, hi, crown, type] of openings) {
      if (u < lo || u > hi) continue;
      const k = (u - (lo + hi) / 2) / ((hi - lo) / 2);
      const spring = type === 'channel' ? -2.03 : -0.46;
      return spring + Math.sqrt(Math.max(0, 1 - k * k)) * (Math.min(crown, deck(u) - 0.49) - spring);
    }
    return -2.52;
  }
  const cuts = new Set([-7, length]);
  for (let u = -7; u < length; u += 1.5) cuts.add(Math.round(u * 1000) / 1000);
  for (const [lo, hi] of openings) {
    cuts.add(lo - 0.012);
    cuts.add(hi + 0.012);
    for (let n = 0; n <= 24; n++) cuts.add((lo + hi) / 2 - ((hi - lo) / 2) * Math.cos((n / 24) * Math.PI));
  }
  const U = [...cuts].sort((a, b) => a - b),
    byMat = new Map(),
    vaultPos = [],
    vaultUV = [];
  const Q = (m, ...corners) => {
    if (!byMat.has(m)) byMat.set(m, []);
    quad(byMat.get(m), ...corners);
  };
  const sideY = (u, v) => at(u, deck(u), v);
  for (let i = 1; i < U.length; i++) {
    const a = U[i - 1],
      b = U[i],
      ha = baseArch(a),
      hb = baseArch(b);
    Q(
      road,
      sideY(a, sidewalk(a, -1)),
      sideY(b, sidewalk(b, -1)),
      sideY(b, sidewalk(b, 1)),
      sideY(a, sidewalk(a, 1)),
    );
    for (const side of [-1, 1]) {
      const aa = edge(a, side),
        bb = edge(b, side),
        ka = sidewalk(a, side),
        kb = sidewalk(b, side);
      Q(wall, at(a, ha, aa), at(b, hb, bb), at(b, deck(b) + 0.12, bb), at(a, deck(a) + 0.12, aa));
      Q(
        walk,
        at(a, deck(a) + 0.13, aa),
        at(b, deck(b) + 0.13, bb),
        at(b, deck(b) + 0.13, kb),
        at(a, deck(a) + 0.13, ka),
      );
      Q(
        curb,
        at(a, deck(a) + 0.14, ka),
        at(b, deck(b) + 0.14, kb),
        at(b, deck(b) - 0.015, kb),
        at(a, deck(a) - 0.015, ka),
      );
    }
    const opening = openings.find(([lo, hi]) => a >= lo - 0.0001 && b <= hi + 0.0001);
    if (opening) {
      const [lo, hi] = opening;
      const angle = (u) => Math.acos(Math.max(-1, Math.min(1, (lo + hi - 2 * u) / (hi - lo)))) / Math.PI;
      quad(
        vaultPos,
        at(a, ha, edge(a, -1)),
        at(b, hb, edge(b, -1)),
        at(b, hb, edge(b, 1)),
        at(a, ha, edge(a, 1)),
      );
      vaultUV.push(0, angle(a), 0, angle(b), 1, angle(a), 0, angle(b), 1, angle(b), 1, angle(a));
    }
  }
  batch.add(dark, geometry(vaultPos, vaultUV));
  // Each ring has separate projecting voussoirs, with mortar joints and a taller keystone.
  for (const [lo, hi, crown, type] of openings) {
    const m = (lo + hi) / 2,
      rad = (hi - lo) / 2,
      spring = type === 'channel' ? -2.03 : -0.46;
    const count = Math.ceil(rad * 3) | 1;
    for (const side of [-1, 1])
      for (let j = 0; j < count; j++) {
        const t0 = ((j + 0.02) * Math.PI) / count,
          t1 = ((j + 0.98) * Math.PI) / count;
        const key = j === Math.floor(count / 2);
        const shell = (t, w, projection) => {
          const u = m - Math.cos(t) * (rad + w),
            baseU = m - Math.cos(t) * rad,
            y = spring + Math.sin(t) * (Math.min(crown, deck(baseU) - 0.49) - spring + w);
          return at(u, y, edge(u, side) + side * projection);
        };
        const extra = key ? 0.49 : 0.34,
          projection = key ? 0.235 : 0.15;
        const blockIndex = 2 * Math.floor(rng() * 181);
        quad(
          ringPositions,
          shell(t0, 0, projection),
          shell(t1, 0, projection),
          shell(t1, extra, projection),
          shell(t0, extra, projection),
        );
        ringUV.push(
          blockIndex,
          0,
          blockIndex + 1,
          0,
          blockIndex,
          1,
          blockIndex + 1,
          0,
          blockIndex + 1,
          1,
          blockIndex,
          1,
        );
        Q(
          face,
          shell(t0, extra, projection),
          shell(t1, extra, projection),
          shell(t1, extra, 0),
          shell(t0, extra, 0),
        );
        Q(
          wall,
          shell(t0, 0, -0.035),
          shell(t1, 0, -0.035),
          shell(t1, 0, projection),
          shell(t0, 0, projection),
        );
        if (key)
          for (const t of [t0, t1])
            Q(face, shell(t, 0, 0), shell(t, 0, projection), shell(t, extra, projection), shell(t, extra, 0));
      }
  }
  batch.add(voussoir, geometry(ringPositions, ringUV));
  function segment(mat, u0, u1, zfun, ylift, thick, height) {
    // Both ends of each stone track follow the deck's level and widening.
    const layers = [-1, 1].map((s) =>
      [u0, u1].map((u) =>
        [-1, 1].map((v) => at(u, deck(u) + ylift + s * height * 0.5, zfun(u) + v * thick * 0.5)),
      ),
    );
    const [[A, B], [C, D]] = layers;
    Q(mat, A[0], B[0], D[0], C[0]);
    Q(mat, A[1], B[1], D[1], C[1]);
    Q(mat, C[0], D[0], D[1], C[1]);
    Q(mat, A[1], B[1], B[0], A[0]);
    Q(mat, A[0], A[1], C[1], C[0]);
    Q(mat, B[0], B[1], D[1], D[0]);
  }
  for (const side of [-1, 1]) {
    const track = (u) => edge(u, side) - side * 0.23;
    const divisions = [
      -6.4,
      0,
      10.9,
      20.4,
      29.3,
      39,
      51.4,
      54,
      61.7,
      69.3,
      72.25,
      84,
      97.5,
      108.8,
      114.8,
      122.2,
      132.7,
      length,
    ];
    for (let i = 1; i < divisions.length; i++) {
      const a = divisions[i - 1],
        b = divisions[i],
        l = b - a;
      segment(face, a, b, track, 0.22, 0.63, 0.42);
      segment(rim, a, b, track, 0.4, 0.73, 0.13);
      segment(rim, a, b, track, 1.2, 0.63, 0.18);
      segment(curb, a, b, track, 0.01, 0.83, 0.13);
      const abutment = l < 3.4 || i === 1 || i === divisions.length - 1;
      if (abutment) {
        segment(face, a + 0.12, b - 0.12, track, 0.78, 0.42, 0.85);
        continue;
      }
      const num = Math.max(2, Math.round(l / 0.56));
      for (let j = 0; j < num; j++) {
        const u = a + ((j + 0.5) * l) / num,
          p = at(u, deck(u) + 0.46, track(u));
        batch.add(rim, post(p[0], p[1], p[2], 0.147, 0.091, 0.25, 6));
        batch.add(rim, post(p[0], p[1] + 0.25, p[2], 0.094, 0.144, 0.2, 6));
        batch.add(rim, post(p[0], p[1] + 0.45, p[2], 0.144, 0.095, 0.18, 6));
      }
    }
    for (const u of divisions) {
      const p = at(u, deck(u), track(u));
      batch.add(face, box(p[0], p[1] + 0.64, p[2], 0.68, 1.27, 0.69));
      batch.add(rim, box(p[0], p[1] + 1.31, p[2], 0.78, 0.13, 0.78));
    }
    for (const u of [11.4, 20.4, 108.9, 114.4]) {
      const p = at(u, -2.4, edge(u, side) + side * 0.04);
      const crown = deck(u) + 0.09,
        height = crown + 2.45;
      batch.add(wall, post(p[0], -2.45, p[2], 0.92, 0.7, height - 0.25, 12));
      // Rusticated engaged half-columns on the river piers. Square stones
      // interrupt the curved shaft and project over the springing.
      const track = (t) => edge(t, side) + side * 0.14;
      for (let level = 0; level < 7; level++) {
        const y = -2.25 + (level * (height - 0.35)) / 7;
        const w = 1.47 - level * 0.033;
        segment(
          level % 2 ? face : wall,
          u - w / 2,
          u + w / 2,
          track,
          y - deck(u),
          2.01 - level * 0.041,
          0.22,
        );
      }
      segment(rim, u - 0.8, u + 0.8, track, crown - deck(u) - 0.25, 1.59, 0.24);
      segment(face, u - 0.86, u + 0.86, track, crown - deck(u) - 0.06, 1.68, 0.16);
    }
    for (const u of [3, 48.4, 91.6, 130.7]) {
      const p = at(u, deck(u) + 0.12, track(u) - side * 0.55);
      batch.add(iron, post(p[0], p[1], p[2], 0.14, 0.1, 0.42));
      batch.add(iron, post(p[0], p[1] + 0.4, p[2], 0.075, 0.051, 3.1));
      (scene.userData.lanternSites ??= []).push([p[0], p[1] + 3.74, p[2]]);
      batch.add(glass, post(p[0], p[1] + 3.5, p[2], 0.14, 0.265, 0.44, 4));
      batch.add(iron, post(p[0], p[1] + 3.94, p[2], 0.28, 0.035, 0.18, 4));
    }
    for (let u = -6.4; u < length; u += 1.8) {
      const end = Math.min(u + 1.82, length);
      segment(ochre, u, end, (t) => sidewalk(t, side) - side * 0.18, 0.016, 0.067, 0.013);
    }
  }
  for (let u = -5; u < length - 1; u += 9.4)
    segment(mark, u, Math.min(length, u + 3.25), () => 0.22, 0.021, 0.13, 0.012);
  // Bring the dipped ends of both pavements back to the street.
  for (const [mat, arr] of byMat) batch.add(mat, geometry(arr));
  const approach = [];
  for (let u = -14; u < -7; u += 0.5) {
    for (const [l, r] of [[-4.5, 4.7]]) {
      quad(
        approach,
        at(u, deck(u), l),
        at(u + 0.5, deck(u + 0.5), l),
        at(u + 0.5, deck(u + 0.5), r),
        at(u, deck(u), r),
      );
    }
  }
  batch.add(road, geometry(approach));
  const ends = map.addisonBridge,
    start = ends[0],
    end = ends.at(-1),
    dx = end[0] - start[0],
    dz = end[1] - start[1],
    dist = Math.hypot(dx, dz);
  const fp = (t, w, h) => [start[0] + dx * t - (w * dz) / dist, h, start[1] + dz * t + (w * dx) / dist];
  const height = (t) => 0.06 + 0.47 * Math.sin(Math.PI * t);
  const wooden = simple('Footbridge deck', '#a79579');
  for (let k = 0; k < 38; k++) {
    const a = k / 38,
      b = (k + 1) / 38 - 0.002;
    const arr = [];
    quad(
      arr,
      fp(a, -1.18, height(a)),
      fp(b, -1.18, height(b)),
      fp(b, 1.18, height(b)),
      fp(a, 1.18, height(a)),
    );
    batch.add(wooden, geometry(arr));
  }
  for (const s of [-1, 1]) {
    for (let j = 0; j <= 10; j++) {
      const t = j / 10,
        y = height(t),
        p = fp(t, s * 1.18, y);
      if (j === 0 || j === 10) {
        batch.add(rim, box(p[0], y + 0.48, p[2], 0.41, 0.98, 0.43));
        batch.add(rim, post(p[0], y + 0.94, p[2], 0.26, 0.18, 0.16, 4));
      } else batch.add(iron, post(p[0], y, p[2], 0.05, 0.039, 0.97, 6));
      if (j < 10)
        for (const h of [0.41, 0.92])
          batch.add(
            iron,
            beam(fp(t, s * 1.18, y + h), fp((j + 1) / 10, s * 1.18, height((j + 1) / 10) + h), 0.067),
          );
      if (j < 10)
        batch.add(
          wall,
          beam(
            fp(t, s * 1.12, y - 0.14),
            fp((j + 1) / 10, s * 1.12, height((j + 1) / 10) - 0.14),
            0.21,
            0.26,
          ),
        );
    }
  }
  const group = batch.finish();
  for (const mesh of group.children)
    mesh.userData.surfaceKind =
      mesh.material === dark ? 'vault' : mesh.material === road || mesh.material === walk ? 'deck' : 'bridge';
  return {
    group,
    openings,
    heightAt: frame.heightAt,
    update(wet, snow, glow = 0) {
      glass.emissive.setRGB(0.68 * glow, 0.38 * glow, 0.15 * glow);
      road.color.set('#898b84').multiplyScalar(1 - wet * 0.21);
      road.roughness = 0.87 - wet * 0.52;
      walk.roughness = 0.9 - wet * 0.4;
      rim.color.set('#d9ccae').lerp(new T.Color('#f4f0e4'), snow * 0.62);
    },
  };
}
