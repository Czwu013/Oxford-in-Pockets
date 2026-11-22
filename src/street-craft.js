import * as T from 'three';
import { local, surface } from './palette.js';
import { atY, frame, seeded } from './magdalen/architecture/geometry.js';

// Meter-scaled swatches. Each stone has a worn upper edge, an irregular joint
// and an individual wash. Only the setts, flags and radial prison rubble use them.
function tile(kind, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d'),
    rand = seeded(seed);
  const setts = kind === 'setts',
    rock = kind === 'ragstone',
    brick = kind === 'brick';
  const rows = setts ? 22 : rock ? 17 : brick ? 28 : 7,
    h = 512 / rows;
  c.fillStyle = rock ? '#a69d84' : brick ? '#c1b6a4' : setts ? '#908b7e' : '#aaa492';
  c.fillRect(0, 0, 512, 512);
  for (let row = 0; row < rows; row++) {
    const columns = setts ? 14 : rock ? 11 : brick ? 11 : 6;
    const widths = Array.from({ length: columns }, () => 0.72 + rand() * 0.63);
    const scale = 512 / widths.reduce((a, b) => a + b, 0);
    let x = ((row % 2) * 512) / (2 * columns);
    for (const v of widths) {
      const w = v * scale,
        y = row * h,
        shade = Math.round((rock ? 201 : brick ? 218 : setts ? 216 : 226) + rand() * 23);
      const skew = rock ? 3 : 1.8,
        pts = [
          [1.2, 2],
          [w * 0.54, 1],
          [w - 2, 2],
          [w - 1.2, h - 3],
          [w * 0.62, h - 1.8],
          [2, h - 2],
        ].map(([a, b]) => [a + (rand() - 0.5) * skew, b + (rand() - 0.5) * skew]);
      for (const shift of [-512, 0]) {
        const left = x + shift;
        c.beginPath();
        pts.forEach(([a, b], i) => (i ? c.lineTo(left + a, y + b) : c.moveTo(left + a, y + b)));
        c.closePath();
        c.fillStyle = 'rgb(' + [shade + 3, shade, shade - 5].join(',') + ')';
        c.fill();
        c.beginPath();
        c.moveTo(left + 3, y + 3);
        c.lineTo(left + w * 0.52, y + 2.4);
        c.lineTo(left + w - 3, y + 3.5);
        c.strokeStyle = 'rgba(255,251,228,.63)';
        c.lineWidth = setts ? 1.4 : 1;
        c.stroke();
        c.fillStyle = 'rgba(111,100,75,.12)';
        c.fillRect(left + w * 0.35, y + h * 0.27, Math.min(8, w * 0.2), 1.3);
      }
      x += w;
    }
  }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
for (const [k, seed] of [
  ['setts', 23],
  ['flagstone', 41],
  ['ragstone', 6],
  ['brick', 57],
]) {
  local[k] = surface(k, {
    finish: k === 'setts' || k === 'flagstone' ? 'paving' : '',
    stone: k === 'ragstone',
  });
  local[k].map = tile(k, seed);
}
export function kerb(g, r, y = 0.1, color = '#b5a58c') {
  for (let i = 0; i < r.length; i++) {
    const a = r[i],
      b = r[(i + 1) % r.length],
      f = frame(a, b);
    if (f.l < 0.3) continue;
    const n = Math.ceil(f.l / 1.12);
    for (let j = 0; j < n; j++)
      g.block(
        'fine',
        j % 4 === 2 ? '#b9ae9b' : color,
        f,
        (j * f.l) / n + 0.012,
        ((j + 1) * f.l) / n - 0.012,
        y - 0.09,
        y,
        -0.1,
        0.1,
      );
  }
}
export function bench(g, p, angle) {
  const f = frame(
    [p[0] - Math.cos(angle), p[1] - Math.sin(angle)],
    [p[0] + Math.cos(angle), p[1] + Math.sin(angle)],
  );
  for (let j = 0; j < 4; j++)
    g.block('trim', '#947755', f, 0, 2, 0.43, 0.49, -0.24 + j * 0.123, -0.137 + j * 0.123);
  for (let j = 0; j < 3; j++)
    g.block('trim', '#a18a64', f, 0, 2, 0.61 + j * 0.145, 0.71 + j * 0.145, -0.3, -0.24);
  for (const x of [0.23, 1.77]) {
    g.bar('ink', '#525d51', f.point(x, 0.04, 0.21), f.point(x, 0.49, 0.13), 0.044, 6);
    g.bar('ink', '#525d51', f.point(x, 0.04, -0.25), f.point(x, 1, -0.31), 0.044, 6);
    g.bar('ink', '#525d51', f.point(x, 0.48, -0.28), f.point(x, 0.48, 0.25), 0.045, 6);
  }
}
export const lanternSites = [];
export function lantern(g, p, height = 3.8) {
  lanternSites.push([p[0], height - 0.3, p[1]]);
  g.frustum('ink', '#45564e', p, 0.06, 0.24, 0.25, 0.22, 8);
  g.frustum('ink', '#596158', p, 0.23, 0.77, 0.18, 0.103, 10);
  g.frustum('ink', '#48584f', p, 0.76, height - 0.58, 0.096, 0.062, 8);
  g.frustum('ink', '#5a675e', p, height - 0.62, height - 0.48, 0.21, 0.23, 4, 0.78);
  g.frustum('lamp', '#acb3a5', p, height - 0.48, height - 0.13, 0.19, 0.28, 4, 0.78);
  for (let i = 0; i < 4; i++) {
    const a = 0.78 + (i * Math.PI) / 2;
    g.bar(
      'ink',
      '#4c5951',
      [p[0] + 0.19 * Math.cos(a), height - 0.48, p[1] + 0.19 * Math.sin(a)],
      [p[0] + 0.28 * Math.cos(a), height - 0.13, p[1] + 0.28 * Math.sin(a)],
      0.027,
      5,
    );
  }
  g.frustum('ink', '#526056', p, height - 0.12, height + 0.1, 0.34, 0.07, 4, 0.78);
  g.frustum('trim', '#788171', p, height + 0.1, height + 0.24, 0.06, 0.017, 6);
}
export function drain(g, p, angle) {
  const u = [Math.cos(angle), Math.sin(angle)],
    f = frame(p, [p[0] + u[0], p[1] + u[1]]);
  g.block('ink', '#5e6155', f, -0.26, 0.26, 0.092, 0.099, -0.18, 0.18);
  for (let i = 0; i < 6; i++)
    g.block('trim', '#979181', f, -0.22 + i * 0.083, -0.19 + i * 0.083, 0.099, 0.106, -0.15, 0.15);
}
export function downpipe(g, f, u, h) {
  const ink = '#676d64';
  g.bar('trim', ink, f.point(u, 0.32, 0.2), f.point(u, h - 0.31, 0.2), 0.062, 7);
  g.bar('trim', ink, f.point(u, h - 0.31, 0.2), f.point(u, h, 0.41), 0.07, 7);
  for (let y = 1.1; y < h - 0.4; y += 2.65)
    g.block('ink', '#858575', f, u - 0.105, u + 0.105, y, y + 0.065, 0.09, 0.25);
}
export function fence(g, points, yAt, height = 0.96) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      count = Math.max(1, Math.ceil(length / 2.15));
    for (let j = 0; j < count; j++) {
      const at = (k) => a.map((v, d) => v + ((b[d] - v) * k) / count),
        p = at(j),
        q = at(j + 1),
        h = yAt(...p),
        end = yAt(...q);
      g.bar('ink', '#606657', atY(p, h), atY(p, h + height + 0.035), 0.032, 6);
      for (const off of [0.47, height]) g.bar('ink', '#6a6c5a', atY(p, h + off), atY(q, end + off), 0.026, 5);
    }
  }
}
