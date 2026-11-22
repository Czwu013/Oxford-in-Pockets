import * as T from 'three';
import { marketPoint } from './market.js';
import quad from './data/quad.json';
import { visitorPaths, civicPaths } from './place-life.js';
import { moundHeight } from './castle.js';
import { quadHeight } from './college-craft.js';

const colour = new T.Color(),
  v = new T.Vector3(),
  dummy = new T.Object3D();
const coats = ['#786b64', '#547571', '#9d6852', '#59657e', '#8b7f62', '#596b59'];
function pathData(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(
      lengths.at(-1) + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]),
    );
  return { points, lengths, total: lengths.at(-1) };
}
function onPath(path, d) {
  let t = (d / path.total) % 2;
  if (t < 0) t += 2;
  const reverse = t > 1,
    ds = (reverse ? 2 - t : t) * path.total;
  let i = 1;
  while (i < path.lengths.length - 1 && path.lengths[i] < ds) i++;
  const a = path.points[i - 1],
    b = path.points[i],
    f = (ds - path.lengths[i - 1]) / (path.lengths[i] - path.lengths[i - 1] || 1);
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    Math.atan2(b[0] - a[0], b[1] - a[1]) + (reverse ? Math.PI : 0),
  ];
}
function inst(geo, total, root) {
  const obj = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ color: 0xffffff }), total);
  obj.instanceMatrix.setUsage(T.DynamicDrawUsage);
  obj.frustumCulled = false;
  obj.castShadow = true;
  root.add(obj);
  return obj;
}
function set(obj, i, x, y, z, yaw, sx, sy, sz, c, pitch = 0) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, yaw, 0);
  dummy.rotateX(pitch);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  obj.setMatrixAt(i, dummy.matrix);
  if (c) obj.setColorAt(i, colour.set(c));
}
export function streetLife(scene, market, visibleAt) {
  const root = new T.Group();
  root.name = 'Pocket street life';
  scene.add(root);
  const tracks = [
    pathData([
      [-493, -93],
      [-491, -101],
      [-489, -114],
      [-492, -131],
      [-498, -157],
      [-504, -185],
    ]),
    pathData([
      [-541, -142],
      [-548, -161],
      [-550, -181],
      [-545, -194],
      [-527, -205],
      [-517, -211],
    ]),
    pathData(quad.loop),
    ...market.lanes.map((l) =>
      pathData(
        Array.from({ length: 13 }, (_, j) => {
          const d = l.min + 4 + ((l.max - l.min - 9) * j) / 12;
          return marketPoint(l.at(d), d);
        }),
      ),
    ),
  ];
  tracks.push(...visitorPaths.map(pathData));
  const people = Array.from({ length: 30 }, (_, i) => ({
    k: i % tracks.length,
    d: 4 + ((i * 33.13) % tracks[i % tracks.length].total),
    speed: 0.64 + (i % 4) * 0.19,
  }));
  for (const points of civicPaths) {
    const path = pathData(points),
      k = tracks.length;
    tracks.push(path);
    for (const [offset, speed] of [
      [0.16, 0.83],
      [0.67, 0.71],
    ])
      people.push({ k, d: path.total * offset, speed });
  }
  const cube = new T.BoxGeometry(1, 1, 1),
    faceGeo = new T.SphereGeometry(0.5, 8, 6),
    head = inst(faceGeo, people.length, root),
    hair = inst(faceGeo, people.length, root),
    coat = inst(new T.CapsuleGeometry(0.35, 0.35, 2, 7), people.length, root),
    legs = inst(cube, people.length * 2, root),
    sleeves = inst(new T.CapsuleGeometry(0.21, 0.58, 2, 6), people.length * 2, root);
  let time = 0;
  const merchantItems = new T.Group();
  market.group.add(merchantItems);
  const stems = inst(new T.IcosahedronGeometry(1, 0), 48, merchantItems);
  const stalk = inst(new T.CylinderGeometry(0.045, 0.045, 1, 4), 48, merchantItems);
  const barrow = new T.Group();
  merchantItems.add(barrow);
  const timber = new T.MeshLambertMaterial({ color: '#8b7051' });
  const bed = new T.Mesh(new T.BoxGeometry(1.13, 0.33, 1.5), timber);
  bed.position.y = 0.6;
  barrow.add(bed);
  for (const x of [-0.54, 0.54]) {
    const wheel = new T.Mesh(
      new T.CylinderGeometry(0.28, 0.28, 0.1, 10),
      new T.MeshLambertMaterial({ color: '#4f5650' }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.3, 0);
    barrow.add(wheel);
  }
  const lampBulbs = inst(new T.SphereGeometry(0.12, 7, 5), 9, merchantItems);
  lampBulbs.material = new T.MeshBasicMaterial({ color: '#ffe7a1' });
  const hidden = new T.Matrix4().makeScale(0, 0, 0);
  return {
    update(dt, state, sim) {
      time += dt;
      for (let i = 0; i < people.length; i++) {
        const p = people[i],
          path = tracks[p.k];
        const moving = (time * 0.17 + i) % 8 > 1.2,
          step = moving ? Math.sin((time * p.speed + i) * 6.3) * 0.33 : 0;
        if (moving) p.d = (p.d + dt * p.speed) % (path.total * 2);
        const [x, z, yaw] = onPath(path, p.d),
          base = Math.max(0.1, moundHeight(x, z) + 0.08, quadHeight(x, z) + 0.04),
          scale = 0.94 + (i % 3) * 0.055;
        const y = base + Math.abs(step) * 0.045;
        if (!visibleAt(x, z)) {
          for (const obj of [head, hair, coat]) obj.setMatrixAt(i, hidden);
          for (const obj of [legs, sleeves]) {
            obj.setMatrixAt(i * 2, hidden);
            obj.setMatrixAt(i * 2 + 1, hidden);
          }
          continue;
        }
        set(
          head,
          i,
          x,
          y + 1.54 * scale,
          z,
          yaw,
          0.32 * scale,
          0.37 * scale,
          0.31 * scale,
          ['#c9a384', '#b58c70', '#d4b295'][i % 3],
        );
        set(
          hair,
          i,
          x - 0.022 * Math.sin(yaw),
          y + 1.63 * scale,
          z - 0.022 * Math.cos(yaw),
          yaw,
          0.33 * scale,
          0.235 * scale,
          0.32 * scale,
          ['#5b4e42', '#514d47', '#846f57'][i % 3],
        );
        set(coat, i, x, y + 1.02 * scale, z, yaw, 0.59 * scale, 0.84 * scale, 0.48 * scale, coats[i % 6]);
        for (let leg = 0; leg < 2; leg++) {
          const s = leg ? 1 : -1;
          set(
            legs,
            i * 2 + leg,
            x + Math.cos(yaw) * s * 0.103,
            y + 0.4 * scale,
            z - Math.sin(yaw) * s * 0.103,
            yaw,
            0.135,
            0.62 * scale,
            0.17,
            '#555955',
            s * step,
          );
          set(
            sleeves,
            i * 2 + leg,
            x + Math.cos(yaw) * s * 0.226,
            y + 1.04 * scale,
            z - Math.sin(yaw) * s * 0.226,
            yaw,
            0.24,
            0.5 * scale,
            0.26,
            coats[i % 6],
            -s * step * 1.25 - 0.1,
          );
        }
      }
      const opening = state.event === 'opening',
        progress = opening ? Math.min(1, sim.eventTime / 21) : 1;
      for (let i = 0; i < 48; i++) {
        const bunch = Math.floor(i / 6),
          a = i * 2.4,
          pt = marketPoint(
            market.lanes[2].at(14 + bunch * 0.77) + 2.2 + Math.cos(a) * 0.19,
            14 + bunch * 0.77 + Math.sin(a) * 0.22,
          );
        let t = T.MathUtils.clamp(progress * 9 - bunch, 0, 1);
        const y = 1.06 + t * (0.28 + (i % 3) * 0.11);
        set(
          stems,
          i,
          pt[0],
          y,
          pt[1],
          a,
          0.115 * t,
          0.12 * t,
          0.11 * t,
          ['#a85c69', '#bd8b4f', '#b28ba0', '#d1ae67'][i % 4],
        );
        set(stalk, i, pt[0], y - 0.2, pt[1], a, t, 0.42 * t, t, '#61765a');
      }
      const b = marketPoint(market.lanes[2].at(13) + 0.83, opening ? 8 + progress * 5 : 13);
      barrow.position.set(b[0], 0.11, b[1]);
      barrow.rotation.y = -0.22;
      for (let i = 0; i < 9; i++) {
        const vv = 10 + i * 7.2,
          p = marketPoint(market.lanes[2].at(vv), vv),
          s = opening ? (progress * 12 > i ? 1 : 0) : Math.max(0.35, sim.lamps);
        set(lampBulbs, i, p[0], 4.48, p[1], 0, s, s, s);
      }
      for (const obj of [head, hair, coat, legs, sleeves, stems, stalk, lampBulbs]) {
        obj.instanceMatrix.needsUpdate = true;
        if (obj.instanceColor) obj.instanceColor.needsUpdate = true;
      }
    },
    get time() {
      return time;
    },
    sample() {
      return people.map((p) => onPath(tracks[p.k], p.d).slice(0, 2));
    },
  };
}
export function citySnow(scene) {
  const count = 1350,
    pts = new Float32Array(count * 3);
  let seed = 73;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < pts.length; i++) pts[i] = rand();
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pts, 3));
  const u = {
    clock: { value: 0 },
    anchor: { value: new T.Vector3() },
    power: { value: 0 },
    size: { value: 1 },
    footprint: { value: null },
    bounds: { value: new T.Vector4() },
    isolated: { value: 0 },
  };
  const m = new T.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float clock,size;uniform vec3 anchor;uniform vec4 bounds;varying vec2 parcelUV;
      void main(){vec3 p=position;float t=clock*(.04+.025*p.x);vec3 w=vec3(mod(p.x*94.+clock*.38+sin(t*9.+p.y*65.),94.)-47.,mod(p.y*38.-t*38.,38.)+.5,mod(p.z*90.+t*2.4,90.)-45.);
      parcelUV=(anchor.xz+w.xz-bounds.xy)/max(vec2(.01),bounds.zw-bounds.xy);
      vec4 mv=viewMatrix*vec4(anchor+w,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*34./max(5.,-mv.z),1.1,3.5);}`,
    fragmentShader: `uniform float power,isolated;uniform sampler2D footprint;varying vec2 parcelUV;
      void main(){if(isolated>.5 && (any(lessThan(parcelUV,vec2(0.)))||any(greaterThan(parcelUV,vec2(1.)))||texture2D(footprint,parcelUV).a<.5))discard;
      float a=1.-smoothstep(.23,.51,length(gl_PointCoord-.5));gl_FragColor=vec4(.92,.94,.95,a*power*.77);}`,
  });
  const fl = new T.Points(g, m);
  fl.frustumCulled = false;
  scene.add(fl);
  return (dt, p, s, on, mask) => {
    u.isolated.value = mask ? 1 : 0;
    if (mask) {
      u.footprint.value = mask.texture;
      u.bounds.value.fromArray(mask.bounds);
    }
    u.clock.value += dt;
    u.power.value = T.MathUtils.damp(u.power.value, on ? 1 : 0, 1.5, dt);
    fl.visible = u.power.value > 0.01 && s < 420;
    u.anchor.value.set(p.x, 0, p.z);
    u.size.value = 2;
  };
}
export function greatTom() {
  let context = null,
    bus = null,
    on = false,
    last = -1,
    count = 0;
  function strike() {
    if (!context || !on) return;
    const now = context.currentTime;
    for (const [freq, level, decay] of [
      [95, 0.34, 3.0],
      [189.3, 0.22, 2.0],
      [224.4, 0.1, 1.5],
      [282.5, 0.083, 1.55],
      [393.2, 0.09, 1.07],
      [506, 0.045, 0.64],
    ]) {
      const osc = context.createOscillator(),
        env = context.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(level, now + 0.016);
      env.gain.exponentialRampToValueAtTime(0.0001, now + decay * 2);
      osc.connect(env);
      env.connect(bus);
      osc.start(now);
      osc.stop(now + decay * 2 + 0.05);
    }
  }
  return {
    async enable() {
      if (!context) {
        context = new AudioContext();
        bus = context.createGain();
        bus.gain.value = 0.3;
        bus.connect(context.destination);
      }
      await context.resume();
      on = true;
      bus.gain.setTargetAtTime(0.3, context.currentTime, 0.04);
      strike();
    },
    mute() {
      on = false;
      if (context) bus.gain.setTargetAtTime(0, context.currentTime, 0.04);
    },
    reset() {
      last = -1;
      count = 0;
    },
    update(sec) {
      const k = Math.min(100, Math.floor(sec / 2.35));
      if (k !== last) {
        last = k;
        count = k + 1;
        strike();
      }
    },
    get count() {
      return count;
    },
    get on() {
      return on;
    },
  };
}
