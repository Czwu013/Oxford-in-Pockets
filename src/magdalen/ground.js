import * as T from 'three';
import {
  Batches,
  beam,
  box,
  post,
  quad,
  geometry,
  brushed,
  washMaterial,
  flat,
  randomSeed,
  ribbon,
} from './drawing.js';

export function inside(x, z, ring) {
  let parity = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i],
      [c, d] = ring[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) parity = !parity;
  }
  return parity;
}
export function buildGround(scene, map, frame) {
  const fill = new Batches(scene, 'Ground and gardens'),
    base = new Batches(scene, 'Landscape section');
  const rand = randomSeed(330701);
  const tex = {};
  for (const k of ['earth', 'grass', 'bed', 'paving', 'gravel', 'road', 'stone']) tex[k] = brushed(k);
  const grass = washMaterial('Mown college lawns', '#a8b87b', tex.grass, 7.8);
  const meadow = washMaterial('Meadow', '#a0ad7c', tex.grass, 11);
  const garden = washMaterial('Garden borders', '#a29c73', tex.bed, 6.6);
  const bank = washMaterial('Grass verge', '#a9af88', tex.grass, 8.2);
  const court = washMaterial('Court flagstones', '#c6bda4', tex.paving, 9.6);
  const path = washMaterial('Path aggregate', '#cebea1', tex.gravel, 5.3);
  const foot = washMaterial('Yorkstone pavement', '#c9bfae', tex.paving, 9.5);
  const carriage = washMaterial('High Street asphalt', '#8d8e86', tex.road, 8);
  const strata = washMaterial('Earth cross section', '#b6a384', tex.earth, 11, 'wall');
  const topsoil = washMaterial('Topsoil', '#8f8366', tex.earth, 9, 'wall');
  const seam = washMaterial('Pale strata', '#c5b79c', tex.earth, 12, 'wall');
  const shale = washMaterial('Lower strata', '#a6987b', tex.earth, 13, 'wall');
  const masonry = washMaterial('River retaining wall', '#a79e86', tex.stone, 6, 'wall');
  const riverEdge = washMaterial('Water in section', '#799187', tex.gravel, 10, 'wall');
  const materialOf = {
    lawn: grass,
    meadow,
    grove: meadow,
    bed: garden,
    court,
    path,
    pavement: foot,
    road: carriage,
  };
  const closed = (ring) => [...ring, ring[0]];
  const outer = closed(map.boundary.outer);
  base.add(strata, ribbon(outer, -5.35, -2.22));
  base.add(seam, ribbon(outer, -5.62, -5.35));
  base.add(shale, ribbon(outer, -6.14, -5.62));
  base.add(strata, flat(map.boundary, -6.13));
  for (const poly of map.landTop) fill.add(bank, flat(poly, 0));
  for (const poly of map.land) {
    for (const r of [poly.outer, ...poly.holes]) {
      const c = closed(r);
      base.add(strata, ribbon(c, -2.26, -1.905));
    }
  }
  for (const line of map.edgeWalls) {
    base.add(topsoil, ribbon(line, -0.59, -0.015));
    base.add(strata, ribbon(line, -1.94, -0.58));
  }
  const silt = washMaterial('Silt at water level', '#9a967a', tex.gravel, 5);
  const sedge = washMaterial('Sedge bank', '#9d9f79', tex.bed, 6);
  [silt, sedge, bank].forEach((mat, i) => fill.add(mat, geometry(map.bankMesh[i])));
  for (const poly of map.water)
    for (const r of [poly.outer, ...poly.holes]) base.add(riverEdge, ribbon(closed(r), -2.23, -1.91));
  for (const p of map.surfaces) {
    if (materialOf[p.kind]) fill.add(materialOf[p.kind], flat(p, 0.025));
  }
  fill.finish(false, true);
  base.finish(true, true);
  const details = new Batches(scene, 'Landscape details'),
    staticLines = new Batches(scene, 'Streets and paths');
  const simple = (name, color, params = {}) =>
    Object.assign(new T.MeshStandardMaterial({ color, roughness: 0.87, side: T.DoubleSide, ...params }), {
      name,
    });
  const ink = simple('Wrought iron', '#465149'),
    lamps = simple('Lantern panes', '#e6d8ab'),
    timber = simple('Seasoned oak', '#9c8262');
  const edgeLine = simple('Irregular grass edges', '#91906f'),
    sand = simple('River gravel', '#b5b397');
  const smallMark = simple('Faded white street paint', '#c0bca2'),
    yellow = simple('Ochre kerb paint', '#c3ab74');
  function inWater(x, z) {
    return map.water.some((p) => inside(x, z, p.outer) && !p.holes.some((h) => inside(x, z, h)));
  }
  for (const line of map.shore) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1],
        b = line[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 0.16) continue;
      const x = (a[0] + b[0]) / 2,
        z = (a[1] + b[1]) / 2;
      const f = frame.local(x, z);
      if (f[0] >= -2 && f[0] < frame.length + 1 && Math.abs(f[1]) < 11.2) continue;
      let nx = -dz / len,
        nz = dx / len;
      if (!inWater(x + nx * 0.19, z + nz * 0.19)) {
        nx = -nx;
        nz = -nz;
      }
      const hard = (x < 42 && z > 1 && z < 91 && x < 67 - z * 0.55) || (x < 18 && z > 45 && z < 102);
      const width = hard ? 0.12 : 0.04,
        arr = [];
      if (hard) {
        quad(
          arr,
          [a[0], 0.015, a[1]],
          [b[0], 0.015, b[1]],
          [b[0] + nx * width, -1.97, b[1] + nz * width],
          [a[0] + nx * width, -1.97, a[1] + nz * width],
        );
        details.add(masonry, geometry(arr));
        details.add(masonry, beam([a[0], 0.11, a[1]], [b[0], 0.11, b[1]], 0.25, 0.27));
      }
      if (!hard && len > 1.5 && rand() < 0.47) {
        const w = width + 0.22,
          ds = Math.min(2.4, len * 0.39),
          arr2 = [];
        quad(
          arr2,
          [x + nx * w - (dx / len) * ds, -1.885, z + nz * w - (dz / len) * ds],
          [x + nx * w + (dx / len) * ds, -1.885, z + nz * w + (dz / len) * ds],
          [x + nx * (w + 0.09) + (dx / len) * ds, -1.885, z + nz * (w + 0.09) + (dz / len) * ds],
          [x + nx * (w + 0.09) - (dx / len) * ds, -1.885, z + nz * (w + 0.09) - (dz / len) * ds],
        );
        staticLines.add(sand, geometry(arr2));
      }
    }
  }
  // Pencil-thin pavement joints and mown edges remain in the same positions in every season.
  for (const p of map.surfaces.filter((p) => p.kind === 'lawn' && p.outer.length < 48)) {
    const r = closed(p.outer);
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1],
        b = r[i];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.48)
        staticLines.add(edgeLine, beam([a[0], 0.045, a[1]], [b[0], 0.045, b[1]], 0.044, 0.09));
    }
  }
  function bench(x, z, a) {
    for (const [v, y] of [
      [-0.21, 0.45],
      [0, 0.45],
      [0.2, 0.45],
      [0.3, 0.77],
      [0.3, 0.95],
    ]) {
      details.add(timber, box(x + Math.sin(a) * v, y, z + Math.cos(a) * v, 1.75, 0.12, 0.16, a));
    }
    for (const s of [-0.6, 0.6])
      details.add(ink, post(x + Math.cos(a) * s, 0.04, z - Math.sin(a) * s, 0.05, 0.05, 0.45, 5));
  }
  const benches = map.details.benches;
  for (const [x, z] of benches) if (!inWater(x, z)) bench(x, z, 0.43);
  if (benches.length < 6)
    for (const [x, z, a] of [
      [57, -48, 0.43],
      [35, -105, 0.44],
      [15, -69, 0.4],
      [-1, -77, 0.45],
    ])
      bench(x, z, a);
  function lamp(x, z, h = 3.7) {
    const y = frame.heightAt(x, z);
    (scene.userData.lanternSites ??= []).push([x, y + h + 0.18, z]);
    details.add(ink, post(x, y, z, 0.17, 0.104, 0.48));
    details.add(ink, post(x, y + 0.45, z, 0.083, 0.049, h - 0.5));
    details.add(lamps, post(x, y + h, z, 0.13, 0.236, 0.38, 4));
    details.add(ink, post(x, y + h + 0.38, z, 0.25, 0.016, 0.15, 4));
  }
  for (const [x, z] of map.details.lamps) lamp(x, z);
  if (map.details.lamps.length < 3)
    for (const [x, z] of [
      [-95, -27],
      [-62.4, -3],
      [-7, 47.8],
      [-104, -33],
    ])
      lamp(x, z);
  for (const line of map.details.railings) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1],
        b = line[i],
        len = Math.hypot(a[0] - b[0], a[1] - b[1]);
      details.add(ink, beam([a[0], 0.92, a[1]], [b[0], 0.92, b[1]], 0.054));
      if (len < 0.15) continue;
      const count = Math.ceil(len / 2.15);
      for (let j = 0; j < count; j++)
        details.add(
          ink,
          post(
            a[0] + ((b[0] - a[0]) * j) / count,
            0.01,
            a[1] + ((b[1] - a[1]) * j) / count,
            0.052,
            0.035,
            0.97,
            5,
          ),
        );
    }
  }
  for (const line of map.details.berths) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1],
        b = line[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz),
        angle = -Math.atan2(dz, dx);
      details.add(timber, box((a[0] + b[0]) / 2, -1.22, (a[1] + b[1]) / 2, len + 0.05, 0.23, 1.42, angle));
      details.add(timber, post(a[0], -2.06, a[1], 0.09, 0.09, 1.28, 6));
    }
  }
  const roadp = map.highStreet,
    s = new T.CurvePath();
  for (let i = 1; i < roadp.length; i++)
    s.add(
      new T.LineCurve3(
        new T.Vector3(roadp[i - 1][0], 0, roadp[i - 1][1]),
        new T.Vector3(roadp[i][0], 0, roadp[i][1]),
      ),
    );
  const length = s.getLength();
  for (let d = 1; d < length - 1; d += 1.1) {
    const p = s.getPointAt(d / length),
      q = s.getPointAt((d + 0.99) / length),
      v = q.clone().sub(p).normalize(),
      loc = frame.local(p.x, p.z);
    if (loc[0] > -14 && loc[0] < frame.length + 0.2 && Math.abs(loc[1]) < 12) continue;
    for (const ofs of [-5.15, 5.18, ...(Math.floor(d / 4) % 3 === 1 ? [0] : [])]) {
      const a = [p.x - v.z * ofs, 0.044, p.z + v.x * ofs],
        b = [q.x - v.z * ofs, 0.044, q.z + v.x * ofs];
      staticLines.add(ofs === 0 ? smallMark : yellow, beam(a, b, ofs === 0 ? 0.115 : 0.072, 0.042));
    }
  }
  staticLines.finish(false, true);
  details.finish(true, true);
  // Transparent water film preserves readable flagstone joints.
  const puddles = new Batches(scene, 'Shallow puddles');
  const film = new T.MeshPhysicalMaterial({
    name: 'Rain film',
    color: '#a4b5ad',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    roughness: 0.17,
    metalness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  for (const p of map.details.puddles) puddles.add(film, flat(p, 0.058));
  const films = puddles.finish(false, true);
  const shadow = new T.Mesh(
    new T.PlaneGeometry(2600, 2600),
    new T.ShadowMaterial({ opacity: 0.13, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -6.23;
  shadow.receiveShadow = true;
  shadow.name = 'Paper table shadows';
  scene.add(shadow);
  // Diffuse contact underneath the cut model, hand-rubbed along the shape of the plinth.
  const can = document.createElement('canvas');
  can.width = can.height = 512;
  const ctx = can.getContext('2d'),
    area = 500;
  ctx.filter = 'blur(7px)';
  ctx.fillStyle = 'rgba(71,65,45,.39)';
  ctx.beginPath();
  map.boundary.outer.forEach(([x, z], i) =>
    i
      ? ctx.lineTo(256 + (x / area) * 512, 256 + (z / area) * 512)
      : ctx.moveTo(256 + (x / area) * 512, 256 + (z / area) * 512),
  );
  ctx.closePath();
  ctx.fill();
  const soft = new T.Mesh(
    new T.PlaneGeometry(area, area),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(can), transparent: true, depthWrite: false }),
  );
  soft.rotation.x = -Math.PI / 2;
  soft.position.y = -6.21;
  soft.name = 'Diffuse base contact';
  scene.add(soft);
  function paint(mat, key, env, wet) {
    mat.color.copy(env[key]).multiplyScalar(1 - wet * (key === 'lawn' ? 0.09 : 0.12));
  }
  return {
    update(env, wet, weights, glow = 0) {
      lamps.emissive.setRGB(0.68 * glow, 0.38 * glow, 0.15 * glow);
      paint(grass, 'lawn', env, wet);
      paint(meadow, 'meadow', env, wet);
      paint(bank, 'bank', env, wet);
      paint(garden, 'garden', env, wet);
      court.color.set('#c8bca3').multiplyScalar(1 - 0.2 * wet);
      foot.color.set('#c9bfae').multiplyScalar(1 - 0.19 * wet);
      path.color.set('#cbbda4').multiplyScalar(1 - wet * 0.16);
      carriage.color.set('#888b83').multiplyScalar(1 - wet * 0.22);
      court.roughness = 0.9 - wet * 0.55;
      foot.roughness = 0.92 - wet * 0.49;
      carriage.roughness = 0.93 - wet * 0.48;
      films.visible = wet > 0.01 || weights[2] > 0.05;
      film.opacity = wet * 0.43 + weights[2] * 0.095;
      sedge.color.copy(env.bank).multiplyScalar(0.85);
      riverEdge.color.copy(env.water);
    },
  };
}
