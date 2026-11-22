import * as T from 'three';
import quarters from './data/quarters.json';
import ecology from './magdalen/data/ecology.json';

// Receivers in metres. A little airborne moisture is present beside actual
// trees, water, open arcades and the museum portico. The shadow map determines
// which parts of that air the sun can reach.
const air = {
  queens: [
    [-318, 4, -104, 8],
    [-336, 5, -128, 8],
    [-311, 5, -148, 10],
  ],
  univ: [
    [-382, 4, -76, 8],
    [-346, 5, -67, 9],
    [-323, 3, -73, 6],
  ],
  balliol: [
    [-747, 4, -283, 9],
    [-745, 5, -307, 9],
    [-803, 5, -385, 11],
  ],
  trinity: [
    [-738, 5, -359, 8],
    [-711, 4, -301, 8],
    [-587, 4, -319, 10],
  ],
  newcollege: [
    [-435, 6, -280, 13],
    [-220, 4, -253, 14],
    [-360, 5, -259, 12],
  ],
  merton: [
    [-413, 5, 117, 11],
    [-365, 6, 114, 12],
    [-442, 7, 94, 11],
  ],
  magdalen: [
    [-20, 8, 9, 20],
    [19, 6, -34, 16],
    [59, 6, -49, 17],
    [41, 5, 47, 15],
  ],
  radcliffe: [
    [-521, 8, -159, 19],
    [-505, 6, -287, 11],
    [-540, 6, -232, 14],
  ],
  market: [
    [-766, 5, -62, 10],
    [-701, 5, -92, 19],
    [-692, 5, -48, 12],
  ],
  christ: [
    [-660, 7, 179, 20],
    [-592, 6, 67, 15],
    [-564, 6, 281, 17],
  ],
  museum: [
    [-664, 8, -742, 17],
    [-689, 11, -748, 17],
    [-784, 7, -806, 18],
  ],
  castle: [
    [-1164, 6, 23, 15],
    [-1130, 6, 2, 15],
    [-1095, 7, -104, 17],
  ],
  ashmolean: [
    [-937.5, 7, -380, 16],
    [-915, 8, -370, 16],
    [-865, 7, -352, 14],
  ],
  carfax: [
    [-791, 7, -8, 16],
    [-753, 6, 41, 14],
    [-740, 6, 63, 12],
  ],
};
for (const [key, q] of Object.entries(quarters)) {
  const receivers = (air[key] ??= []);
  for (const [x, z, h, r] of q.trees) receivers.push([x, h * 0.57, z, Math.max(7, r * 2.9)]);
}
for (const t of ecology.trees) air.magdalen.push([t.x, t.height * 0.56, t.z, Math.max(7, t.radius * 2.65)]);
const vertex = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

