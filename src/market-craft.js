import * as T from 'three';
import { atY, frame } from './magdalen/architecture/geometry.js';
import district from './data/districts.json';

function faceArt(draw, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  draw(c);
  const t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const notices = ['CUT FLOWERS', 'TODAY’S LOAF', 'ORCHARD FRUIT', 'OXFORD TEA'];
let priceTags, projecting;
function blackboard(i) {
  return faceArt(
    (c) => {
      c.fillStyle = '#364740';
      c.fillRect(0, 0, 224, 256);
      c.strokeStyle = '#b6ac85';
      c.lineWidth = 1;
      c.strokeRect(7, 8, 210, 239);
      c.fillStyle = '#d5cba2';
      c.textAlign = 'center';
      c.font = 'italic 22px Georgia';
      c.fillText('Covered Market', 112, 46);
      c.font = 'bold 20px Georgia';
      c.fillStyle = '#e4dfc5';
      c.fillText(notices[i], 112, 91, 192);
      c.beginPath();
      c.moveTo(35, 105);
      c.quadraticCurveTo(109, 109, 191, 104);
      c.stroke();
      const items = [
        ['Sweet peas', 'Seasonal stems', 'Small posies'],
        ['Sourdough', 'Rye & barley', 'Seeded rolls'],
        ['Apples & pears', 'English plums', 'Market baskets'],
        ['Breakfast tea', 'Earl Grey', 'Leaf tea'],
      ][i];
      c.font = 'italic 19px Georgia';
      items.forEach((v, j) => c.fillText(v, 112, 141 + j * 34));
    },
    224,
    256,
  );
}
function dial() {
  return faceArt(
    (c) => {
      c.translate(192, 192);
      c.fillStyle = '#e9ddba';
      c.beginPath();
      c.arc(0, 0, 187, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#4c5149';
      c.lineWidth = 7;
      c.stroke();
      for (let k = 0; k < 60; k++) {
        c.save();
        c.rotate((k * Math.PI) / 30);
        c.fillStyle = '#445049';
        c.fillRect(-1.5, -171, 3, k % 5 ? 5 : 12);
        c.restore();
      }
      c.fillStyle = '#414b44';
      c.font = '25px Georgia';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      numerals.forEach((n, k) =>
        c.fillText(n, 136 * Math.sin((k * Math.PI) / 6), -136 * Math.cos((k * Math.PI) / 6)),
      );
      c.font = 'italic 15px Georgia';
      c.fillText('Oxford', 0, 44);
      c.fillText('Covered Market', 0, 65);
    },
    384,
    384,
  );
}
function card(group, tex, w, h, p, y, yaw) {
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }));
  m.position.set(p[0], y, p[1]);
  m.rotation.y = yaw;
  group.add(m);
  return m;
}
export function shopJoinery(g, group, face, index, hue) {
  const edges = ['#b9ae8d', '#dbca9e', '#aab3a0', '#d9bba1'],
    pale = edges[index % 4];
  if (!priceTags) {
    priceTags = ['APPLES', 'SOURDOUGH', 'FRESH FLOWERS', 'OXFORD TEA'].map((label) =>
      faceArt(
        (c) => {
          c.fillStyle = '#efe4c4';
          c.fillRect(0, 0, 224, 96);
          c.fillStyle = '#485345';
          c.textAlign = 'center';
          c.font = 'italic 36px Georgia';
          c.fillText(label, 112, 55, 205);
          c.strokeStyle = '#a89c79';
          c.strokeRect(6, 7, 212, 81);
        },
        224,
        96,
      ),
    );
    projecting = ['FRUIT', 'BAKER', 'FLORIST', 'TEA'].map((name, i) =>
      faceArt(
        (c) => {
          const bg = ['#54745c', '#966d4d', '#9e6f70', '#5d7c82'][i];
          c.fillStyle = bg;
          c.fillRect(0, 0, 256, 208);
          c.strokeStyle = '#e5d6af';
          c.lineWidth = 3;
          c.strokeRect(8, 8, 240, 192);
          c.fillStyle = '#f4deb0';
          c.textAlign = 'center';
          c.font = 'bold 45px Georgia';
          c.fillText(name, 128, 153, 221);
          c.lineWidth = 5;
          c.strokeStyle = '#e5d6af';
          c.beginPath();
          c.ellipse(127, 84, 32, 23, i * 0.37, 0, Math.PI * 2);
          c.stroke();
          c.beginPath();
          c.moveTo(129, 62);
          c.quadraticCurveTo(140, 39, 160, 47);
          c.quadraticCurveTo(157, 58, 130, 63);
          c.stroke();
        },
        256,
        208,
      ),
    );
  }
  for (let i = 0; i < 4; i++) {
    const start = 0.12 + (i * (face.l - 0.24)) / 4,
      end = 0.12 + ((i + 1) * (face.l - 0.24)) / 4;
    // Raised paintwork casts a narrow shadow over a deliberately recessed panel.
    g.block('trim', hue, face, start + 0.06, end - 0.06, 0.27, 0.95, -0.06, 0.018);
    for (const x of [start + 0.08, end - 0.08])
      g.block('trim', pale, face, x - 0.018, x + 0.018, 0.34, 0.84, 0.019, 0.033);
    for (const y of [0.34, 0.84])
      g.block('trim', pale, face, start + 0.08, end - 0.08, y, y + 0.032, 0.019, 0.033);
    const u = 0.5 * (start + end);
    if (i % 2 === 0)
      card(group, priceTags[index % 4], 0.42, 0.18, face.plan(u, 0.11), 1.19, Math.atan2(face.nx, face.nz));
  }
  for (const y of [0.22, 0.98, 2.88, 3.2]) g.block('trim', pale, face, 0, face.l, y, y + 0.056, -0.07, 0.083);
  // Perpendicular, double-sided hanging signs remain readable looking down the aisle.
  const pos = face.l * 0.22;
  g.bar('ink', '#535f51', face.point(pos, 3.35, 0.04), face.point(pos, 3.35, 0.77), 0.034, 6);
  g.bar('ink', '#67715e', face.point(pos, 3.1, 0.04), face.point(pos, 3.35, 0.56), 0.025, 5);
  for (const d of [0.28, 0.64])
    g.bar('ink', '#565c4e', face.point(pos, 3.34, d), face.point(pos, 3.16, d), 0.017, 4);
  const p = face.plan(pos, 0.47),
    a = Math.atan2(face.ux, face.uz);
  for (const s of [-1, 1])
    card(
      group,
      projecting[index % 4],
      0.59,
      0.48,
      [p[0] + face.ux * 0.013 * s, p[1] + face.uz * 0.013 * s],
      2.94,
      a + (s < 0 ? Math.PI : 0),
    );
}
export function furnishAvenues(g, group, lanes, plan) {
  const angle = Math.atan2(plan(1, 0)[1] - plan(0, 0)[1], plan(1, 0)[0] - plan(0, 0)[0]),
    P = (u, v, h) => atY(plan(u, v), h);
  const boards = Array.from({ length: 4 }, (_, i) => blackboard(i));
  const kiosk = district.marketKiosk;
  const dir = [Math.cos(angle), Math.sin(angle)],
    depth = [-dir[1], dir[0]];
  const corner = (x, z) => [kiosk[0] + dir[0] * x + depth[0] * z, kiosk[1] + dir[1] * x + depth[1] * z];
  const outline = [corner(-0.48, -0.48), corner(0.48, -0.48), corner(0.48, 0.48), corner(-0.48, 0.48)];
  const red = '#a64d43',
    lightRed = '#bf6353';
  g.prism('fine', '#968e7f', outline, 0.015, 0.15);
  const telephone = faceArt(
    (c) => {
      c.fillStyle = '#e9ddbe';
      c.fillRect(0, 0, 256, 64);
      c.font = 'bold 31px Georgia';
      c.textAlign = 'center';
      c.fillStyle = '#383e35';
      c.fillText('TELEPHONE', 128, 44, 228);
    },
    256,
    64,
  );
  for (let k = 0; k < 4; k++) {
    const f = frame(outline[k], outline[(k + 1) % 4]);
    g.panel('glass', '#7f9490', f, 0.082, 0.875, 0.43, 2.16, -0.045);
    g.block('trim', red, f, 0, 0.96, 0.15, 0.46, -0.085, 0.035);
    for (const x of [0.045, 0.915]) g.block('trim', red, f, x - 0.055, x + 0.055, 0.13, 2.35, -0.07, 0.038);
    for (const x of [0.285, 0.683])
      g.block('trim', lightRed, f, x - 0.019, x + 0.019, 0.45, 2.05, -0.055, 0.015);
    for (let j = 0; j < 9; j++) {
      const y = 0.45 + j * 0.198;
      g.block('trim', red, f, 0.08, 0.88, y, y + 0.032, -0.054, 0.023);
    }
    g.block('trim', lightRed, f, 0, 0.96, 2.04, 2.39, -0.09, 0.08);
    const plaque = f.plan(0.48, 0.087);
    card(group, telephone, 0.7, 0.16, plaque, 2.21, Math.atan2(f.nx, f.nz));
    if (k === 2) g.bar('trim', '#bba77a', f.point(0.78, 0.96, 0.075), f.point(0.78, 1.1, 0.075), 0.019, 6);
  }
  g.frustum('trim', lightRed, kiosk, 2.37, 2.49, 0.72, 0.67, 4, 0.78 - angle);
  g.frustum('trim', red, kiosk, 2.49, 2.67, 0.67, 0.33, 4, 0.78 - angle);
  g.frustum('trim', '#b95448', kiosk, 2.67, 2.7, 0.33, 0.08, 4, 0.78 - angle);
  for (let k = 0; k < lanes.length; k++) {
    const lane = lanes[k];
    for (const [j, v] of [16.1, 34.3, 59.7].entries()) {
      if (v > lane.max - 4) continue;
      const side = k === 3 ? -1 : 1,
        x = lane.at(v) + side * 1.72;
      const f = frame(plan(x, v - 0.33), plan(x, v + 0.33), side > 0 ? 1 : -1);
      g.block('trim', '#927650', f, -0.04, 0.7, 0.18, 1.08, -0.04, 0.065);
      for (const t of [0, 0.66])
        g.bar('trim', '#927650', f.point(t, 0.07, -0.28), f.point(t, 1.08, 0.02), 0.036, 5);
      const p = f.plan(0.33, 0.074);
      card(group, boards[(k + j) % 4], 0.6, 0.82, p, 0.64, Math.atan2(f.nx, f.nz));
    }
    // The lane edges have drain covers and narrow runs of hard-wearing red setts.
    for (let v = 7.4; v < lane.max - 2; v += 3.2) {
      const next = Math.min(v + 3.16, lane.max - 1);
      for (const s of [-1, 1]) {
        const a = plan(lane.at(v) + s * 1.33, v),
          b = plan(lane.at(next) + s * 1.33, next),
          f = frame(a, b);
        g.block('brick', '#947d68', f, 0, f.l, 0.075, 0.092, -0.12, 0.12);
        if (Math.floor(v) % 3 === 1)
          for (let j = 0; j < 5; j++)
            g.block('ink', '#585f53', f, j * 0.055, j * 0.055 + 0.026, 0.093, 0.099, -0.088, 0.088);
      }
    }
    // Forged knee braces trace a curve between the posts and the truss.
    for (let v = 9; v < lane.max - 2; v += 7.2) {
      const x = lane.at(v);
      for (const s of [-1, 1]) {
        let prev = P(x + s * 2.26, v, 4.1);
        for (let j = 1; j <= 7; j++) {
          const t = j / 7,
            next = P(x + s * (2.26 - 1.03 * t * t), v, 4.1 + 1.03 * (1 - (1 - t) ** 2));
          g.bar('trim', '#52685e', prev, next, 0.054, 6);
          prev = next;
        }
        g.frustum('trim', '#a4a38c', plan(x + s * 2.27, v), 4.9, 5.03, 0.19, 0.16, 8);
      }
    }
  }
  const x = lanes[2].at(29.8),
    v = 29.8,
    pos = plan(x, v),
    yaw = -angle;
  g.bar('ink', '#596052', P(x, v, 4.77), P(x, v, 5.14), 0.036, 6);
  const holder = new T.Group();
  holder.position.set(pos[0], 4.23, pos[1]);
  holder.rotation.y = yaw;
  group.add(holder);
  const bezel = new T.Mesh(
    new T.CylinderGeometry(0.58, 0.58, 0.145, 48),
    new T.MeshLambertMaterial({ color: '#506659' }),
  );
  bezel.rotation.x = Math.PI / 2;
  holder.add(bezel);
  const face = dial(),
    hands = [];
  for (const s of [-1, 1]) {
    const sheet = card(holder, face, 1.085, 1.085, [0, s * 0.077], 0, s < 0 ? Math.PI : 0);
    // A circular alpha mask trims the transparent canvas corners.
    sheet.material.transparent = true;
    sheet.material.alphaTest = 0.35;
    const clock = new T.Group();
    clock.rotation.y = s < 0 ? Math.PI : 0;
    clock.position.z = s * 0.08;
    holder.add(clock);
    for (const [l, w] of [
      [0.244, 0.029],
      [0.39, 0.018],
    ]) {
      const rotor = new T.Group();
      clock.add(rotor);
      const hand = new T.Mesh(new T.BoxGeometry(w, l, 0.013), new T.MeshBasicMaterial({ color: '#3f4940' }));
      hand.position.set(0, l * 0.38, 0.01);
      rotor.add(hand);
      hands.push(rotor);
    }
  }
  // Diffuse local fill from the ridge glazing and the pendant over the crossing.
  const lights = [18, 39].map((v) => {
    const p = plan(lanes[2].at(v), v),
      l = new T.PointLight('#fbedd0', 24, 17, 1.65);
    l.position.set(p[0], 5.3, p[1]);
    group.add(l);
    return l;
  });
  return (hours, night) => {
    hands.forEach(
      (m, i) => (m.rotation.z = -(i % 2 ? (hours % 1) * Math.PI * 2 : ((hours % 12) * Math.PI) / 6)),
    );
    lights.forEach((l) => (l.intensity = 24 + night * 14));
  };
}
