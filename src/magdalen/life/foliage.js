import { TAU, seeded, clamp, unit, MeshDraft, canvasTexture } from './geometry.js';

// A spray is a small volume at a fixed fork of a real, three-dimensional tree.
// Its porous painted skin turns towards the eye. The shadow pass turns that same
// skin towards the sun, and its convex normals keep the lighting in world space.
export class FoliageDraft extends MeshDraft {
  constructor() {
    super(true);
    this.offset = [];
  }
  geometry(T) {
    const g = super.geometry(T);
    g.setAttribute('leafOffset', new T.Float32BufferAttribute(this.offset, 3));
    g.boundingSphere.radius += 10;
    return g;
  }
}

const variantCount = 6;
export function paintedLeaves(T) {
  const cell = 220;
  return canvasTexture(T, cell * variantCount, cell, (ctx) => {
    for (let variant = 0; variant < variantCount; variant++) {
      const random = seeded(56247 + 7919 * variant),
        angles = Array.from({ length: 8 }, () => random() * TAU);
      const willow = variant === 4,
        evergreen = variant === 5;
      const edge = (angle) =>
        0.78 +
        0.1 * Math.sin(3 * angle + angles[0]) +
        0.071 * Math.sin(5 * angle + angles[1]) +
        0.047 * Math.sin(9 * angle + angles[2]) +
        0.026 * Math.sin(17 * angle + angles[3]) +
        0.015 * Math.sin(28 * angle + angles[4]);
      const center = cell / 2,
        span = cell * 0.453;
      ctx.save();
      ctx.translate(variant * cell + center, center);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const irregular = (cx, cy, r, theta, small = false) => {
        ctx.beginPath();
        const steps = small ? 20 : 120;
        for (let j = 0; j <= steps; j++) {
          const a = (j / steps) * TAU,
            noise = small ? 1 + 0.16 * Math.sin(3 * a + theta) + 0.07 * Math.cos(7 * a - theta) : edge(a);
          const x = cx + Math.cos(a) * r * noise,
            y = cy + Math.sin(a) * r * noise;
          if (j) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      };
      irregular(0, 0, span, angles[4]);
      ctx.fillStyle = '#d8d9c9';
      ctx.fill();
      // Multiple transparent wash edges inside a clump; the main light is
      // applied by Three, so the stamp itself has no fixed sun direction.
      ctx.save();
      ctx.clip();
      for (let k = 0; k < 75; k++) {
        const a = random() * TAU,
          d = span * Math.sqrt(random()) * 0.85,
          x = Math.cos(a) * d,
          y = Math.sin(a) * d;
        const radius = span * (0.11 + random() * 0.26),
          light = 167 + Math.floor(random() * 86);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.25);
        grad.addColorStop(0, `rgba(${light},${light + 1},${light - 9},.68)`);
        grad.addColorStop(0.74, `rgba(${light},${light + 1},${light - 9},.50)`);
        grad.addColorStop(1, `rgba(${light},${light + 1},${light - 9},0)`);
        irregular(x, y, radius, a, true);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();
      function blade(x, y, len, width, a, light, opacity) {
        const vx = Math.cos(a) * len,
          vy = Math.sin(a) * len,
          ox = -Math.sin(a) * width,
          oy = Math.cos(a) * width;
        ctx.fillStyle = `rgba(${light},${Math.min(255, light + 2)},${Math.max(0, light - 6)},${opacity})`;
        ctx.beginPath();
        ctx.moveTo(x - vx * 0.37, y - vy * 0.37);
        ctx.quadraticCurveTo(x + ox, y + oy, x + vx * 0.65, y + vy * 0.65);
        ctx.quadraticCurveTo(x - ox * 0.68, y - oy * 0.68, x - vx * 0.37, y - vy * 0.37);
        ctx.fill();
      }
      // Small contiguous pockets of strokes are legible at riverbank scale.
      for (let k = 0; k < 535; k++) {
        const a = random() * TAU,
          r = span * edge(a) * Math.sqrt(random()),
          x = Math.cos(a) * r,
          y = Math.sin(a) * r;
        const tilt = willow
          ? 1.2 + random() * 0.55
          : evergreen
            ? 0.85 + Math.sin(a) * 0.56
            : a * 0.3 + angles[5] + (random() - 0.5) * 1.8;
        const tone = Math.floor(133 + random() * 119),
          len = (willow ? 7.3 : 4.4) + random() * 4.3;
        for (let j = 0; j < 3; j++) {
          const s = j % 2 ? 1 : -1,
            xx = x + Math.cos(tilt) * j * 1.72,
            yy = y + Math.sin(tilt) * j * 1.72;
          blade(
            xx,
            yy,
            len * (0.62 + 0.48 * random()),
            (willow ? 0.79 : 1.35) + random() * 1.05,
            tilt + s * (0.54 + random() * 0.38),
            tone,
            0.45 + random() * 0.42,
          );
        }
      }
      for (let k = 0; k < 196; k++) {
        const a = random() * TAU,
          r = span * edge(a),
          x = Math.cos(a) * r,
          y = Math.sin(a) * r,
          tilt = willow ? 1.27 + random() * 0.5 : a + (random() - 0.5) * 1.3;
        const len = willow ? 8 + random() * 10 : 4.4 + random() * 5.8,
          light = 170 + Math.floor(random() * 77);
        const endX = x + Math.cos(tilt) * len * 0.59,
          endY = y + Math.sin(tilt) * len * 0.59;
        ctx.strokeStyle = `rgba(174,177,158,${0.35 + random() * 0.36})`;
        ctx.lineWidth = 1.17;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        for (let i = 0; i < 3; i++)
          blade(
            x + ((endX - x) * i) / 2,
            y + ((endY - y) * i) / 2,
            len * 0.7,
            1.3 + random() * 1.04,
            tilt + (i % 2 ? 0.65 : -0.59),
            light,
            0.91,
          );
      }
      // Let the branches read through a handful of irregular leaf gaps.
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 33; i++) {
        const a = random() * TAU,
          r = span * edge(a) * (0.67 + random() * 0.34),
          x = Math.cos(a) * r,
          y = Math.sin(a) * r;
        const width = 1.6 + random() * 3.3;
        irregular(x, y, width, a, true);
        ctx.fillStyle = `rgba(0,0,0,${0.53 + random() * 0.41})`;
        ctx.fill();
      }
      ctx.restore();
    }
  });
}

