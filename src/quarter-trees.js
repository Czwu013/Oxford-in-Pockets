import * as T from 'three';
import { atmosphere, batch, local } from './palette.js';
import { seeded } from './magdalen/architecture/geometry.js';

// City-scale tree crowns keep the palette of their pocket. The close model
// takes over from the very same trunk point and uses the same season clock.
const leaves = new T.MeshLambertMaterial({ name: 'Mapped deciduous canopy', vertexColors: true });
leaves.onBeforeCompile = (shader) => {
  shader.uniforms.quarterSeasons = atmosphere.seasons;
  shader.vertexShader =
    'varying vec3 grovePosition;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ngrovePosition=position;',
    );
  shader.fragmentShader =
    'uniform vec4 quarterSeasons; varying vec3 grovePosition;\n' +
    shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
    float grain=fract(sin(dot(floor(grovePosition*2.6),vec3(13.7,27.8,5.3)))*2597.15);
    if(grain < quarterSeasons.w*.998+quarterSeasons.x*.16)discard;
    diffuseColor.rgb*=quarterSeasons.x*vec3(1.1,1.18,.83)+quarterSeasons.y*vec3(.71,.95,.70)+quarterSeasons.z*vec3(1.86,.81,.36)+quarterSeasons.w*.70;`,
    );
};
export function mappedGrove(parent, trees, heightAt = () => 0) {
  const g = batch({ ...local, leaves }),
    group = new T.Group();
  group.name = 'Coloured map-scale planting';
  parent.add(group);
  for (const { x, z, height: h, radius: r, kind } of trees) {
    const y = heightAt(x, z),
      rand = seeded(Math.abs(Math.round(x * 17 + z * 31)) + 23);
    const evergreen = /cedar|pine|fir|evergreen|conifer|yew|redwood|sequoia/i.test(kind);
    const crown = evergreen ? 'trim' : 'leaves',
      k = evergreen ? '#657c65' : ['#9bb37e', '#93aa74', '#859f72', '#a2af7b'][Math.floor(rand() * 4)];
    g.frustum('trim', '#837765', [x, z], y, y + h * 0.64, 0.21, 0.12, 6);
    for (let j = 0; j < 5; j++) {
      const a = j * 2.4 + rand() * 0.5,
        dx = Math.cos(a) * r * 0.71,
        dz = Math.sin(a) * r * 0.71;
      g.bar(
        'trim',
        '#827863',
        [x, y + h * (0.34 + j * 0.033), z],
        [x + dx, y + h * (0.65 + j * 0.052), z + dz],
        0.077,
        4,
      );
    }
    const a = rand() * 6,
      wide = evergreen ? 0.75 : 1;
    g.frustum(crown, k, [x, z], y + h * 0.31, y + h * 0.57, r * 0.2, r * wide, 9, a);
    g.frustum(crown, k, [x, z], y + h * 0.57, y + h * 0.81, r * wide, r * (evergreen ? 0.43 : 0.79), 9, a);
    g.frustum(crown, k, [x, z], y + h * 0.81, y + h, r * (evergreen ? 0.43 : 0.79), r * 0.06, 9, a);
  }
  for (const mesh of g.finish(group, 'Surveyed canopy')) {
    if (mesh.material === leaves) mesh.castShadow = false;
  }
  return group;
}
