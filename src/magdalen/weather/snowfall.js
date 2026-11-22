import * as T from 'three';
import { randomSeed } from '../drawing.js';
import { surfaceKinds } from '../surfaces.js';
import { snowSettings as settings } from '../data/weather.js';
import { coatMaterial, makeDrifts } from './snow-paint.js';

function dataTexture(data, w, h, format, linear = false) {
  const t = new T.DataTexture(data, w, h, format);
  t.unpackAlignment = 1;
  t.minFilter = t.magFilter = linear ? T.LinearFilter : T.NearestFilter;
  t.needsUpdate = true;
  return t;
}

function fallingFlakes(scene, s, uniforms, smallScreen) {
  const random = randomSeed(250126),
    positions = [],
    grains = [];
  const count = settings.particles[smallScreen ? 'mobile' : 'desktop'];
  const sites = [
    [-15, 19, 75],
    [4, -29, 46],
    [64, -42, 49],
  ];
  while (grains.length / 3 < count) {
    let x = s.x0 + random() * s.width * s.step,
      z = s.z0 + random() * s.height * s.step;
    // Extra detail around the three observation areas stays in the world when the camera moves.
    if (random() < 0.36) {
      const [cx, cz, r] = sites[Math.floor(random() * sites.length)];
      x = cx + (random() - 0.5) * 2 * r;
      z = cz + (random() - 0.5) * 2 * r;
    }
    const i = s.cellAt(x, z);
    if (i < 0 || !s.kinds[i]) continue;
    positions.push(x, s.heights[i], z);
    grains.push(random(), random(), random());
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('grain', new T.Float32BufferAttribute(grains, 3));
  const m = new T.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute vec3 grain;
      uniform float airTime, airPower, drawingHeight;
      uniform vec2 breeze;
      uniform vec4 snowBounds; uniform sampler2D snowSkyline;
      varying float alpha; varying float tilt;
      void main(){
        float band=16.+19.*grain.y;
        float age=fract(grain.x+airTime*(1.05+grain.z*.86)/band);
        float t=age*band/(1.05+grain.z*.86);
        vec3 p=position;
        p.y+=band*(1.-age);
        p.xz+=breeze*t+vec2(sin(t*.88+grain.x*41.)*.52, cos(t*.64+grain.z*36.)*.42);
        float top=texture2D(snowSkyline,(p.xz-snowBounds.xy)*snowBounds.zw).r*64.-10.;
        float alive=smoothstep(.03,.58,p.y-top)*step(-7.,top)*smoothstep(0.,.075,age);
        vec4 eye=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*eye;
        float diameter=(.065+.073*grain.y)*projectionMatrix[1][1]*drawingHeight*.5/max(gl_Position.w,.1);
        gl_PointSize=clamp(diameter,1.,6.7);
        tilt=t*.61+grain.y*9.;
        alpha=alive*(.38+.53*grain.z)*smoothstep(grain.y*.73,grain.y*.73+.26,airPower)
             *(.51+.49*min(1.,diameter));
      }`,
    fragmentShader: `
      varying float alpha; varying float tilt;
      void main(){
        vec2 p=gl_PointCoord-.5;
        p=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*p;
        float ink=1.-smoothstep(.22,.51,length(p*vec2(1.,1.22)));
        if(ink*alpha<.018) discard;
        gl_FragColor=vec4(.94,.955,.94,ink*alpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Points(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = false;
  mesh.name = 'Snow falling across the college';
  scene.add(mesh);
  return mesh;
}

export function makeSnowfall(scene, map, frame, s, smallScreen) {
  const size = s.width * s.height,
    heights = new Uint8Array(size);
  const load = new Float32Array(size),
    liquid = new Float32Array(size);
  const rate = new Float32Array(size),
    exposure = new Float32Array(size),
    pixels = new Uint8Array(size * 2);
  const counted = new Uint32Array(surfaceKinds.length),
    sunward = new Float32Array(size);
  const classRates = surfaceKinds.map((k) => settings.retention[k]);
  let receivers = 0;
  for (let i = 0; i < size; i++) {
    heights[i] = Math.min(255, Math.max(0, Math.round(((s.heights[i] + 10) * 255) / 64)));
    const kind = s.kinds[i];
    if (!classRates[kind]) continue;
    const x = s.x0 + ((i % s.width) + 0.5) * s.step,
      z = s.z0 + (Math.floor(i / s.width) + 0.5) * s.step;
    const slope = s.slopes[i] / 255,
      broad = 0.5 + 0.23 * Math.sin(x * 0.25 + z * 0.12) + 0.17 * Math.cos(z * 0.19 - x * 0.09);
    // Open, level surfaces catch most. A low lee bank catches more than an exposed crest.
    const west = s.heights[i - 2] ?? s.heights[i],
      north = s.heights[i - s.width] ?? s.heights[i];
    const lee = Math.min(1, Math.max(0, (west - s.heights[i]) * 0.45));
    rate[i] = classRates[kind] * Math.pow(slope, 1.45) * (0.74 + 0.48 * broad + 0.24 * lee);
    exposure[i] = 0.56 + 0.33 * broad + 0.23 * (1 - slope) - 0.19 * lee;
    sunward[i] = Math.max(-1, Math.min(1, (s.heights[i] - north) / s.step));
    counted[kind]++;
    receivers++;
  }
  const relief = dataTexture(pixels, s.width, s.height, T.RGFormat, true);
  const uniforms = {
    snowBounds: { value: new T.Vector4(s.x0, s.z0, 1 / (s.width * s.step), 1 / (s.height * s.step)) },
    snowSkyline: { value: dataTexture(heights, s.width, s.height, T.RedFormat) },
    snowRelief: { value: relief },
    snowShow: { value: 1 },
    snowRidge: { value: 0 },
    airTime: { value: 0 },
    airPower: { value: 0 },
    drawingHeight: { value: 900 },
    breeze: { value: new T.Vector2(...settings.wind) },
  };
  for (const [mat, kind] of s.materials) coatMaterial(mat, kind, uniforms);
  const flakes = fallingFlakes(scene, s, uniforms, smallScreen);
  const drifts = makeDrifts(scene, map, frame, s, uniforms);
  let clock = 0,
    held = 0,
    forcing = 0,
    ridge = 0,
    active = false,
    total = 0,
    residue = 0;
  const averages = new Float64Array(surfaceKinds.length);
  function integrate(dt, state, sunDir) {
    let sum = 0,
      wetSum = 0;
    averages.fill(0);
    const warm =
      0.9 * state.weights[0] + 1.35 * state.weights[1] + 0.68 * state.weights[2] + 0.36 * state.weights[3];
    const add = (forcing * dt) / settings.settleSeconds;
    const thaw = (((1 - forcing * 0.96) * dt) / settings.meltSeconds) * (0.68 + warm + state.wet * 0.83);
    for (let i = 0; i < size; i++) {
      if (!rate[i]) continue;
      const before = load[i],
        fall = add * rate[i];
      const melt = Math.min(before + fall, thaw * exposure[i] * (1 + 0.17 * sunDir.z * sunward[i]));
      const capacity = Math.min(1, rate[i] * 1.06);
      const next = Math.max(0, Math.min(capacity, before + fall - melt));
      load[i] = next;
      const runoff = Math.max(0, liquid[i] - dt * 0.009);
      liquid[i] = Math.min(1, runoff + melt * 2.6);
      pixels[i * 2] = Math.round(next * 255);
      pixels[i * 2 + 1] = Math.round(liquid[i] * 255);
      sum += next;
      wetSum += liquid[i];
      averages[s.kinds[i]] += next;
    }
    ridge = Math.max(0, Math.min(1, ridge + add * 1.14 - thaw * 0.69));
    total = sum / Math.max(receivers, 1);
    residue = wetSum / Math.max(receivers, 1);
    active = total > 0 || residue > 0 || ridge > 0;
    relief.needsUpdate = true;
  }
  return {
    update(dt, state, sunDir, show, drawingHeight) {
      if (!state.event) {
        clock += dt;
        const goal = state.snowOn ? 1 : 0;
        forcing = T.MathUtils.lerp(
          forcing,
          goal,
          1 - Math.exp(-dt / (goal ? settings.fallRamp : settings.airTail)),
        );
        if (!goal && forcing < 0.001) forcing = 0;
        if (forcing || active) {
          held += dt;
          if (held >= settings.updateInterval) {
            integrate(held, state, sunDir);
            held = 0;
          }
        } else held = 0;
      }
      uniforms.airTime.value = clock;
      uniforms.airPower.value = forcing * show;
      uniforms.snowShow.value = active ? show : 0;
      uniforms.snowRidge.value = ridge;
      uniforms.drawingHeight.value = drawingHeight;
      flakes.visible = forcing * show > 0.015;
      drifts.visible = ridge * show > 0.01;
      return total;
    },
    read() {
      return {
        clock,
        forcing,
        mean: total,
        meltwater: residue,
        kerb: ridge,
        grid: [s.width, s.height],
        cellMetres: s.step,
        flakesVisible: flakes.visible,
        flakePool: flakes.geometry.attributes.position.count,
        bySurface: Object.fromEntries(
          surfaceKinds.map((k, i) => [k, counted[i] ? averages[i] / counted[i] : 0]),
        ),
      };
    },
    probe(x, z) {
      const i = s.cellAt(x, z);
      return { ...s.sample(x, z), load: i < 0 ? 0 : load[i], meltwater: i < 0 ? 0 : liquid[i] };
    },
  };
}