export function paintSpray(draft, center, radii, palette, growth, random, kind) {
  const [rx, ry, rz] = radii;
  const width = Math.sqrt(rx * rz) * 1.37,
    height = ry * 1.36;
  const variant = kind === 'willow' ? 4 : kind === 'evergreen' ? 5 : Math.floor(random() * 4);
  const n = 4,
    base = draft.position.length / 3,
    flip = random() < 0.5,
    season = { center, palette, growth };
  const tilt = (random() - 0.5) * (kind === 'willow' ? 0.23 : 0.75),
    ct = Math.cos(tilt),
    st = Math.sin(tilt);
  const ink = 0.94 + random() * 0.12;
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const u = i / n,
        v = j / n,
        x = u * 2 - 1,
        y = v * 2 - 1;
      const dome = Math.sqrt(Math.max(0.01, 1 - (x * x + y * y) * 0.83));
      const dx = x * width * ct - y * height * st,
        dy = x * width * st + y * height * ct;
      const normal = unit([(x * ct - y * st) * 0.7, (x * st + y * ct) * 0.64, 0.62 + dome * 0.5]);
      const du = flip ? 1 - u : u;
      draft.point(
        center,
        normal,
        palette[0],
        (variant + 0.008 + du * 0.984) / variantCount,
        0.008 + v * 0.984,
        season,
        ink,
      );
      draft.offset.push(dx, dy, Math.min(rx, rz) * 0.51 * dome);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const p = base + j * (n + 1) + i;
      draft.tri.push(p, p + 1, p + n + 1, p + n + 1, p + 1, p + n + 2);
    }
}

export function foliageMaterial(T, uniforms) {
  const texture = paintedLeaves(T);
  const material = new T.MeshLambertMaterial({
    vertexColors: true,
    map: texture,
    alphaTest: 0.37,
    side: T.DoubleSide,
  });
  const depth = new T.MeshDepthMaterial({
    depthPacking: T.RGBADepthPacking,
    map: texture,
    alphaTest: 0.37,
    side: T.DoubleSide,
  });
  for (const [mat, depthOnly] of [
    [material, false],
    [depth, true],
  ]) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLifeSeason = uniforms.season;
      shader.uniforms.uLifeSnow = uniforms.snow;
      const tints = depthOnly
        ? ''
        : 'attribute vec3 lifeSummer, lifeAutumn, lifeWinter; uniform float uLifeSnow;';
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\nuniform vec4 uLifeSeason; attribute vec4 lifeGrowth; attribute vec3 leafOffset; ${tints}
        vec3 leafWorld(vec3 p){return vec3(dot(viewMatrix[0].xyz,p),dot(viewMatrix[1].xyz,p),dot(viewMatrix[2].xyz,p));}`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed += leafWorld(leafOffset) * dot(lifeGrowth,uLifeSeason);',
      );
      if (!depthOnly) {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\nobjectNormal = normalize(leafWorld(normal)+vec3(0.,.34,0.));',
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <color_vertex>',
          `#include <color_vertex>\nvColor.xyz = color*uLifeSeason.x+lifeSummer*uLifeSeason.y+lifeAutumn*uLifeSeason.z+lifeWinter*uLifeSeason.w;
          vColor.xyz = mix(vColor.xyz, vec3(.80,.84,.81), uLifeSnow*smoothstep(.22,.91,leafWorld(normal).y)*.76);`,
        );
      }
    };
    mat.customProgramCacheKey = () => `oxford-foliage-watercolour-1-${depthOnly}`;
  }
  return { material, depth };
}
