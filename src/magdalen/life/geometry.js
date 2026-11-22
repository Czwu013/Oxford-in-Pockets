// All generated meshes use metres. x points east and z points south.
export function seeded(seed) {
  let state = seed >>> 0 || 5873;
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export const TAU = Math.PI * 2;
export const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
export const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
export const scale = (p, n) => [p[0] * n, p[1] * n, p[2] * n];
export const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function unit(v) {
  return scale(v, 1 / (Math.hypot(...v) || 1));
}
export function linear(T, hex) {
  const c = new T.Color(hex);
  return [c.r, c.g, c.b];
}

export class MeshDraft {
  constructor(seasonal = false) {
    this.seasonal = seasonal;
    this.position = [];
    this.normal = [];
    this.color = [];
    this.uv = [];
    this.tri = [];
    this.center = [];
    this.growth = [];
    this.summer = [];
    this.autumn = [];
    this.winter = [];
  }
  point(p, n, pigment, u = 0, v = 0, season = null, shade = 1) {
    const index = this.position.length / 3;
    this.position.push(...p);
    this.normal.push(...n);
    this.uv.push(u, v);
    const color = (dest, rgb) => dest.push(...rgb.map((c) => Math.round(255 * clamp(c * shade))));
    color(this.color, pigment);
    if (season) {
      this.center.push(...season.center);
      this.growth.push(...season.growth);
      color(this.summer, season.palette[1]);
      color(this.autumn, season.palette[2]);
      color(this.winter, season.palette[3]);
    }
    return index;
  }
  geometry(T) {
    const g = new T.BufferGeometry();
    g.setIndex(this.tri);
    g.setAttribute('position', new T.Float32BufferAttribute(this.position, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.normal, 3));
    g.setAttribute('color', new T.Uint8BufferAttribute(this.color, 3, true));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    if (this.seasonal) {
      g.setAttribute('lifeCenter', new T.Float32BufferAttribute(this.center, 3));
      g.setAttribute('lifeGrowth', new T.Float32BufferAttribute(this.growth, 4));
      for (const [name, data] of [
        ['lifeSummer', this.summer],
        ['lifeAutumn', this.autumn],
        ['lifeWinter', this.winter],
      ]) {
        g.setAttribute(name, new T.Uint8BufferAttribute(data, 3, true));
      }
    }
    g.computeBoundingSphere();
    return g;
  }
}

export function tube(draft, start, end, r0, r1, pigment, sides = 5, phase = 0) {
  const axis = unit(sub(end, start));
  const u = unit(cross(axis, Math.abs(axis[1]) > 0.94 ? [0, 0, 1] : [0, 1, 0]));
  const v = cross(axis, u);
  const base = draft.position.length / 3;
  for (let k = 0; k <= 1; k++) {
    for (let i = 0; i < sides; i++) {
      const a = phase + (TAU * i) / sides;
      const n = add(scale(u, Math.cos(a)), scale(v, Math.sin(a)));
      const p = add(k ? end : start, scale(n, k ? r1 : r0));
      draft.point(p, n, pigment, i / sides, k, null, 0.96 + 0.07 * Math.sin(i * 7.2 + phase));
    }
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    draft.tri.push(base + i, base + j, base + i + sides, base + i + sides, base + j, base + j + sides);
  }
}

// The same vertex deformation is applied to the colour and the directional
// shadow passes. A deciduous spray collapses onto its own twig in winter.
export function growthMaterial(T, uniforms, options = {}) {
  const material = new T.MeshLambertMaterial({ vertexColors: true, ...options });
  const depth = new T.MeshDepthMaterial({
    depthPacking: T.RGBADepthPacking,
    side: material.side,
    map: material.map,
    alphaTest: material.alphaTest,
  });
  const wire = (mat, depthOnly) => {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLifeSeason = uniforms.season;
      shader.uniforms.uLifeSnow = uniforms.snow;
      const extras = depthOnly
        ? ''
        : `attribute vec3 lifeSummer, lifeAutumn, lifeWinter;\nuniform float uLifeSnow;`;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\nuniform vec4 uLifeSeason;\nattribute vec3 lifeCenter;\nattribute vec4 lifeGrowth;\n${extras}`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed = lifeCenter + (transformed-lifeCenter) * dot(lifeGrowth,uLifeSeason);',
      );
      if (!depthOnly) {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <color_vertex>',
          `#include <color_vertex>\nvColor.xyz = color * uLifeSeason.x + lifeSummer * uLifeSeason.y + lifeAutumn * uLifeSeason.z + lifeWinter * uLifeSeason.w;\nvColor.xyz = mix(vColor.xyz, vec3(0.78,0.84,0.83), uLifeSnow * smoothstep(0.22,0.93,normal.y) * 0.8);`,
        );
      }
    };
    mat.customProgramCacheKey = () => 'oxford-bud-growth-v2-' + depthOnly;
  };
  wire(material, false);
  wire(depth, true);
  return { material, depth };
}

export function canvasTexture(T, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
