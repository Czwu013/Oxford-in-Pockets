import * as T from 'three';

// This material extension runs within the base material's light, shadow and fog pass.
// Depth is sampled at the receiver. The doorway under a snowy roof stays sheltered.
export function coatMaterial(material, kind, uniforms) {
  const original = material.onBeforeCompile,
    key = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    original.call(this, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 snowWorld; varying float snowFacing;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        snowWorld=(modelMatrix*vec4(transformed,1.)).xyz;
        snowFacing=abs(normalize(mat3(modelMatrix)*objectNormal).y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D snowRelief, snowSkyline;
        uniform vec4 snowBounds;
        uniform float snowShow, snowRidge;
        varying vec3 snowWorld; varying float snowFacing;
        float snowHash(vec2 p) {return fract(sin(dot(p,vec2(91.435,47.29)))*4137.23);}
        float snowNoise(vec2 p) {
          vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(snowHash(i),snowHash(i+vec2(1.,0.)),f.x),mix(snowHash(i+vec2(0.,1.)),snowHash(i+1.),f.x),f.y);
        }`,
      )
      .replace(
        '#include <alphamap_fragment>',
        `#include <alphamap_fragment>
        float cover=0., melt=0.;
        if (snowShow>.0001) {
        vec2 uvSnow=(snowWorld.xz-snowBounds.xy)*snowBounds.zw;
        vec2 snowData=texture2D(snowRelief,uvSnow).rg;
        float ceiling=texture2D(snowSkyline,uvSnow).r*64.-10.;
        float skyAccess=1.-smoothstep(0.45,1.65,ceiling-snowWorld.y);
        float highEdge=step(ceiling+0.6,snowWorld.y);
        float loadSnow=max(snowData.r,highEdge*snowRidge*0.70);
        float grain=snowNoise(snowWorld.xz*2.8);
        float patchiness=.49*snowNoise(snowWorld.xz*.48)+.35*snowNoise(snowWorld.xz*.16)+.16*grain;
        float deposit=loadSnow*1.30 - patchiness*.83 - .025;
        ${kind === 'roof' ? 'deposit-=.08+.42*(1.-snowFacing);' : ''}
        cover=smoothstep(-.034,.12,deposit)*smoothstep(.22,.76,snowFacing)*skyAccess*snowShow;
        ${
          kind === 'roof'
            ? 'cover*=.95-.70*smoothstep(.58,.83,patchiness);'
            : 'cover*=.97-.48*smoothstep(.60,.84,patchiness);'
        }
        ${kind === 'road' ? 'cover*=.05;' : ''}
        melt=snowData.g*skyAccess*snowShow;
        diffuseColor.rgb *= 1.-.13*melt;
        vec3 snowColour=mix(vec3(.67,.745,.793),vec3(.93,.95,.93),.48+grain*.46);
        diffuseColor.rgb=mix(diffuseColor.rgb,snowColour,cover*.96);
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor=mix(roughnessFactor,.55,melt*.4);
        roughnessFactor=mix(roughnessFactor,.96,cover);`,
      );
  };
  material.customProgramCacheKey = () => key + '-deposition-' + kind;
  material.needsUpdate = true;
}

// Small windrows have real relief. The outline is sampled off kerb bed polygons
// and bridge pavement edges, then crowned a few centimetres above that support.
export function makeDrifts(scene, map, frame, surfaces, uniforms) {
  const positions = [],
    ridges = [];
  const build = (outline, height) => {
    const center = outline.reduce(
      (p, q) => [p[0] + q[0] / outline.length, p[1] + q[1] / outline.length],
      [0, 0],
    );
    const base = surfaces.sample(...center);
    if (!['ground', 'lawn', 'road', 'path', 'bridge'].includes(base.kind)) return;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i],
        b = outline[(i + 1) % outline.length];
      const yA = surfaces.sample(...a).y,
        yB = surfaces.sample(...b).y;
      if (Math.abs(yA - base.y) > 0.34 || Math.abs(yB - base.y) > 0.34) continue;
      positions.push(a[0], yA + 0.012, a[1], center[0], base.y + 0.012, center[1], b[0], yB + 0.012, b[1]);
      ridges.push(0, height, 0);
    }
  };
  for (const p of map.details.drifts) build(p.outer, 0.065 + Math.abs(Math.sin(p.outer[0][0])) * 0.085);
  for (const side of [-1, 1]) {
    for (let u = -5; u < frame.length - 3; u += 3.3) {
      const span = 2.4 + 0.75 * Math.sin(u * 0.39),
        outline = [];
      for (const [du, offset] of [
        [0, 0.22],
        [span * 0.28, 0.47],
        [span, 0.24],
        [span * 0.91, 0.08],
        [span * 0.08, 0.08],
      ]) {
        const q = frame.at(u + du, 0, frame.sidewalk(u + du, side) + side * offset);
        outline.push([q[0], q[2]]);
      }
      build(outline, 0.064);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('ridge', new T.Float32BufferAttribute(ridges, 1));
  g.computeVertexNormals();
  const m = new T.MeshStandardMaterial({ color: '#e6eceb', roughness: 0.97, side: T.DoubleSide });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float ridge; uniform float snowRidge; varying vec2 driftPos;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed.y+=ridge*snowRidge; driftPos=position.xz;',
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float snowRidge, snowShow; varying vec2 driftPos;',
      )
      .replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
      float seam=.24+.15*sin(driftPos.x*1.1+driftPos.y*.63)+.06*sin(driftPos.y*4.-driftPos.x*2.);
      if(snowRidge*snowShow<seam) discard;`,
      );
  };
  const mesh = new T.Mesh(g, m);
  mesh.name = 'Corn snow along pavement and bridge kerbs';
  mesh.receiveShadow = true;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}
