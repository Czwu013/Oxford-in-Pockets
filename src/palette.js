import * as T from 'three';
import { Stonework, faces, orientedBox, clip, atY } from './magdalen/architecture/geometry.js';
import { makeMaterials } from './magdalen/architecture/materials.js';
import { brushed } from './magdalen/drawing.js';

// The outgoing colour of the context is neutral even in golden-hour lighting.
export const atmosphere = {
  snow: { value: 0 },
  wet: { value: 0 },
  night: { value: 0 },
  seasons: { value: new T.Vector4(1, 0, 0, 0) },
};
export function surface(
  name,
  {
    grey = false,
    roof = false,
    grass = false,
    stone = false,
    lamp = false,
    interior = false,
    relief = false,
    finish = '',
    vertex = true,
    base = 0xffffff,
  } = {},
) {
  const m = new T.MeshLambertMaterial({ name, color: base, vertexColors: vertex, side: T.DoubleSide });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, {
      snowLoad: atmosphere.snow,
      wetness: atmosphere.wet,
      nightfall: atmosphere.night,
      seasonBlend: atmosphere.seasons,
    });
    s.vertexShader =
      (relief ? 'attribute float _pocket_ao; varying float pocketOcclusion;\n' : '') +
      'varying vec3 cityPoint; varying vec3 cityNormal;\n' +
      s.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ncityPoint=(modelMatrix*vec4(position,1.)).xyz; cityNormal=normalize(mat3(modelMatrix)*normal);' +
          (relief ? 'pocketOcclusion=_pocket_ao;' : ''),
      );
    s.fragmentShader =
      (relief ? 'varying float pocketOcclusion;\n' : '') +
      'varying vec3 cityPoint; varying vec3 cityNormal; uniform float snowLoad; uniform float wetness; uniform float nightfall; uniform vec4 seasonBlend;\n' +
      s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace(
      '#include <map_fragment>',
      `vec3 basePigment=diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb=mix(basePigment,diffuseColor.rgb,${grey ? '.38' : roof ? '.66' : '.80'});`,
    );
    const ink = `float grain=.5+.25*sin(cityPoint.x*1.72+cityPoint.z*1.15+sin(cityPoint.y*.83))+.25*sin(cityPoint.x*.53-cityPoint.z*1.37+cityPoint.y*.7);`;
    if (relief)
      s.fragmentShader = s.fragmentShader.replace(
        '#include <lights_fragment_end>',
        '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse*=mix(.33,1.,pocketOcclusion);',
      );
    const masonry = stone
      ? `vec2 h=vec2(cityPoint.x*.9+cityPoint.z*.56,cityPoint.y); float course=h.y*2.25; float seam=min(abs(fract(course+.5)-.5)/max(fwidth(course),.01),abs(fract(h.x*.8+floor(course)*.47+.5)-.5)/max(fwidth(h.x*.8),.01)); diffuseColor.rgb*=1.-.14*(1.-smoothstep(.06,.75,seam))*(1.-smoothstep(.18,.70,fwidth(course)));`
      : '';
    const snow =
      roof || grass
        ? `float f=clamp(snowLoad,0.,1.); float retention=${roof ? 'smoothstep(.18,.73,abs(cityNormal.y))' : '1.'}; float snowCover=smoothstep(.20,.73,f*1.65 + .19*grain +.12*sin(cityPoint.z*.63+cityPoint.x*.33)-.2); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.86,.86),snowCover*retention*.95);`
        : '';
    const growth = grass
      ? `float lawnWash=${grey ? '1.' : '.98+.012*sin(cityPoint.x*.14+sin(cityPoint.z*.17))+.014*sin(cityPoint.z*.21+sin(cityPoint.x*.13))'};diffuseColor.rgb*=lawnWash*(seasonBlend.x*vec3(1.04,1.10,.93)+seasonBlend.y*vec3(.83,1.03,.87)+seasonBlend.z*vec3(1.13,.94,.73)+seasonBlend.w*vec3(.89,.90,.85));`
      : '';
    const wear =
      stone && !grey
        ? `float footing=(1.-smoothstep(.18,2.1+.48*sin(cityPoint.x*.8+cityPoint.z*.3),cityPoint.y))*.24; diffuseColor.rgb*=vec3(1.-footing,1.-footing*.83,1.-footing*.96); diffuseColor.rgb*=.99+.023*sin(cityPoint.y*.67+sin(cityPoint.z*.47+cityPoint.x*.2));`
        : '';
    const groundFinish =
      finish === 'paving'
        ? `float wash=smoothstep(.41,.79,.48+.23*sin(cityPoint.x*.65+cityPoint.z*.33)+.19*sin(cityPoint.z*1.15-cityPoint.x*.26));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.75+vec3(.028,.034,.038),wash*wetness); `
        : '';
    s.fragmentShader = s.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n${ink}\nfloat brushVisibility=1.-smoothstep(.60,2.7,max(fwidth(cityPoint.x),fwidth(cityPoint.z)));diffuseColor.rgb*=(.985+.03*(grain-.5)*brushVisibility)*(1.-wetness*.12);\n${masonry}\n${wear}\n${groundFinish}\n${growth}\n${snow}`,
    );
    if (interior)
      s.fragmentShader = s.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        vec2 pane=vMapUv;
        float rooms=.5+.5*sin(cityPoint.x*.37+cityPoint.z*.51+cityPoint.y*.22+.8*sin(cityPoint.z*.14));
        float occupied=mix(.045,.92,smoothstep(.22,.76,rooms));
        vec2 behind=(pane-vec2(.61,.44))*vec2(1.6,1.);
        float spill=.42+.58*exp(-3.9*dot(behind,behind));
        float drapery=.76+.24*smoothstep(.05,.29,min(pane.x,1.-pane.x));
        float glassInk=mix(.73,1.,clamp(luminance(diffuseColor.rgb)*2.,0.,1.));
        outgoingLight+=vec3(.86,.49,.21)*occupied*spill*drapery*glassInk*nightfall;
        #include <opaque_fragment>
      `,
      );
    else if (lamp)
      s.fragmentShader = s.fragmentShader.replace(
        '#include <opaque_fragment>',
        'outgoingLight+=vec3(.80,.40,.13)*nightfall;\n#include <opaque_fragment>',
      );
    if (grey)
      s.fragmentShader = s.fragmentShader.replace(
        '#include <colorspace_fragment>',
        '#include <colorspace_fragment>\nfloat gray=dot(gl_FragColor.rgb, vec3(.2126,.7152,.0722));gl_FragColor.rgb=vec3(gray);',
      );
  };
  m.customProgramCacheKey = () =>
    [grey, roof, grass, stone, lamp, interior, vertex, finish, relief].join('-');
  return m;
}
export const gray = {
  wall: surface('Grey limestone', { grey: true, stone: true }),
  roof: surface('Grey roofs', { grey: true, roof: true }),
  ground: surface('Grey cartography', { grey: true }),
  grass: surface('Grey parkland', { grey: true, grass: true }),
};
export const local = {
  stone: surface('Ashlar', { stone: true }),
  rubble: surface('Weathered stone', { stone: true }),
  fine: surface('Carved limestone', { stone: true }),
  trim: surface('Stone and timber trim'),
  ink: surface('Ink and iron'),
  roof: surface('Slate and clay tile', { roof: true }),
  lead: surface('Weathered lead', { roof: true }),
  glass: surface('Glass and recesses'),
  lamp: surface('Lamplit windows', { lamp: true }),
  'sash-glass': surface('Windowpanes', { lamp: true }),
  'chapel-glass': surface('Coloured leaded lights', { lamp: true }),
  grass: surface('Pocket lawn', { grass: true }),
  paving: surface('Yorkstone', { finish: 'paving' }),
  water: surface('Courtyard water'),
};
const paperMaterials = makeMaterials(T).materials;
for (const key of ['stone', 'rubble', 'fine', 'roof', 'glass', 'lamp', 'chapel-glass'])
  local[key].map = paperMaterials[key].map;
