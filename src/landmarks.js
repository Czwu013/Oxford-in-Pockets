import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gunzipSync } from 'three/addons/libs/fflate.module.js';
import cameraAsset from './assets/radcliffe.gz';
import tomAsset from './assets/tom.gz';
import terraceAsset from './assets/christChurch-college.gz';
import quad from './data/quad.json';
import district from './data/districts.json';
import { batch, ridgeRoof, strip, rect, surface } from './palette.js';
import { faces, frame, orientedBox, atY } from './magdalen/architecture/geometry.js';
import {
  collegiateWall,
  hallWall,
  churchTop,
  squareFloor,
  pondMasonry,
  squareScreen,
  tomTerrace,
} from './college-craft.js';
import {
  lancet,
  sash,
  buttress,
  pinnacle,
  coping,
  merlons,
  pitched,
} from './magdalen/architecture/masonry.js';

const limestone = '#d0bea0',
  sandstone = '#c7ad87',
  light = '#e2d2b4',
  blue = '#75858d';
const centre = (r) => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
function course(g, r, h, w = 0.24) {
  for (const f of faces(r)) coping(g, f, h, { width: w, height: 0.24, out: 0.12, color: light });
}
function gothicRange(g, r, h, kind = 'college') {
  const [outer, ...holes] = r,
    s = kind === 'hall' ? sandstone : limestone;
  const pierced = kind === 'hall' || kind === 'quad' || kind === 'library';
  g.cap('stone', s, outer, h - 0.015, holes);
  if (kind !== 'quad')
    ridgeRoof(g, r, h + 0.02, holes.length ? 0 : Math.min(4.5, orientedBox(outer).W * 0.22), blue, s);
  for (const ring of r) {
    for (const f0 of faces(ring)) {
      // All facades along a hole face back into the courtyard.
      const f = ring === outer ? f0 : frame(f0.a, f0.b, -Math.sign(f0.uz * f0.nx - f0.ux * f0.nz));
      coping(g, f, h, { color: light });
      if (pierced && f.l >= 4.05) {
        if (kind === 'hall') {
          hallWall(g, f, h, s);
          const n = Math.max(1, Math.floor(f.l / 6.32));
          for (let j = 0; j < n; j++) buttress(g, f, (j * f.l) / n + 0.3, 0.04, h - 0.48, 0.63, 0.98);
        } else
          collegiateWall(g, f, h, s, kind === 'quad' && (-650 - f.a[0]) * f.nx + (184 - f.a[1]) * f.nz > 1);
        continue;
      }
      g.panel('stone', s, f, 0, f.l, 0.02, h);
      if (f.l < 4.05) continue;
      const spacing = kind === 'hall' ? 5.9 : 4.45,
        count = Math.max(1, Math.floor(f.l / spacing)),
        step = f.l / count;
      for (let i = 0; i < count; i++) {
        const at = (i + 0.5) * step;
        if (kind === 'hall')
          lancet(g, f, at, 4.5, Math.min(3.4, step * 0.56), Math.min(8, h - 5.3), 4, {
            glass: '#8698a3',
            n: 7,
          });
        else {
          lancet(g, f, at, 1.15, Math.min(2.12, step * 0.52), 3.32, 2, { glass: '#758a89', n: 5 });
          if (h > 7.9) sash(g, f, at, h - 4.3, Math.min(2.28, step * 0.49), 2.8, { color: light });
          if (i % 2 === 1 && f.l > 15) {
            const u = i * step;
            g.block('fine', '#c1b396', f, u - 0.2, u + 0.2, 0.35, h + 0.46, -0.11, 0.29);
            g.frustum('fine', light, f.plan(u, 0.12), h + 0.45, h + 0.94, 0.29, 0.15, 4, 0.76);
          }
          if (i % 3 === 1 && h < 14 && f.l > 18) {
            const s = f.plan(at, -1.5);
            g.frustum('rubble', '#b7a388', s, h + 0.1, h + 2.8, 0.52, 0.49, 4, 0.4);
            g.frustum('fine', light, s, h + 2.78, h + 2.98, 0.6, 0.6, 4, 0.4);
          }
        }
      }
    }
  }
}
function squareTower(g, p, w, h, angle, mainColor) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    make = (size) => rect(0, 0, size, size).map(([x, z]) => [p[0] + c * x - s * z, p[1] + s * x + c * z]);
  const outer = make(w);
  g.prism('stone', mainColor, outer, 0.08, h);
  course(g, outer, h);
  return outer;
}
function spire(g, p, base, rise, radius) {
  const metal = '#999984';
  g.frustum('fine', light, p, base, base + 1.12, radius * 1.11, radius * 0.99, 8, 0.17);
  g.frustum('stone', '#c5b89a', p, base + 0.9, base + rise, radius, 0.12, 8, 0.17);
  for (let i = 0; i < 8; i++) {
    const a = 0.17 + (Math.PI * i) / 4;
    g.bar(
      'trim',
      '#d4c7ad',
      [p[0] + Math.cos(a) * radius, base + 1, p[1] + Math.sin(a) * radius],
      [p[0], base + rise, p[1]],
      0.08,
      4,
    );
  }
  g.frustum('trim', metal, p, base + rise - 0.25, base + rise + 1.2, 0.095, 0.035, 6);
}
function universityChurch(g, b) {
  const r = b[1],
    outer = r[0];
  g.cap('stone', '#ccb58e', outer, 8.67);
  ridgeRoof(g, r, 8.7, 3.8, '#798589', limestone);
  const u = [0.976, -0.218],
    v = [0.218, 0.976],
    origin = [-531.5, -97.75];
  const P = (x, z) => [origin[0] + u[0] * x + v[0] * z, origin[1] + u[1] * x + v[1] * z];
  for (const [x0, x1, z0, z1, h, rise] of [
    [0.7, 33, 4.5, 14.7, 14.3, 4.4],
    [31.8, 53.3, 3.6, 13.8, 13.2, 3.7],
  ]) {
    const rr = [P(x0, z0), P(x1, z0), P(x1, z1), P(x0, z1)];
    g.prism('stone', limestone, rr, 7.5, h);
    pitched(g, P, x0, x1, z0, z1, h, rise, { color: '#79858a', copes: true });
    for (const f of faces(rr))
      if (f.l > 15) {
        const c = Math.floor(f.l / 5.2);
        for (let i = 0; i < c; i++) lancet(g, f, ((i + 0.5) * f.l) / c, 10.1, 2.05, 2.8, 2, { n: 6 });
      }
  }
  for (const f of faces(outer)) {
    if (f.l < 6) {
      g.panel('stone', limestone, f, 0, f.l, 0, 8.7);
      continue;
    }
    const n = Math.max(1, Math.floor(f.l / 5.6));
    hallWall(g, f, 8.7, limestone);
    for (let j = 0; j < n; j++) {
      if (j) buttress(g, f, (j * f.l) / n, 0, 8.7, 0.45, 0.77);
    }
  }
  const p = P(27, -2),
    rTower = squareTower(g, p, 8.5, 23.9, -0.22, '#c8ae86');
  for (const f of faces(rTower)) {
    coping(g, f, 13.2);
    coping(g, f, 21.5);
    lancet(g, f, f.l * 0.5, 15.4, 3.3, 5.2, 2, { glass: '#676f69', n: 8 });
  }
  for (const q of rTower) pinnacle(g, q, 22.9, 8.5, 0.87, { color: light });
  churchTop(g, rTower);
  spire(g, p, 23.6, 29.1, 3.98);
}
function bodleian(g, b) {
  const r = b[1];
  gothicRange(g, r, 13.6, 'library');
  for (const f of faces(r[0]))
    if (f.l > 17) {
      merlons(g, f, 13.55, Math.floor(f.l / 2.8), 0.52, 0.3);
    }
  // Lay the four roof ridges inside the four OSM wings, around the open court.
  const court = r[1];
  for (const f of faces(court))
    if (f.l > 18) {
      const a = f.plan(0, 0),
        b = f.plan(f.l, 0);
      const q = centre(court),
        p = centre([a, b]);
      const n = [p[0] - q[0], p[1] - q[1]],
        l = Math.hypot(...n);
      const dx = n[0] / l,
        dz = n[1] / l;
      const pad = 1.6,
        far = 8.6,
        mid = 4.3;
      const point = (v, h, d) => [a[0] + (b[0] - a[0]) * v + dx * d, h, a[1] + (b[1] - a[1]) * v + dz * d];
      g.quad(
        'roof',
        blue,
        point(0, 13.65, pad),
        point(1, 13.65, pad),
        point(1, 16.3, mid),
        point(0, 16.3, mid),
      );
      g.quad(
        'roof',
        blue,
        point(0, 16.3, mid),
        point(1, 16.3, mid),
        point(1, 13.65, far),
        point(0, 13.65, far),
      );
    }
  const p = [-525.8, -244.4],
    rr = squareTower(g, p, 8.6, 22, 0.233, limestone);
  for (const f of faces(rr)) {
    for (let j = 0; j < 4; j++) {
      const y = 5.2 + j * 4.15;
      coping(g, f, y + 0.15);
      lancet(g, f, f.l / 2, y + 0.4, 2.5, 2.8, 2, { n: 6 });
      for (const a of [0.16, 0.84])
        g.frustum('fine', light, f.plan(f.l * a, 0.37), y + 0.35, y + 3.7, 0.23, 0.21, 8);
    }
    merlons(g, f, 21.98, 4, 0.62, 0.36);
  }
  for (const p of rr) pinnacle(g, p, 21.93, 2.1, 0.39);
}
function cameraEnclosure(g, p) {
  const rad = 20.1,
    ring = Array.from({ length: 72 }, (_, i) => {
      let a = (i * Math.PI) / 36;
      return [p[0] + rad * Math.cos(a), p[1] + rad * Math.sin(a)];
    });
  g.cap('grass', '#9aa574', ring, 0.03);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length];
    if (a[1] < p[1] - 17.6 && Math.abs(a[0] - p[0] + 4.3) < 3.4) continue;
    for (const y of [0.49, 1.04]) g.bar('ink', '#54594b', atY(a, y), atY(b, y), 0.054, 4);
    const m = centre([a, b]);
    for (const n of [a, m]) g.frustum('ink', '#515849', n, 0.04, 1.27, 0.052, 0.028, 5);
    if (i % 6 === 0) g.frustum('fine', light, a, 0.02, 1.36, 0.25, 0.22, 4, 0.28);
  }
}
function mercury(g, p) {
  const [x, z] = p;
  g.frustum('fine', '#cabba4', p, 0.1, 0.4, 6.15, 6.2, 52);
  g.frustum('water', '#769d92', p, 0.405, 0.425, 5.78, 5.78, 52);
  g.frustum('stone', '#ada998', p, 0.43, 1.43, 0.94, 0.56, 12);
  g.frustum('fine', '#cbc2a7', p, 1.43, 1.67, 0.73, 0.76, 12);
  const lead = '#7b8177',
    shadow = '#677169',
    pt = (a, b, c) => [x + a, 1.67 + b, z + c];
  for (const [a, b, r] of [
    [[0, 0, 0], [0.05, 0.17, 0], 0.076],
    [[0.05, 0.17, 0], [0.15, 0.49, 0.035], 0.073],
    [[0.15, 0.49, 0.035], [0.11, 0.81, -0.015], 0.103],
    [[0.11, 0.78, -0.015], [-0.13, 0.54, -0.13], 0.1],
    [[-0.13, 0.54, -0.13], [-0.31, 0.69, -0.24], 0.066],
    [[-0.31, 0.69, -0.24], [-0.41, 0.72, -0.23], 0.056],
    [[0.1, 0.79, -0.02], [0.15, 1.03, -0.02], 0.13],
    [[0.15, 1.03, -0.02], [0.18, 1.19, -0.005], 0.15],
    [[0.18, 1.19, 0], [0.19, 1.31, 0.02], 0.067],
    [[0.26, 1.18, 0], [0.43, 1.38, 0.01], 0.059],
    [[0.43, 1.38, 0.01], [0.54, 1.61, 0.015], 0.043],
    [[0.54, 1.61, 0.015], [0.57, 1.73, 0.027], 0.022],
    [[0.025, 1.18, -0.02], [-0.16, 1.02, -0.04], 0.06],
    [[-0.16, 1.02, -0.04], [-0.37, 1.01, 0.055], 0.041],
  ])
    g.bar('trim', lead, pt(...a), pt(...b), r, 8);
  g.frustum('trim', lead, [x + 0.19, z + 0.02], 2.93, 3.13, 0.101, 0.085, 10);
  g.frustum('trim', shadow, [x + 0.185, z + 0.012], 3.1, 3.18, 0.112, 0.045, 9);
  for (const s of [-1, 1])
    g.tri(
      'trim',
      lead,
      pt(0.18 + s * 0.08, 1.43, 0),
      pt(0.18 + s * 0.18, 1.61, -0.05),
      pt(0.18 + s * 0.087, 1.5, -0.05),
    );
  g.bar('trim', shadow, pt(-0.4, 0.8, 0.06), pt(-0.33, 1.29, 0.05), 0.016, 6);
  // Slender falling jets leave the pedestal. The concentric ripples advance
  // independently in place-life.js and the limestone rim stays dry above them.
  for (let k = 0; k < 7; k++) {
    const a = 0.42 + (k * Math.PI * 2) / 7;
    let last;
    for (let j = 0; j <= 12; j++) {
      const t = j / 12,
        r = 0.45 + 1.2 * t;
      const q = [x + Math.cos(a) * r, 1.05 + 0.42 * t - 1.02 * t * t, z + Math.sin(a) * r];
      if (last) g.bar('water', '#a7c1b6', last, q, 0.014, 4);
      last = q;
    }
  }
}
const timberNodes = /oak|door leaves/i,
  metalNodes = /ironwork|clock enamel|bell louvres/i,
  darkNodes = /glazing|glass/i;
