import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function randomSeed(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function shapeOf(poly) {
  const path = (ring, target) => {
    ring.forEach(([x, z], i) => (i ? target.lineTo(x, -z) : target.moveTo(x, -z)));
    target.closePath();
    return target;
  };
  const shape = path(poly.outer, new T.Shape());
  shape.holes = (poly.holes || []).filter((r) => r.length > 2).map((r) => path(r, new T.Path()));
  return shape;
}
export function flat(poly, y = 0) {
  return new T.ShapeGeometry(shapeOf(poly)).rotateX(-Math.PI / 2).translate(0, y, 0);
}
export function geometry(positions, uvs = null) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  if (uvs) g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}
export function quad(arr, a, b, c, d) {
  arr.push(...a, ...b, ...d, ...b, ...c, ...d);
}
export function box(x, y, z, w, h, d, yaw = 0) {
  return new T.BoxGeometry(w, h, d).rotateY(yaw).translate(x, y, z);
}
export function post(x, y, z, bottom, top, height, sides = 8) {
  return new T.CylinderGeometry(top, bottom, height, sides).translate(x, y + height / 2, z);
}
export function beam(a, b, width, height = width) {
  const A = new T.Vector3(...a),
    B = new T.Vector3(...b);
  const d = B.clone().sub(A);
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
  return new T.BoxGeometry(width, d.length(), height)
    .applyQuaternion(q)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
export class Batches {
  constructor(scene, name) {
    this.scene = scene;
    this.name = name;
    this.groups = new Map();
  }
  add(material, g) {
    if (!this.groups.has(material)) this.groups.set(material, []);
    const a = g.index ? g.toNonIndexed() : g;
    // All authoring helpers can share material even if their UV conventions differ.
    for (const key of Object.keys(a.attributes))
      if (!['uv', 'normal', 'position'].includes(key)) a.deleteAttribute(key);
    if (!a.getAttribute('uv'))
      a.setAttribute(
        'uv',
        new T.Float32BufferAttribute(new Float32Array(a.getAttribute('position').count * 2), 2),
      );
    this.groups.get(material).push(a);
    return a;
  }
  finish(cast = true, receive = true) {
    const group = new T.Group();
    group.name = this.name;
    for (const [mat, geos] of this.groups) {
      const merged = mergeGeometries(geos, false);
      merged.computeBoundingSphere();
      const mesh = new T.Mesh(merged, mat);
      mesh.name = this.name + ' · ' + mat.name;
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      group.add(mesh);
      for (const g of geos) if (g !== merged) g.dispose();
    }
    this.scene.add(group);
    return group;
  }
}
export function ribbon(path, y1, y2) {
  const p = [],
    uv = [];
  for (let i = 1; i < path.length; i++) {
    const A = path[i - 1],
      B = path[i],
      d = Math.hypot(A[0] - B[0], A[1] - B[1]);
    quad(p, [A[0], y2, A[1]], [B[0], y2, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]]);
    uv.push(0, y2, d, y2, 0, y1, d, y2, d, y1, 0, y1);
  }
  return geometry(p, uv);
}
export function brushed(kind) {
  const size = 512,
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'),
    rng = randomSeed(1309 + kind.charCodeAt(0) * 81);
  ctx.fillStyle = '#ededdf';
  ctx.fillRect(0, 0, size, size);
  const bases = {
    grass: '#f7f6e6',
    bed: '#e0dcc6',
    slate: '#e4e3db',
    stone: '#eee9da',
    road: '#dfdfd4',
    paving: '#eee9df',
    earth: '#e8dbc1',
    gravel: '#e8e3d5',
  };
  ctx.fillStyle = bases[kind] || '#eeeade';
  ctx.fillRect(0, 0, size, size);
  const im = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = (rng() - 0.5) * (kind === 'road' ? 21 : 13);
    im.data[i] += n;
    im.data[i + 1] += n;
    im.data[i + 2] += n;
  }
  ctx.putImageData(im, 0, 0);
  const stroke = (x, y, dx, dy, ink, width) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  };
  if (kind === 'grass' || kind === 'bed') {
    for (let i = 0; i < 3600; i++) {
      const x = rng() * size,
        y = rng() * size,
        L = 1 + rng() * 4;
      stroke(
        x,
        y,
        L * 0.38,
        -L,
        rng() < 0.45 ? 'rgba(79,91,58,.15)' : 'rgba(255,254,211,.45)',
        0.7 + rng() * 0.6,
      );
      if (i % 8 === 0) stroke(x, y, -L * 0.5, -L * 0.6, 'rgba(88,99,65,.26)', 0.7);
    }
  } else if (kind === 'paving' || kind === 'stone') {
    const row = kind === 'paving' ? 32 : 28;
    for (let y = -row, i = 0; y < size + row; y += row, i++) {
      let x = -120 + (i % 2) * 32;
      while (x < size) {
        const w = [43, 63, 78, 96][Math.floor(rng() * 4)];
        ctx.fillStyle =
          'rgba(' + (rng() < 0.5 ? '123,105,75,' : '255,252,225,') + (rng() * 0.12 + 0.02) + ')';
        ctx.fillRect(x + 1, y + 1, w - 2, row - 2);
        stroke(x, y, w, 0, 'rgba(82,83,70,.26)', 1.5);
        stroke(x, y, 0, row, 'rgba(86,85,71,.22)', 1.3);
        stroke(x + 1, y + 2, w - 2, 0, 'rgba(255,254,228,.55)', 1.5);
        x += w;
      }
    }
    for (let i = 0; i < 650; i++)
      stroke(rng() * size, rng() * size, rng() * 7 + 1, -1, 'rgba(110,96,73,.12)', 0.8);
  } else if (kind === 'earth') {
    for (let i = 0; i < 95; i++) {
      const y = rng() * size;
      ctx.strokeStyle = 'rgba(113,88,59,.13)';
      ctx.lineWidth = 0.7 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.032 + y) * 2 + rng() * 2);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 2600; i++)
      stroke(rng() * size, rng() * size, 1 + rng() * 4, -rng() * 1.5, 'rgba(90,85,73,.15)', 1);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
const paperNoise = `
float paperHash(vec2 p){return fract(sin(dot(mod(p,103.7),vec2(127.1,311.7)))*3458.279);}
float paperValue(vec2 p){vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(paperHash(i),paperHash(i+vec2(1,0)),f.x),mix(paperHash(i+vec2(0,1)),paperHash(i+1.),f.x),f.y);}
`;
export { paperNoise };
export function washMaterial(name, color, tex, scale, mode = 'ground') {
  const mat = new T.MeshStandardMaterial({
    color,
    map: tex,
    roughness: 0.91,
    metalness: 0,
    side: T.DoubleSide,
  });
  mat.name = name;
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 washPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nwashPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 washPos;\n' + paperNoise)
      .replace(
        '#include <map_fragment>',
        `
        vec2 p = washPos.xz;
        vec2 ink = ${mode === 'wall' ? 'vec2(washPos.x*.73+washPos.z*.68+washPos.x*.09, washPos.y)' : 'p'};
        vec4 tile = texture2D(map,ink/${scale.toFixed(3)});
        float wide=paperValue(p * .13), blot=paperValue(p*.51+wide*.8);
        diffuseColor.rgb*=tile.rgb*(.86+.145*wide+.085*blot);
      `,
      );
  };
  mat.customProgramCacheKey = () => name;
  return mat;
}
