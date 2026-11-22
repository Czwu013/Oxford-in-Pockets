// All authoring coordinates are metres. Plan points are [east, south].
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const mix = (a, b, s) => a.map((v, i) => v + (b[i] - v) * s);
export const ringArea = (pts) =>
  pts.reduce((s, a, i) => {
    const b = pts[(i + 1) % pts.length];
    return s + a[0] * b[1] - b[0] * a[1];
  }, 0) / 2;
export const clean = (pts) =>
  pts
    .filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 0.015)
    .filter((p, i, a) => !(i === a.length - 1 && dist(p, a[0]) < 0.015));
export function frame(a, b, side = 1) {
  const l = dist(a, b),
    ux = (b[0] - a[0]) / l,
    uz = (b[1] - a[1]) / l;
  return {
    a,
    b,
    l,
    ux,
    uz,
    nx: uz * side,
    nz: -ux * side,
    point(u, y, d = 0) {
      return [a[0] + ux * u + uz * side * d, y, a[1] + uz * u - ux * side * d];
    },
    plan(u, d = 0) {
      return [a[0] + ux * u + uz * side * d, a[1] + uz * u - ux * side * d];
    },
  };
}
export function faces(outer) {
  const p = clean(outer),
    s = Math.sign(ringArea(p));
  return p.map((a, i) => frame(a, p[(i + 1) % p.length], s));
}
export function orientedBox(outer) {
  const p = clean(outer);
  let best;
  for (const f of faces(p)) {
    let ux = f.ux,
      uz = f.uz;
    if (ux < 0 || (ux === 0 && uz < 0)) {
      ux = -ux;
      uz = -uz;
    }
    const a = p.map(([x, z]) => x * ux + z * uz),
      b = p.map(([x, z]) => -x * uz + z * ux);
    let u0 = Math.min(...a),
      u1 = Math.max(...a),
      v0 = Math.min(...b),
      v1 = Math.max(...b);
    const area = (u1 - u0) * (v1 - v0);
    if (best && area >= best.area - 0.0001) continue;
    if (u1 - u0 < v1 - v0) {
      [ux, uz] = [-uz, ux];
      [u0, u1, v0, v1] = [v0, v1, -u1, -u0];
    }
    if (ux < 0) {
      [ux, uz] = [-ux, -uz];
      [u0, u1, v0, v1] = [-u1, -u0, -v1, -v0];
    }
    best = {
      u0,
      u1,
      v0,
      v1,
      area,
      ux,
      uz,
      L: u1 - u0,
      W: v1 - v0,
      uv: ([x, z]) => [x * ux + z * uz - u0, -x * uz + z * ux - v0],
      at: (u, v) => [(u0 + u) * ux - (v0 + v) * uz, (u0 + u) * uz + (v0 + v) * ux],
    };
  }
  return best;
}
export function clip(points, measure, limit, sign) {
  const result = [];
  let a = points[points.length - 1],
    da = sign * (measure(a) - limit);
  for (const b of points) {
    const db = sign * (measure(b) - limit);
    if (da > 0 !== db > 0) result.push(mix(a, b, da / (da - db)));
    if (db >= 0) result.push(b);
    a = b;
    da = db;
  }
  return result;
}
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export const atY = (p, y) => [p[0], y, p[1]];

