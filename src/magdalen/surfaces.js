import * as T from 'three';

// A vertical intersection with the actual, static meshes. Birds and leaves use the
// exact triangles; weather uses a finer-than-one-metre raster of the same upper surface.
export const surfaceKinds = [
  'outside',
  'water',
  'ground',
  'lawn',
  'path',
  'road',
  'roof',
  'stone',
  'bridge',
];
const groundNames = {
  'Mown college lawns': 'lawn',
  Meadow: 'lawn',
  'Grass verge': 'lawn',
  'Garden borders': 'ground',
  'Sedge bank': 'ground',
  'Silt at water level': 'ground',
  'Court flagstones': 'path',
  'Path aggregate': 'path',
  'Yorkstone pavement': 'path',
  'High Street asphalt': 'road',
};
function classify(mesh) {
  const name = mesh.name,
    parent = mesh.parent?.name,
    mat = mesh.material.name;
  if (name === 'River Cherwell / Holywell Mill Stream') return 'water';
  if (parent === 'Ground and gardens') return groundNames[mat] || 'ground';
  if (parent === 'Landscape details' && mat === 'River retaining wall') return 'stone';
  if (parent === 'Magdalen Bridge') {
    if (mat === 'Bridge deck') return 'road';
    if (mat === 'Bridge paving' || mat === 'Footbridge deck') return 'bridge';
    if (/lantern|paint|iron|marking|kerb line/i.test(mat)) return null;
    return 'stone';
  }
  if (name.startsWith('College fabric /') || name.startsWith('Great Tower /')) {
    return mesh.userData.surfaceKind === 'roof' || /\/ (roof|lead)$/.test(name) ? 'roof' : 'stone';
  }
  return null;
}