export async function detailed(filename, packed, point, yaw, parent) {
  const bytes = gunzipSync(packed);
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const model = gltf.scene;
  model.position.set(point[0], 0.04, point[1]);
  model.rotation.y = yaw;
  model.name = filename;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const tom = filename === 'Tom Tower',
      name = o.name.replace(/_/g, ' ');
    let tint = 0xffffff;
    if (tom) {
      tint = timberNodes.test(name)
        ? '#7e6048'
        : metalNodes.test(name)
          ? '#585a54'
          : darkNodes.test(name)
            ? '#789399'
            : /brass/.test(name)
              ? '#cdac63'
              : /lead spires|cupola and crown/.test(name)
                ? '#778c97'
                : /pavement/.test(name)
                  ? '#aca594'
                  : /opening and recessed|sidewalls and soffit|clear rebates|gate reveals|transition and drum/i.test(
                        name,
                      )
                    ? '#b5a48c'
                    : /statues|carved niche figure/i.test(name)
                      ? '#cbc0a7'
                      : /mouldings|quatrefoil|layered niche|blind tracery|plinth and cap|sill|pendant|pinnacles|lantern crown/i.test(
                            name,
                          )
                        ? '#e0d0b0'
                        : '#d1bda0';
    }
    const hasVertex = !!o.geometry.getAttribute('color');
    const oldMaterial = o.material;
    const roof = /dome|cupola|lead spires|roof slate|gabled dormers|steep slate/i.test(name);
    const m = surface(filename + ' / ' + name, {
      vertex: hasVertex,
      base: tint,
      stone: !(roof || darkNodes.test(name) || metalNodes.test(name) || timberNodes.test(name)),
      roof,
      relief: o.geometry.hasAttribute('_pocket_ao'),
    });
    if (o.geometry.hasAttribute('uv') && oldMaterial.map) m.map = oldMaterial.map;
    o.material = m;
  });
  parent.add(model);
  return model;
}
export async function buildLandmarks(scene, data) {
  const groups = { radcliffe: new T.Group(), christ: new T.Group() };
  for (const [id, group] of Object.entries(groups)) {
    group.userData.pocket = id;
    group.name = id;
    scene.add(group);
  }
  const rad = batch(),
    ch = batch();
  for (const b of data.buildings.filter((b) => b[3] === 'radcliffe')) {
    if (b[0] === 'w60903337') universityChurch(rad, b);
    if (b[0] === 'r62123') bodleian(rad, b);
    if (b[0] === 'w301650408') squareScreen(rad, b[1][0]);
  }
  cameraEnclosure(rad, quad.cameraBase);
  squareFloor(rad, quad.cameraBase);
  for (const b of data.buildings.filter((b) => b[3] === 'christ')) {
    if (b[0] === 'w24077527') continue;
    const cathedral = b[0] === 'w931780662',
      hall = b[0] === 'w146575301';
    gothicRange(
      ch,
      b[1],
      cathedral ? 13.4 : hall ? 15.5 : Math.min(b[2], 12.4),
      cathedral || hall ? 'hall' : 'college',
    );
    if (cathedral) {
      const p = [-570.6, 193.2],
        t = squareTower(ch, p, 8.1, 19.1, -0.08, limestone);
      for (const f of faces(t)) lancet(ch, f, f.l / 2, 14.1, 2.8, 3.6, 2, { n: 6 });
      spire(ch, p, 19.1, 15, 3.8);
    }
  }
  for (const [id, r, h] of quad.wings) {
    gothicRange(ch, r, h, 'quad');
    for (const tri of district.quadRoofs[id])
      ch.tri('roof', blue, ...tri.map(([x, z, lift]) => [x, h + lift, z]));
  }
  const p = data.anchors.mercury;
  for (const r of data.green) {
    const q = centre(r[0]);
    if (Math.abs(q[0] - p[0]) < 41 && Math.abs(q[1] - p[1]) < 41)
      ch.cap('grass', '#94a775', r[0], 0.035, r.slice(1));
  }
  for (const [kind, ring, holes] of quad.surfaces)
    if (ring.length >= 3) ch.cap('flagstone', kind === 'paving' ? '#c5b99f' : '#c8b797', ring, 0.053, holes);
  strip(ch, 'paving', '#c6bba2', quad.loop, 2.12, 0.072);
  mercury(ch, p);
  pondMasonry(ch, p);
  tomTerrace(ch);
  rad.finish(groups.radcliffe, 'Radcliffe Square');
  ch.finish(groups.christ, 'Tom Quad');
  await Promise.all([
    detailed('Radcliffe Camera', cameraAsset, quad.cameraBase, 0.29, groups.radcliffe),
    detailed('Tom Tower', tomAsset, quad.tomBase, -1.49265, groups.christ),
  ]);
  const buf = gunzipSync(terraceAsset),
    terrace = (
      await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '')
    ).scene;
  terrace.position.set(quad.terraceOrigin[0], 4.68, quad.terraceOrigin[1]);
  terrace.traverse((o) => {
    if (o.isMesh) {
      o.visible = /Tom.Quad/i.test(o.name) && !/24077527/.test(o.name);
      o.castShadow = o.receiveShadow = true;
    }
  });
  groups.christ.add(terrace);
  return groups;
}