// Reuse three nearby lights for the illuminated pavement under real modelled lanterns.
export function nightLanterns(scene, sites, placeAt) {
  const owners = new Map(sites.map((p) => [p, placeAt(p[0], p[2])]));
  const bulbs = Array.from({ length: 3 }, () => {
    const light = new T.PointLight('#ffd19a', 0, 10.5, 2);
    scene.add(light);
    return light;
  });
  let lastX = Infinity,
    lastZ = Infinity,
    sorted = [];
  let previousScope;
  return (sim, pose, eye, scope) => {
    if (previousScope !== scope) {
      previousScope = scope;
      lastX = Infinity;
      sorted = [];
    }
    const glow =
      T.MathUtils.smoothstep(sim.lamps, 0.09, 0.96) * (1 - T.MathUtils.smoothstep(pose.span, 145, 390));
    if (glow > 0.004 && Math.hypot(lastX - eye.x, lastZ - eye.z) > 2) {
      lastX = eye.x;
      lastZ = eye.z;
      const distance = (p) => (p[0] - eye.x) ** 2 + (p[2] - eye.z) ** 2;
      sorted = sites
        .filter((p) => !scope || owners.get(p) === scope)
        .sort((a, b) => distance(a) - distance(b))
        .slice(0, bulbs.length);
    }
    bulbs.forEach((lamp, i) => {
      const p = sorted[i];
      if (!p || glow <= 0.004) {
        lamp.intensity = 0;
        return;
      }
      lamp.position.fromArray(p);
      const distance = Math.hypot(p[0] - eye.x, p[2] - eye.z);
      lamp.intensity = 18 * glow * (1 - T.MathUtils.smoothstep(distance, 32, 66));
    });
  };
}
const common = `
varying vec2 vUv;
uniform sampler2D sceneDepth, sceneColour, sunDepth;
uniform mat4 clipToWorld, lightMatrix;
uniform vec3 eye, lightDir, boxMin, boxMax;
uniform vec4 volumes[8];
uniform vec2 pixel;
uniform float power;
vec3 unprojectPoint(vec2 uv,float depth){
  vec4 p=clipToWorld*vec4(uv*2.-1.,depth*2.-1.,1.);
  return p.xyz/p.w;
}
`;
function makePass(fragment, uniforms) {
  const scene = new T.Scene(),
    mat = new T.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      depthTest: false,
      depthWrite: false,
      blending: T.NoBlending,
      toneMapped: false,
    });
  const mesh = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return scene;
}
export function aerialLight(renderer, sun, mobile) {
  const size = new T.Vector2(),
    cam = new T.Camera();
  const frame = new T.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    samples: mobile ? 0 : Math.min(4, renderer.capabilities.maxSamples),
  });
  frame.texture.colorSpace = T.SRGBColorSpace;
  frame.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
  frame.depthTexture.minFilter = frame.depthTexture.magFilter = T.NearestFilter;
  const light = new T.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
  });
  const u = Object.fromEntries(
    Object.entries({
      sceneDepth: frame.depthTexture,
      sceneColour: frame.texture,
      sunDepth: null,
      lightField: light.texture,
      clipToWorld: new T.Matrix4(),
      lightMatrix: new T.Matrix4(),
      eye: new T.Vector3(),
      lightDir: new T.Vector3(),
      boxMin: new T.Vector3(),
      boxMax: new T.Vector3(),
      pixel: new T.Vector2(),
      lowPixel: new T.Vector2(),
      volumes: Array.from({ length: 8 }, () => new T.Vector4()),
      power: 1,
      tint: new T.Color('#fff0c9'),
    }).map(([k, value]) => [k, { value }]),
  );
  const samples = mobile ? 22 : 32;
  const scatter = makePass(
    `#include <packing>
  ${common}
  float visibility(vec3 p){
    vec4 q=lightMatrix*vec4(p,1.);vec3 uv=q.xyz/q.w;
    if(any(lessThan(uv,vec3(.001)))||any(greaterThan(uv,vec3(.999))))return 0.;
    float z=unpackRGBAToDepth(texture2D(sunDepth,uv.xy));return step(uv.z-.00009,z);
  }
  void main(){
    float depth=texture2D(sceneDepth,vUv).r;
    vec3 hit=unprojectPoint(vUv,depth),rd=normalize(hit-eye);
    vec3 inv=sign(rd+vec3(.000001))/max(abs(rd),vec3(.00001));
    vec3 ta=(boxMin-eye)*inv,tb=(boxMax-eye)*inv;
    vec3 entry=min(ta,tb),leave=max(ta,tb);
    float a=max(0.,max(entry.x,max(entry.y,entry.z)));
    float b=min(length(hit-eye),min(leave.x,min(leave.y,leave.z)));
    if(b<=a){gl_FragColor=vec4(0.);return;}
    float stride=(b-a)/${samples}.;
    float noise=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));
    float total=0.;
    for(int i=0;i<${samples};i++){
      vec3 p=eye+rd*(a+(float(i)+.15+.70*noise)*stride);float density=0.;
      for(int j=0;j<8;j++){
        vec4 v=volumes[j];vec3 dp=(p-v.xyz)*vec3(1.,1.62,1.)/max(.01,v.w);
        float w=max(0.,1.-dot(dp,dp));density=max(density,w*w);
      }
      if(density>.006) total+=density*visibility(p)*stride;
    }
    float forward=pow(max(0.,dot(rd,lightDir)),3.);
    float rays=1.-exp(-total*(.0043+.011*forward)*power);
    // Bloom only around visible bright masonry/openings in this local volume.
    // Sky is transparent in the scene texture and cannot seed the halo.
    float centre=luminance(texture2D(sceneColour,vUv).rgb),bright=0.;
    for(int j=0;j<8;j++){
      float an=float(j)*.785398;vec2 off=vec2(cos(an),sin(an))*pixel*6.;
      vec4 c=texture2D(sceneColour,clamp(vUv+off,.0,1.));bright+=smoothstep(.50,.84,luminance(c.rgb))*c.a;
    }
    float halo=bright*.125*(1.-smoothstep(.41,.84,centre))*smoothstep(.15,3.5,total)*(.032+.055*forward)*power;
    gl_FragColor=vec4(rays,halo,0.,1.);
  }`,
    u,
  );
  const combine = makePass(
    `${common}
  uniform sampler2D lightField;uniform vec2 lowPixel;uniform vec3 tint;
  void main(){
    vec4 base=texture2D(sceneColour,vUv);
    // A depth-aware gather keeps shafts on the correct side of roof and column silhouettes.
    float z=texture2D(sceneDepth,vUv).r,sum=0.;vec2 l=vec2(0.);
    for(int j=0;j<5;j++){
      float a=float(j)*1.570796;vec2 uv=vUv+(j==4?vec2(0.):vec2(cos(a),sin(a))*lowPixel*.72);
      float nz=texture2D(sceneDepth,uv).r;float w=(j==4?2.:1.)/(1.+abs(z-nz)*3400.);
      l+=texture2D(lightField,uv).rg*w;sum+=w;
    }
    l/=sum;float fog=min(.245,l.x);float alpha=base.a+(1.-base.a)*fog;
    vec3 colour=base.a>.003?base.rgb:tint;
    colour=mix(colour,tint,fog*.83)+tint*l.y;
    if(base.a>.995 && max(max(base.r,base.g),base.b)-min(min(base.r,base.g),base.b)<.0002)
      colour=vec3(luminance(colour));
    gl_FragColor=vec4(colour,alpha);
    #include <colorspace_fragment>
    gl_FragColor.rgb*=alpha;
  }`,
    u,
  );
  const drawing = { active: false, volumeCount: 0, power: 0 };
  let lastW = 0,
    lastH = 0;
  let lastZone = null,
    lastX = Infinity,
    lastZ = Infinity;
  function render(scene, camera, sim, pose, selected, enabled) {
    const zone = air[selected],
      strength = enabled
        ? T.MathUtils.smoothstep(sim.sunPower ?? 1, 0.2, 0.94) *
          (1 - 0.43 * sim.wet) *
          (1 - 0.62 * T.MathUtils.smoothstep(pose.span, 105, 400))
        : 0;
    drawing.active = !!zone && pose.span < 480 && strength > 0.004;
    drawing.power = drawing.active ? strength : 0;
    if (!drawing.active) {
      renderer.render(scene, camera);
      return;
    }
    renderer.getDrawingBufferSize(size);
    if (lastW !== size.x || lastH !== size.y) {
      lastW = size.x;
      lastH = size.y;
      frame.setSize(lastW, lastH);
      light.setSize(
        Math.max(1, Math.round(lastW * (mobile ? 0.34 : 0.42))),
        Math.max(1, Math.round(lastH * (mobile ? 0.34 : 0.42))),
      );
      u.pixel.value.set(1 / lastW, 1 / lastH);
      u.lowPixel.value.set(1 / light.width, 1 / light.height);
    }
    if (lastZone !== zone || Math.hypot(lastX - pose.x, lastZ - pose.z) > 1.5) {
      lastZone = zone;
      lastX = pose.x;
      lastZ = pose.z;
      const nearest = zone
        .map((v) => ({ v, dist: (v[0] - pose.x) ** 2 + (v[2] - pose.z) ** 2 }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);
      drawing.volumeCount = nearest.length;
      u.boxMin.value.set(Infinity, Infinity, Infinity);
      u.boxMax.value.set(-Infinity, -Infinity, -Infinity);
      for (let i = 0; i < 8; i++) {
        if (!nearest[i]) {
          u.volumes.value[i].set(0, -1e4, 0, 0.01);
          continue;
        }
        const [x, y, z, r] = nearest[i].v;
        u.volumes.value[i].set(x, y, z, r);
        u.boxMin.value.min(new T.Vector3(x - r, Math.max(0.08, y - r / 1.62), z - r));
        u.boxMax.value.max(new T.Vector3(x + r, y + r / 1.62, z + r));
      }
    }
    const old = renderer.getRenderTarget();
    renderer.setRenderTarget(frame);
    renderer.render(scene, camera);
    const geometryCalls = renderer.info.render.calls,
      geometryTriangles = renderer.info.render.triangles;
    u.sunDepth.value = sun.shadow.map.texture;
    u.lightMatrix.value.copy(sun.shadow.matrix);
    u.clipToWorld.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    u.eye.value.copy(camera.position);
    u.lightDir.value.copy(sim.sunDir);
    u.power.value = strength;
    u.tint.value.set('#fff1ce').lerp(sun.color, 0.24);
    renderer.setRenderTarget(light);
    renderer.render(scatter, cam);
    renderer.setRenderTarget(old);
    renderer.render(combine, cam);
    drawing.geometryCalls = geometryCalls;
    drawing.geometryTriangles = geometryTriangles;
  }
  return { render, inspect: () => ({ ...drawing }) };
}