export class Stonework {
  constructor(T, materials) {
    this.T = T;
    this.materials = materials;
    this.batches = new Map();
    this.colors = new Map();
  }
  tri(key, col, a, b, c) {
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2],
      vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const mag = Math.hypot(nx, ny, nz);
    if (mag < 0.000005) return;
    // Roof patches originate from both plan triangulation and hand-authored
    // pitches. Give snow rays a consistent upward face normal in either case.
    if ((key === 'roof' || key === 'lead') && ny < 0) {
      [b, c] = [c, b];
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    nx /= mag;
    ny /= mag;
    nz /= mag;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = { pos: [], normal: [], uv: [], color: [] };
      this.batches.set(key, batch);
    }
    let tint = this.colors.get(col);
    if (!tint) {
      tint = new this.T.Color(col);
      this.colors.set(col, tint);
    }
    let tx = -nz,
      tz = nx;
    const horiz = Math.hypot(tx, tz);
    if (horiz > 0.0001) {
      tx /= horiz;
      tz /= horiz;
    } else {
      tx = 1;
      tz = 0;
    }
    if (tx < -0.001 || (Math.abs(tx) < 0.001 && tz < 0)) {
      tx = -tx;
      tz = -tz;
    }
    for (const p of [a, b, c]) {
      const [x, y, z] = p;
      batch.pos.push(x, y, z);
      batch.normal.push(nx, ny, nz);
      batch.color.push(tint.r, tint.g, tint.b);
      if (key.startsWith('roof') || key === 'lead') {
        batch.uv.push((x * tx + z * tz) / 4.3, (horiz > 0.05 ? y / horiz : z) / 3.6);
      } else if (key === 'glass' || key === 'lamp') {
        batch.uv.push((x * tx + z * tz) / 2.05, y / 1.85);
      } else if (Math.abs(ny) > 0.975) batch.uv.push(x / 5, z / 3.5);
      else batch.uv.push((x * tx + z * tz) / 5.0, y / 3.5);
    }
  }
  quad(k, col, a, b, c, d) {
    this.tri(k, col, a, b, d);
    this.tri(k, col, b, c, d);
  }
  mappedQuad(key, color, points, coords) {
    const before = this.batches.get(key)?.uv.length || 0;
    this.quad(key, color, ...points);
    const buffer = this.batches.get(key)?.uv;
    if (!buffer || buffer.length !== before + 12) return;
    for (const [i, vertex] of [0, 1, 3, 1, 2, 3].entries()) {
      buffer[before + i * 2] = coords[vertex][0];
      buffer[before + i * 2 + 1] = coords[vertex][1];
    }
  }
  // Plan-ring caps, including interior courtyards; no triangulated lid crosses a hole.
  planTriangles(outer, holes = []) {
    const rings = [clean(outer), ...holes.map(clean)].filter((p) => p.length > 2);
    if (!rings.length) return [];
    const vec = rings.map((r) => r.map((p) => new this.T.Vector2(...p)));
    const index = this.T.ShapeUtils.triangulateShape(vec[0], vec.slice(1)),
      vertices = rings.flat();
    return index.map(([a, b, c]) => [vertices[a], vertices[b], vertices[c]]);
  }
  cap(k, col, p, y, holes = []) {
    for (const [a, b, c] of this.planTriangles(p, holes)) this.tri(k, col, atY(a, y), atY(c, y), atY(b, y));
  }
  prism(k, col, outer, y0, y1, holes = []) {
    for (const r of [outer, ...holes]) for (const f of faces(r)) this.panel(k, col, f, 0, f.l, y0, y1);
    this.cap(k, col, outer, y1, holes);
  }
  panel(k, col, f, x0, x1, y0, y1, d = 0) {
    this.quad(k, col, f.point(x0, y0, d), f.point(x1, y0, d), f.point(x1, y1, d), f.point(x0, y1, d));
  }
  block(k, col, f, x0, x1, y0, y1, d0, d1) {
    const a = f.point(x0, y0, d0),
      b = f.point(x1, y0, d0),
      c = f.point(x1, y1, d0),
      e = f.point(x0, y1, d0);
    const A = f.point(x0, y0, d1),
      B = f.point(x1, y0, d1),
      C = f.point(x1, y1, d1),
      E = f.point(x0, y1, d1);
    this.quad(k, col, A, B, C, E);
    this.quad(k, col, e, c, b, a);
    this.quad(k, col, E, C, c, e);
    this.quad(k, col, a, b, B, A);
    this.quad(k, col, a, A, E, e);
    this.quad(k, col, B, b, c, C);
  }
  frustum(k, col, p, y0, y1, r0, r1, sides = 8, angle = 0) {
    const lo = [],
      hi = [];
    for (let i = 0; i < sides; i++) {
      const a = angle + (i * 2 * Math.PI) / sides,
        x = Math.cos(a),
        z = Math.sin(a);
      lo.push([p[0] + r0 * x, y0, p[1] + r0 * z]);
      hi.push([p[0] + r1 * x, y1, p[1] + r1 * z]);
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      this.quad(k, col, lo[i], hi[i], hi[j], lo[j]);
      if (r1 > 0.003) this.tri(k, col, [p[0], y1, p[1]], hi[j], hi[i]);
    }
  }
  bar(k, col, a, b, r, n = 4) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      len = Math.hypot(dx, dy, dz);
    if (len < 0.0001) return;
    const t = [dx / len, dy / len, dz / len],
      h = Math.hypot(t[0], t[2]);
    const u = h > 0.001 ? [t[2] / h, 0, -t[0] / h] : [1, 0, 0],
      v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
    const A = [],
      B = [];
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * (i + 0.5)) / n,
        cs = Math.cos(ang) * r,
        sn = Math.sin(ang) * r;
      const off = u.map((d, j) => d * cs + v[j] * sn);
      A.push(a.map((d, j) => d + off[j]));
      B.push(b.map((d, j) => d + off[j]));
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.quad(k, col, A[i], A[j], B[j], B[i]);
    }
  }
  finish(parent, label) {
    const T = this.T,
      meshes = [];
    for (const [key, b] of this.batches) {
      const g = new T.BufferGeometry();
      for (const [a, data, size] of [
        ['position', b.pos, 3],
        ['normal', b.normal, 3],
        ['color', b.color, 3],
        ['uv', b.uv, 2],
      ])
        g.setAttribute(a, new T.Float32BufferAttribute(data, size));
      g.computeBoundingSphere();
      const m = new T.Mesh(g, this.materials[key]);
      m.name = label + ' / ' + key;
      m.userData.surfaceKind = key === 'roof' || key === 'lead' ? 'roof' : key;
      m.userData.snowReceiver = m.userData.surfaceKind === 'roof';
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      meshes.push(m);
    }
    this.batches.clear();
    return meshes;
  }
}