local.paving.map = brushed('paving');
local.grass.map = brushed('grass');
local.skylight = surface('Market roof glazing');
local.skylight.transparent = true;
local.skylight.opacity = 0.67;
local.skylight.depthWrite = false;
gray.wall.map = paperMaterials.fine.map;
gray.roof.map = paperMaterials.roof.map;
export const batch = (m = local) => new Stonework(T, m);
export function ridgeRoof(g, rings, y, rise, tint, wall, roof = 'roof', stone = 'stone') {
  const [outer, ...holes] = rings;
  if (!rise || holes.length) {
    g.cap(roof, tint, outer, y, holes);
    return;
  }
  const b = orientedBox(outer),
    half = b.W * 0.5;
  if (!b || half < 0.15) {
    g.cap(roof, tint, outer, y);
    return;
  }
  const v = (p) => b.uv(p)[1],
    height = (p) => y + rise * Math.max(0, 1 - Math.abs(v(p) - half) / half);
  // Split each triangle at the ridge. This is also valid for concave plans.
  for (const tri of g.planTriangles(outer))
    for (const sign of [-1, 1]) {
      const poly = clip(tri, v, half, sign);
      if (poly.length < 3) continue;
      for (let i = 1; i < poly.length - 1; i++)
        g.tri(
          roof,
          tint,
          atY(poly[0], height(poly[0])),
          atY(poly[i + 1], height(poly[i + 1])),
          atY(poly[i], height(poly[i])),
        );
    }
  for (const f of faces(outer)) {
    const a = f.a,
      b = f.b,
      va = v(a) - half,
      vb = v(b) - half,
      points = [a];
    if (va * vb < 0) points.push(a.map((n, i) => n + ((b[i] - n) * va) / (va - vb)));
    points.push(b);
    for (let i = 1; i < points.length; i++) {
      const s = points[i - 1],
        t = points[i];
      g.quad(stone, wall, atY(s, y), atY(t, y), atY(t, height(t)), atY(s, height(s)));
    }
  }
}
export function strip(g, key, col, line, width, y) {
  if (line.length < 2) return;
  let prev;
  for (let i = 0; i < line.length; i++) {
    const p = line[i],
      a = line[Math.max(0, i - 1)],
      b = line[Math.min(line.length - 1, i + 1)],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz) || 1;
    const ox = ((-dz / len) * width) / 2,
      oz = ((dx / len) * width) / 2,
      next = [
        [p[0] - ox, y, p[1] - oz],
        [p[0] + ox, y, p[1] + oz],
      ];
    if (prev) g.quad(key, col, prev[0], prev[1], next[1], next[0]);
    prev = next;
  }
}
export function rect(x, z, w, d) {
  return [
    [x - w / 2, z - d / 2],
    [x + w / 2, z - d / 2],
    [x + w / 2, z + d / 2],
    [x - w / 2, z + d / 2],
  ];
}
