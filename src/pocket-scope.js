import * as T from 'three';
import quarters from './data/quarters.json';
import site from './magdalen/data/site.json';
import castleSection from './data/castle-section.json';
import { batch } from './palette.js';
import { inside } from './magdalen/ground.js';
import { faces, frame } from './magdalen/architecture/geometry.js';

const outlines = Object.fromEntries(Object.entries(quarters).map(([id, q]) => [id, q.boundary]));
outlines.magdalen = [[site.boundary.outer, ...(site.boundary.holes || [])]];
export function containsPlace(id, x, z) {
  return outlines[id].some(
    ([outer, ...holes]) => inside(x, z, outer) && !holes.some((hole) => inside(x, z, hole)),
  );
}
function extent(rings) {
  const points = rings.flatMap(([outer]) => outer);
  const x = points.map((p) => p[0]),
    z = points.map((p) => p[1]);
  return [Math.min(...x), Math.min(...z), Math.max(...x), Math.max(...z)];
}
function makeSection(id, q) {
  const section = new T.Group(),
    g = batch();
  section.name = 'Landscape section';
  function cutFace(f, water) {
    const top = water ? -1.866 : -0.027;
    g.panel('ragstone', '#a6987d', f, 0, f.l, -4.72, top - 0.55);
    g.panel('paving', water ? '#88a499' : '#b5a586', f, 0, f.l, top - 0.55, top);
    g.panel('stone', '#857969', f, 0, f.l, -5.38, -4.88);
    g.panel('fine', '#c7b598', f, 0, f.l, -4.88, -4.72);
  }
  for (const [outer, ...holes] of q.boundary) {
    g.cap('ragstone', '#a38e72', outer, -5.37, holes);
    if (id !== 'castle') for (const ring of [outer, ...holes]) for (const f of faces(ring)) cutFace(f, false);
  }
  if (id === 'castle')
    for (const kind of ['wet', 'dry']) {
      for (const line of castleSection[kind])
        for (let i = 1; i < line.length; i++) {
          const f = frame(line[i - 1], line[i]);
          if (f.l > 0.012) cutFace(f, kind === 'wet');
        }
    }
  g.finish(section, 'Earth, subsoil and bedrock');
  return section;
}
// The same polygons delimit snowfall and the physical table model. Rasterise
// once per visited site; tests of individual particles then run on the GPU.
function snowMask(polys, bounds) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const [x0, z0, x1, z1] = bounds;
  ctx.fillStyle = 'white';
  for (const rings of polys) {
    ctx.beginPath();
    for (const ring of rings) {
      ring.forEach(([x, z], i) =>
        ctx[i ? 'lineTo' : 'moveTo'](((x - x0) / (x1 - x0)) * 512, ((z - z0) / (z1 - z0)) * 512),
      );
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
  const texture = new T.CanvasTexture(canvas);
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.minFilter = texture.magFilter = T.LinearFilter;
  return texture;
}
export function pocketScope(groups, context, table) {
  const sections = new Map(),
    masks = new Map();
  let id = null;
  return {
    get id() {
      return id;
    },
    get mask() {
      return masks.get(id);
    },
    get outline() {
      return outlines[id];
    },
    set(next) {
      if (id === next) return;
      if (id) sections.get(id).visible = false;
      id = next;
      context.visible = !id;
      table.position.y = id === 'magdalen' ? -6.18 : -5.48;
      for (const [key, root] of Object.entries(groups)) root.visible = !id || key === id;
      if (!id) return;
      if (!sections.has(id)) {
        const section =
          id === 'magdalen' ? groups[id].getObjectByName('Landscape section') : makeSection(id, quarters[id]);
        if (!section.parent) groups[id].add(section);
        sections.set(id, section);
        const bounds = extent(outlines[id]);
        masks.set(id, { bounds, texture: snowMask(outlines[id], bounds) });
      }
      sections.get(id).visible = true;
    },
  };
}