export function indexSurfaces(scene, boundary) {
  const step = 0.82,
    bin = 7,
    stride = 0x200000;
  const xs = boundary.outer.map((p) => p[0]),
    zs = boundary.outer.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)) - 2,
    z0 = Math.floor(Math.min(...zs)) - 2;
  const width = Math.ceil((Math.max(...xs) + 2 - x0) / step);
  const height = Math.ceil((Math.max(...zs) + 2 - z0) / step);
  const heights = new Float32Array(width * height).fill(-12);
  const kinds = new Uint8Array(heights.length),
    slopes = new Uint8Array(heights.length);
  const binW = Math.ceil((width * step) / bin),
    binH = Math.ceil((height * step) / bin);
  const buckets = Array.from({ length: binW * binH }, () => []);
  const refs = [],
    materials = new Map(),
    identity = new T.Matrix4();
  scene.updateMatrixWorld(true);
  scene.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry?.attributes.position || Array.isArray(mesh.material)) return;
    const kind = classify(mesh);
    if (!kind) return;
    const kindId = surfaceKinds.indexOf(kind);
    const geom = mesh.geometry,
      index = geom.index?.array;
    const positions = mesh.matrixWorld.equals(identity)
      ? geom.attributes.position.array
      : geom.attributes.position.clone().applyMatrix4(mesh.matrixWorld).array;
    const meshCode = refs.length * stride;
    refs.push({ positions, index, kind });
    if (kind !== 'water' && !/\/ ([\w-]*glass|ink|lamp|gold|bronze)$/.test(mesh.name))
      materials.set(mesh.material, kind);
    const count = index ? index.length : positions.length / 3;
    for (let k = 0; k < count; k += 3) {
      const ia = (index ? index[k] : k) * 3,
        ib = (index ? index[k + 1] : k + 1) * 3;
      const ic = (index ? index[k + 2] : k + 2) * 3;
      const ax = positions[ia],
        az = positions[ia + 2],
        ay = positions[ia + 1];
      const bx = positions[ib] - ax,
        bz = positions[ib + 2] - az,
        by = positions[ib + 1] - ay;
      const cx = positions[ic] - ax,
        cz = positions[ic + 2] - az,
        cy = positions[ic + 1] - ay;
      const det = bx * cz - bz * cx;
      if (Math.abs(det) < 0.000008) continue;
      const minX = ax + Math.min(0, bx, cx) - x0,
        maxX = ax + Math.max(0, bx, cx) - x0;
      const minZ = az + Math.min(0, bz, cz) - z0,
        maxZ = az + Math.max(0, bz, cz) - z0;
      const code = meshCode + k / 3;
      for (
        let j = Math.max(0, Math.floor(minZ / bin));
        j <= Math.min(binH - 1, Math.floor(maxZ / bin));
        j++
      )
        for (
          let i = Math.max(0, Math.floor(minX / bin));
          i <= Math.min(binW - 1, Math.floor(maxX / bin));
          i++
        )
          buckets[j * binW + i].push(code);
      const gx = (by * cz - cy * bz) / det,
        gz = (cy * bx - by * cx) / det;
      const slope = Math.round(255 / Math.hypot(1, gx, gz));
      const i0 = Math.max(0, Math.ceil(minX / step - 0.5)),
        i1 = Math.min(width - 1, Math.floor(maxX / step - 0.5));
      const j0 = Math.max(0, Math.ceil(minZ / step - 0.5)),
        j1 = Math.min(height - 1, Math.floor(maxZ / step - 0.5));
      for (let j = j0; j <= j1; j++) {
        const dz = z0 + (j + 0.5) * step - az;
        for (let i = i0; i <= i1; i++) {
          const dx = x0 + (i + 0.5) * step - ax;
          const u = (dx * cz - dz * cx) / det,
            v = (bx * dz - bz * dx) / det;
          if (u < -0.00001 || v < -0.00001 || u + v > 1.00001) continue;
          const n = j * width + i,
            y = ay + dx * gx + dz * gz;
          if (y >= heights[n] - 0.00001) {
            heights[n] = y;
            kinds[n] = kindId;
            slopes[n] = slope;
          }
        }
      }
    }
  });
  function sample(x, z) {
    const i = Math.floor((x - x0) / bin),
      j = Math.floor((z - z0) / bin);
    let y = -12,
      kind = 'outside',
      normalY = 1;
    if (i < 0 || j < 0 || i >= binW || j >= binH) return { y, kind, normalY };
    for (const code of buckets[j * binW + i]) {
      const m = Math.floor(code / stride),
        k = (code - m * stride) * 3;
      const { positions: p, index } = refs[m];
      const a = (index ? index[k] : k) * 3,
        b = (index ? index[k + 1] : k + 1) * 3,
        c = (index ? index[k + 2] : k + 2) * 3;
      const bx = p[b] - p[a],
        bz = p[b + 2] - p[a + 2],
        cx = p[c] - p[a],
        cz = p[c + 2] - p[a + 2];
      const dx = x - p[a],
        dz = z - p[a + 2],
        det = bx * cz - bz * cx;
      const u = (dx * cz - dz * cx) / det,
        v = (bx * dz - bz * dx) / det;
      if (u < -0.00001 || v < -0.00001 || u + v > 1.00001) continue;
      const by = p[b + 1] - p[a + 1],
        cy = p[c + 1] - p[a + 1],
        yy = p[a + 1] + u * by + v * cy;
      if (yy < y - 0.00001) continue;
      y = yy;
      kind = refs[m].kind;
      normalY = 1 / Math.hypot(1, (by * cz - cy * bz) / det, (cy * bx - by * cx) / det);
    }
    return { y, kind, normalY };
  }

  // Conservative vertical support for the swept width of a small object.
  // Reject disjoint triangles on both rectangle axes and all three edge normals.
  // Bounding the remaining plane over the rectangle also works on a sloping bank.
  function maxHeightInRect(minX, minZ, maxX, maxZ) {
    const firstI = Math.max(0, Math.floor((minX - x0) / bin)),
      lastI = Math.min(binW - 1, Math.floor((maxX - x0) / bin));
    const firstJ = Math.max(0, Math.floor((minZ - z0) / bin)),
      lastJ = Math.min(binH - 1, Math.floor((maxZ - z0) / bin));
    const midX = (minX + maxX) * 0.5,
      midZ = (minZ + maxZ) * 0.5,
      halfX = (maxX - minX) * 0.5,
      halfZ = (maxZ - minZ) * 0.5;
    let highest = -12;
    function outsideEdge(ax, az, dx, dz, sign) {
      return (
        sign * (dx * (midZ - az) - dz * (midX - ax)) + Math.abs(dx) * halfZ + Math.abs(dz) * halfX <
        -0.00001
      );
    }
    for (let j = firstJ; j <= lastJ; j++)
      for (let i = firstI; i <= lastI; i++) {
        for (const code of buckets[j * binW + i]) {
          const m = Math.floor(code / stride),
            k = (code - m * stride) * 3;
          const { positions: p, index } = refs[m];
          const a = (index ? index[k] : k) * 3,
            b = (index ? index[k + 1] : k + 1) * 3,
            c = (index ? index[k + 2] : k + 2) * 3;
          const ay = p[a + 1],
            by = p[b + 1],
            cy = p[c + 1],
            peak = Math.max(ay, by, cy);
          if (peak <= highest) continue;
          const ax = p[a],
            az = p[a + 2],
            bx = p[b],
            bz = p[b + 2],
            cx = p[c],
            cz = p[c + 2];
          if (
            Math.max(ax, bx, cx) < minX ||
            Math.min(ax, bx, cx) > maxX ||
            Math.max(az, bz, cz) < minZ ||
            Math.min(az, bz, cz) > maxZ
          )
            continue;
          const ux = bx - ax,
            uz = bz - az,
            vx = cx - ax,
            vz = cz - az,
            det = ux * vz - uz * vx,
            sign = Math.sign(det);
          if (
            outsideEdge(ax, az, ux, uz, sign) ||
            outsideEdge(bx, bz, cx - bx, cz - bz, sign) ||
            outsideEdge(cx, cz, -vx, -vz, sign)
          )
            continue;
          const gx = ((by - ay) * vz - (cy - ay) * uz) / det,
            gz = ((cy - ay) * ux - (by - ay) * vx) / det;
          const ceiling =
            ay + gx * (midX - ax) + gz * (midZ - az) + Math.abs(gx) * halfX + Math.abs(gz) * halfZ;
          highest = Math.max(highest, Math.min(peak, ceiling));
        }
      }
    return highest;
  }
  function cellAt(x, z) {
    const i = Math.floor((x - x0) / step),
      j = Math.floor((z - z0) / step);
    return i >= 0 && j >= 0 && i < width && j < height ? j * width + i : -1;
  }
  return {
    sample,
    maxHeightInRect,
    cellAt,
    materials,
    heights,
    kinds,
    slopes,
    width,
    height,
    x0,
    z0,
    step,
  };
}
