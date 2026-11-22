import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, paperNoise } from './drawing.js';

export function makeWater(scene, map, renderer, isMobile) {
  const waterY = -1.9;
  const target = new T.WebGLRenderTarget(isMobile ? 416 : 768, isMobile ? 320 : 512, {
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: true,
    type: T.UnsignedByteType,
  });
  target.texture.generateMipmaps = false;
  const mirrors = [new T.OrthographicCamera(), new T.PerspectiveCamera()],
    mirrorVP = new T.Matrix4(),
    direction = new T.Vector3(),
    up = new T.Vector3(),
    aim = new T.Vector3();
  const uniforms = {
    reflection: { value: target.texture },
    mirrorVP: { value: mirrorVP },
    t: { value: 0 },
    waterTint: { value: new T.Color('#789a8e') },
    sunDir: { value: new T.Vector3() },
    sky: { value: new T.Color('#d6e4d5') },
    eyeDirection: { value: new T.Vector3() },
  };
  const mat = new T.ShaderMaterial({
    name: 'Cherwell · reflected gouache',
    uniforms,
    side: T.DoubleSide,
    vertexShader: `varying vec3 vWorld;varying vec4 vMirror;uniform mat4 mirrorVP;
    void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vMirror=mirrorVP*w;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `
    varying vec3 vWorld;varying vec4 vMirror;uniform sampler2D reflection;
    uniform vec3 waterTint,sunDir,sky,eyeDirection;uniform float t;
    ${paperNoise}
    void main(){
      vec2 p=vWorld.xz;
      float drift=paperValue(p*.20+vec2(t*.035,0.));
      float r=sin(p.x*1.38+p.y*3.12+t*.92+drift*5.)*.5+.5;
      float r2=sin(p.y*6.51+p.x*.62+sin(p.x*.64-t*.44)*1.81+t*.69+drift*3.)*.5+.5;
      vec2 ndc=vMirror.xy/vMirror.w*.5+.5;
      vec2 uv=clamp(ndc+vec2((r-.5)*.005,(r2-.5)*.0065),.001,.999);
      vec3 reflected=(texture2D(reflection,uv).rgb*2.+texture2D(reflection,uv+vec2(.0018,.0012)).rgb+texture2D(reflection,uv-vec2(.002,.001)).rgb)*.25;
      float reflectivity=.46+.20*pow(1.-clamp(eyeDirection.y,0.,1.),2.);
      vec3 c=mix(waterTint*(.83+.16*drift),reflected,reflectivity);
      vec3 normal=normalize(vec3((r-.5)*.145,1.,(r2-.5)*.15));
      float glint=pow(max(0.,dot(reflect(-sunDir,normal),eyeDirection)),23.);
      float stroke=smoothstep(.925,.999,r2)*smoothstep(.50,.76,drift)*(.5+.5*r);
      c+=sky*(stroke*.085+glint*.15);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`,
  });
  const surface = new T.Mesh(mergeGeometries(map.water.map((p) => flat(p, waterY))), mat);
  surface.name = 'River Cherwell / Holywell Mill Stream';
  scene.add(surface);
  const prevColor = new T.Color(),
    vBefore = new T.Matrix4(),
    lastSun = new T.Vector3(),
    clipping = new T.Plane(new T.Vector3(0, 1, 0), 1.89);
  let prev = -100;
  function update(time, cam, colour, skyColour, sun, force = false) {
    uniforms.t.value = time;
    uniforms.waterTint.value.copy(colour);
    uniforms.sunDir.value.copy(sun);
    uniforms.sky.value.copy(skyColour);
    cam.getWorldDirection(direction);
    uniforms.eyeDirection.value.copy(direction).negate();
    const moved = !vBefore.equals(cam.matrixWorld);
    if (!force && !moved && time - prev < (isMobile ? 0.67 : 0.42) && lastSun.distanceToSquared(sun) < 0.01)
      return;
    prev = time;
    lastSun.copy(sun);
    vBefore.copy(cam.matrixWorld);
    const mirror = mirrors[cam.isOrthographicCamera ? 0 : 1];
    mirror.near = cam.near;
    mirror.far = cam.far;
    mirror.projectionMatrix.copy(cam.projectionMatrix);
    mirror.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
    mirror.position.copy(cam.position);
    mirror.position.y = 2 * waterY - cam.position.y;
    direction.y *= -1;
    up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    up.y *= -1;
    mirror.up.copy(up);
    aim.copy(mirror.position).add(direction);
    mirror.lookAt(aim);
    mirror.updateMatrixWorld();
    mirrorVP.multiplyMatrices(mirror.projectionMatrix, mirror.matrixWorldInverse);
    renderer.getClearColor(prevColor);
    const alpha = renderer.getClearAlpha(),
      oldTarget = renderer.getRenderTarget();
    const previousPlanes = renderer.clippingPlanes,
      previousShadow = renderer.shadowMap.needsUpdate;
    renderer.shadowMap.needsUpdate = false;
    renderer.clippingPlanes = [clipping];
    surface.visible = false;
    renderer.setClearColor(skyColour, 1);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, mirror);
    renderer.setRenderTarget(oldTarget);
    renderer.setClearColor(prevColor, alpha);
    surface.visible = true;
    renderer.clippingPlanes = previousPlanes;
    renderer.shadowMap.needsUpdate = previousShadow;
  }
  return { update, surface };
}
