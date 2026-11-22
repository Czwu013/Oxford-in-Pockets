import { TAU, seeded, add, sub, scale, mix, linear, MeshDraft, tube, growthMaterial } from './geometry.js';
import { FoliageDraft, paintSpray, foliageMaterial } from './foliage.js';

const springColors = ['#96b678', '#a9bd77', '#b2c77f', '#9eb78f', '#b3c88a'];
const summerColors = ['#788f66', '#83976f', '#70927b', '#95a579', '#708866'];
const autumnColors = ['#c69a51', '#b78150', '#d4aa57', '#aea46c', '#b78859', '#bd9b77', '#cea65d', '#9a955f'];
const barkColors = ['#807b68', '#746e60', '#888273', '#84775f', '#797465'];
const pick = (list, random) => list[Math.floor(random() * list.length)];
const crownsBySite = new WeakMap();

// Leaf fall uses the coordinates of the brushes actually submitted to the
// renderer. Keeping the registry keyed by the site also supports two scenes.
export function getTreeCrowns(map) {
  return crownsBySite.get(map) || [];
}

function identify(hint, rand) {
  const name = String(hint || '').toLowerCase();
  if (name === 'holm oak') return 'holm oak';
  if (/pine|conifer|evergreen|spruce|cedar|yew|fir|常绿|针叶/.test(name)) return 'evergreen';
  if (/willow|salix|柳/.test(name)) return 'willow';
  if (/poplar|cypress|columnar|杨/.test(name)) return 'poplar';
  if (/flower|cherry|blossom|prunus|樱/.test(name)) return 'blossom';
  if (/plane|platan|悬铃木/.test(name)) return 'plane';
  if (/beech|fagus|山毛榉/.test(name)) return 'beech';
  if (/lime|tilia|椴/.test(name)) return 'lime';
  if (/oak|quercus|栎/.test(name)) return 'oak';
  if (/ash|fraxinus|梣/.test(name)) return 'ash';
  if (/deciduous|broad/.test(name)) return pick(['plane', 'lime', 'beech', 'oak', 'ash'], rand);
  return pick(['plane', 'plane', 'lime', 'beech', 'oak', 'ash', 'lime', 'oak', 'evergreen', 'blossom'], rand);
}

function pigments(T, species, random) {
  const colors = [
    pick(springColors, random),
    pick(summerColors, random),
    pick(autumnColors, random),
    '#a3a697',
  ];
  if (species === 'holm oak') {
    colors.splice(0, 4, '#82976d', '#677f5d', '#788663', '#697e6b');
  } else if (species === 'evergreen') {
    colors.splice(0, 4, '#829a80', '#708773', '#818b6d', '#748779');
  } else if (species === 'willow') {
    colors.splice(0, 4, '#b7c88f', '#9ba984', '#c2b671', '#a2a191');
  } else if (species === 'beech' && random() < 0.28) {
    colors.splice(0, 4, '#ab927c', '#897b72', '#a57d59', '#a3a697');
  }
  return colors.map((c) => linear(T, c));
}

function branchTree(T, drafts, tree, kind, ground, index, compact) {
  const rand = seeded(Math.round((tree.x + 400) * 411 + (tree.z + 300) * 733) ^ (index * 23191));
  const h = Math.max(2.9, Number(tree.height) || 8.2 + rand() * 8.5);
  const r = Math.max(
    1.05,
    Number(tree.radius) || h * (kind === 'poplar' ? 0.21 : kind === 'evergreen' ? 0.28 : 0.37),
  );
  const base = [tree.x, ground, tree.z],
    wind = rand() * TAU;
  const bark = linear(T, pick(barkColors, rand)),
    twig = linear(T, kind === 'willow' ? '#9c8c68' : '#777966');
  const paints = pigments(T, kind, rand);
  const pos = (dx, y, dz) => [base[0] + dx, base[1] + y, base[2] + dz];
  const width = h * (kind === 'holm oak' ? 0.066 : kind === 'plane' ? 0.031 : 0.024) * (1 + rand() * 0.33);
  const spine = (t) =>
    pos(
      r * 0.19 * (t * t * Math.cos(wind) + 0.3 * Math.sin(4 * t + wind) * t),
      h * t,
      r * 0.17 * (t * t * Math.sin(wind) + 0.4 * Math.cos(5 * t + wind) * t),
    );
  const ends = [0, 0.12, 0.34, 0.54, 0.73, 0.91];
  for (let i = 1; i < ends.length; i++) {
    const a = ends[i - 1],
      b = ends[i],
      aWidth = width * Math.pow(1.015 - a, 1.3) * (i === 1 ? 1.65 : 1);
    tube(drafts.wood, spine(a), spine(b), aWidth, width * Math.pow(1.015 - b, 1.3), bark, 7, wind);
  }
  // Buttress flare joins the trunk to the soil. It remains visible in winter.
  for (let k = 0; k < 3; k++) {
    const a = wind + (TAU * k) / 3;
    tube(
      drafts.wood,
      pos(Math.cos(a) * width * 2.2, 0.02, Math.sin(a) * width * 2.2),
      spine(0.09),
      width * 0.3,
      width * 0.58,
      bark,
      4,
      a,
    );
  }
  const evergreen = kind === 'evergreen',
    willow = kind === 'willow';
  const specimen = {
    id: index,
    x: tree.x,
    z: tree.z,
    ground,
    height: h,
    radius: r,
    kind,
    evergreen: evergreen || kind === 'holm oak',
    sprays: [],
  };
  drafts.specimens.push(specimen);
  const branchCount = evergreen ? (compact ? 16 : 19) : compact ? 8 : 10;
  const addCrown = (c, sizes, a, shade) => {
    let pal = paints.map((col) => scale(col, shade));
    if (kind === 'blossom' && rand() < 0.75)
      pal[0] = scale(linear(T, pick(['#dfbcb8', '#edd8d4', '#f1e5d2'], rand)), shade);
    const growth = specimen.evergreen
      ? [0.97, 1, 0.98, 0.94]
      : [0.49 + rand() * 0.25, 1, 0.75 + rand() * 0.19, 0];
    specimen.sprays.push({ center: c.slice(), size: sizes.slice(), autumnGrowth: growth[2] });
    paintSpray(drafts.canopy, c, sizes, pal, growth, rand, kind);
  };
  const pencil = linear(T, willow ? '#91896e' : '#807960');
  const stroke = (a, b, fade) => {
    drafts.twigPosition.push(...a, ...b);
    const color = scale(pencil, fade);
    drafts.twigColor.push(...color, ...color);
  };
  // Fine forks are drawn at a stroke width of one screen pixel. Their world
  // geometry branches out from the same limb that carries the summer spray.
  function twigs(start, angle, len, rise, levels) {
    const dest = [start[0] + Math.cos(angle) * len, start[1] + rise, start[2] + Math.sin(angle) * len];
    const bend = mix(start, dest, 0.57),
      jitter = len * 0.12 * (rand() - 0.5);
    bend[0] += -Math.sin(angle) * jitter;
    bend[1] += rise * 0.12;
    bend[2] += Math.cos(angle) * jitter;
    stroke(start, bend, 1.0);
    stroke(bend, dest, 1.1);
    if (levels) {
      twigs(
        dest,
        angle - 0.43 - rand() * 0.52,
        len * (0.5 + 0.12 * rand()),
        rise * 0.59 + (willow ? -0.06 : 0.05),
        levels - 1,
      );
      twigs(
        bend,
        angle + 0.52 + rand() * 0.55,
        len * (0.57 + 0.14 * rand()),
        rise * 0.75 + (willow ? -0.05 : 0.08),
        levels - 1,
      );
    }
  }
  for (let i = 0; i < branchCount; i++) {
    const t = (i + 0.37) / branchCount,
      a = wind + i * 2.39996 + (rand() - 0.5) * 0.41;
    const root = spine(evergreen ? 0.19 + 0.66 * t : 0.24 + 0.42 * t);
    const column = kind === 'poplar' ? 0.83 - 0.18 * t : 1;
    const w = evergreen
      ? r * (1.0 - 0.73 * t)
      : r * column * (0.65 + 0.17 * Math.sin(t * Math.PI) + 0.13 * rand());
    const y = evergreen
      ? h * (0.25 + 0.62 * t)
      : h * (0.49 + 0.3 * t + 0.08 * rand() + (kind === 'poplar' ? 0.045 : 0));
    const tip = pos(w * Math.cos(a), y, w * Math.sin(a)),
      fork = mix(root, tip, 0.57);
    fork[0] += r * 0.075 * Math.sin(a);
    fork[2] -= r * 0.075 * Math.cos(a);
    fork[1] += h * (willow ? 0.065 : -0.025);
    tube(
      drafts.wood,
      root,
      fork,
      width * (evergreen ? 0.27 : 0.47) * (1.12 - 0.39 * t),
      width * 0.2,
      bark,
      5,
      a,
    );
    tube(drafts.wood, fork, tip, width * 0.22, width * 0.086, bark, 5, a);
    const lobesize = evergreen ? r * (0.34 - 0.18 * t) : r * (0.32 + 0.1 * rand());
    const lobeh = evergreen ? h * (0.074 - 0.025 * t) : h * (willow ? 0.146 : 0.108 + 0.044 * rand());
    for (let side = -1; side <= 1; side += 2) {
      const b = a + side * (0.76 + rand() * 0.3),
        arm = lobesize * (0.69 + rand() * 0.3);
      const end = [
        tip[0] + Math.cos(b) * arm,
        tip[1] + h * (willow ? -0.06 : 0.049 + 0.025 * rand()),
        tip[2] + Math.sin(b) * arm,
      ];
      const joint = mix(tip, end, 0.5);
      joint[1] += h * 0.021;
      tube(drafts.wood, tip, joint, width * 0.092, width * 0.061, bark, 4, a);
      tube(drafts.wood, joint, end, width * 0.066, width * 0.021, twig, 4, b);
      if (!evergreen) {
        for (let ray = 0; ray < (compact ? 2 : 3); ray++) {
          const angle = b + (ray - 1) * 0.63 + rand() * 0.45,
            src = mix(joint, end, 0.27 + ray * 0.22);
          const twigEnd = [
            src[0] + Math.cos(angle) * lobesize * 0.49,
            src[1] + h * (willow ? -0.085 : 0.049 + 0.035 * rand()),
            src[2] + Math.sin(angle) * lobesize * 0.49,
          ];
          tube(drafts.wood, src, twigEnd, Math.max(0.023, width * 0.066), 0.01, twig, 3, angle);
          const bud = mix(src, twigEnd, 0.59),
            short = [
              bud[0] + Math.cos(angle + side) * lobesize * 0.23,
              bud[1] + h * (willow ? -0.043 : 0.044),
              bud[2] + Math.sin(angle + side) * lobesize * 0.23,
            ];
          tube(drafts.wood, bud, short, width * 0.038, 0.007, twig, 3, angle);
          twigs(twigEnd, angle + side * 0.34, lobesize * 0.39, h * (willow ? -0.052 : 0.044), 2);
          twigs(short, angle + side * 0.77, lobesize * 0.36, h * (willow ? -0.052 : 0.042), 1);
        }
      }
      if (side === 1 || !evergreen) {
        const crown = mix(tip, end, evergreen ? 0.15 : 0.38);
        crown[1] += evergreen ? 0 : lobeh * 0.2;
        addCrown(
          crown,
          [
            lobesize * (evergreen ? 1.32 : 1.43),
            lobeh * (evergreen ? 1.31 : 1.63),
            lobesize * (evergreen ? 1.19 : 1.35),
          ],
          b,
          0.89 + 0.15 * t + rand() * 0.12,
        );
      }
    }
    if (i % 3 === 0) {
      const middle = mix(fork, tip, 0.42);
      middle[1] += lobeh * 0.5;
      addCrown(middle, [lobesize * 1.65, lobeh * 1.57, lobesize * 1.43], a, 0.83 + 0.11 * t);
      const twigBase = mix(root, fork, 0.48);
      if (!evergreen) twigs(twigBase, a + 1.12, lobesize * 0.69, h * 0.115, 2);
    }
  }
  for (let i = 0; i < 3; i++) {
    const a = wind + (i * TAU) / 3,
      c = spine(0.83 + i * 0.016);
    c[0] += r * 0.2 * Math.cos(a);
    c[2] += r * 0.2 * Math.sin(a);
    addCrown(
      c,
      [r * (evergreen ? 0.34 : 0.52), h * (evergreen ? 0.17 : 0.16), r * (evergreen ? 0.31 : 0.46)],
      a,
      1 + 0.06 * rand(),
    );
    if (!evergreen) twigs(spine(0.78 + i * 0.021), a, r * 0.34, h * 0.09, 2);
  }
}

function meadow(T, d, datum, groundAt, index) {
  const { x, z } = datum;
  const random = seeded((Math.round(x * 129 + z * 761) ^ (index * 317)) >>> 0);
  const kind = String(datum.kind || 'meadow').toLowerCase();
  const radius = Math.max(0.55, Number(datum.radius) || 2.1);
  const leafOnly = /leav|litter|autumn|corner/.test(kind);
  const bank = /bank|reed|sedge|shore/.test(kind);
  const bed = /bed|border/.test(kind);
  const border = kind === 'wall border';
  const baseY = (x, z) => (Number.isFinite(datum.y) ? datum.y : groundAt(x, z));
  const grassPalette = (
    border ? ['#889978', '#72846a', '#aaa079', '#999786'] : ['#a4b375', '#89986a', '#ae9e6b', '#a29d87']
  ).map((c) => linear(T, c));
  const leafPalette = ['#b6ae83', '#969b78', pick(['#bb8e52', '#a77c48', '#be9e68'], random), '#a49a81'].map(
    (c) => linear(T, c),
  );
  const blossomPalette = [
    pick(['#e3dac0', '#b397b1', '#ead99c', '#b792ac'], random),
    border ? pick(['#a28db1', '#bd8790', '#bdab80', '#cebaa9'], random) : bed ? '#d6c5aa' : '#d3c8a1',
    '#a6a887',
    '#aaa48b',
  ].map((c) => linear(T, c));
  const scatter = leafOnly
    ? Math.min(32, Math.ceil(radius * 6.5))
    : Math.min(64, Math.ceil(radius * (bed ? 12 : 7)));
  for (let i = 0; i < scatter; i++) {
    const angle = random() * TAU,
      spread = radius * Math.sqrt(random()),
      px = x + Math.cos(angle) * spread,
      pz = z + Math.sin(angle) * spread;
    const y = baseY(px, pz) + 0.042,
      anchor = [px, y, pz];
    if (leafOnly) {
      for (let k = 0; k < 7; k++) {
        const a = random() * TAU,
          lx = px + (random() - 0.5) * 0.92,
          lz = pz + (random() - 0.5) * 0.79;
        const l = 0.1 + random() * 0.18,
          ww = 0.045 + random() * 0.06,
          v = [Math.cos(a) * l, 0, Math.sin(a) * l],
          side = [-Math.sin(a) * ww, 0, Math.cos(a) * ww];
        const o = [lx, y + 0.015 + random() * 0.026, lz],
          n = [0, 1, 0],
          s = { center: o, growth: [0.0, 0.0, 1, 0.24], palette: leafPalette },
          st = d.position.length / 3;
        const middle = add(o, [0, 0.025, 0]);
        const tint = 0.77 + random() * 0.36;
        for (const p of [sub(o, v), add(middle, side), add(o, v), sub(middle, side)])
          d.point(p, n, s.palette[0], 0, 0, s, tint);
        d.tri.push(st, st + 1, st + 2, st, st + 2, st + 3);
      }
      continue;
    }
    const reach = border
      ? datum.stature * (0.76 + random() * 0.46)
      : bank
        ? 0.96 + random() * 0.91
        : bed
          ? 0.45 + random() * 0.4
          : 0.17 + random() * 0.3;
    const grass = {
      center: anchor,
      growth: [bank ? 0.79 : 0.89, 1, bank ? 0.94 : 0.69, bank ? 0.53 : 0.23],
      palette: grassPalette,
    };
    for (let k = 0; k < (bank ? 8 : 5); k++) {
      const a = random() * TAU,
        l = reach * (0.48 + random() * 0.65),
        w = border ? 0.095 + 0.08 * random() : bank ? 0.035 + 0.026 * random() : 0.032 + 0.04 * random();
      const spread = 0.13 + random() * 0.36,
        n = [Math.cos(a) * 0.43, 0.83, Math.sin(a) * 0.43],
        side = [-Math.sin(a) * w, 0, Math.cos(a) * w];
      const bend = [Math.cos(a) * l * spread, 0.62 * l, Math.sin(a) * l * spread],
        end = [Math.cos(a) * l * (spread + 0.23), l, Math.sin(a) * l * (spread + 0.23)];
      const mid = add(anchor, bend),
        top = add(anchor, end),
        st = d.position.length / 3;
      for (const p of [
        sub(anchor, side),
        add(anchor, side),
        sub(mid, scale(side, 0.81)),
        add(mid, scale(side, 0.81)),
        top,
      ])
        d.point(p, n, grass.palette[0], 0, 0, grass, 0.82 + random() * 0.21);
      d.tri.push(st, st + 1, st + 2, st + 2, st + 1, st + 3, st + 2, st + 3, st + 4);
    }
    if (!bank && random() < (bed ? 0.88 : 0.72)) {
      const head = [px, y + reach * 0.76, pz],
        seasonal = { center: anchor, growth: [1, bed ? 0.83 : 0.3, 0.05, 0], palette: blossomPalette };
      const width = bed ? 0.13 : 0.095;
      for (let k = 0; k < 5; k++) {
        const a = (TAU * k) / 5 + angle,
          r = width * (0.75 + 0.45 * random()),
          mid = [px + Math.cos(a) * r, y + reach * 0.76 + 0.046, pz + Math.sin(a) * r];
        const s = [-Math.sin(a) * width * 0.47, 0, Math.cos(a) * width * 0.47],
          tip = add(mid, [Math.cos(a) * r * 0.45, 0.022, Math.sin(a) * r * 0.45]),
          q = d.position.length / 3;
        for (const p of [head, add(mid, s), tip, sub(mid, s)])
          d.point(p, [0, 1, 0], seasonal.palette[0], 0, 0, seasonal);
        d.tri.push(q, q + 1, q + 2, q, q + 2, q + 3);
      }
    }
  }
}

export function plantSite(T, scene, map) {
  const group = new T.Group();
  group.name = 'Mapped trees and herbaceous planting';
  scene.add(group);
  const treeData = map.trees || [],
    flora = map.flora || [];
  const compact = treeData.length > 115;
  const at = (x, z) => Number(map.heightAt?.(x, z)) || 0;
  const drafts = {
    wood: new MeshDraft(),
    canopy: new FoliageDraft(),
    ground: new MeshDraft(true),
    twigPosition: [],
    twigColor: [],
    specimens: [],
  };
  const stats = { trees: treeData.length, evergreen: 0, deciduous: 0, plantPatches: flora.length };
  treeData.forEach((tree, i) => {
    const rand = seeded(Math.round((tree.x + 199) * 343 + (tree.z + 88) * 838));
    const kind = identify(tree.kind, rand);
    stats[kind === 'evergreen' || kind === 'holm oak' ? 'evergreen' : 'deciduous']++;
    branchTree(T, drafts, tree, kind, Number.isFinite(tree.y) ? tree.y : at(tree.x, tree.z), i, compact);
  });
  crownsBySite.set(map, drafts.specimens);
  flora.forEach((f, i) => meadow(T, drafts.ground, f, at, i));
  const uniforms = { season: { value: new T.Vector4(1, 0, 0, 0) }, snow: { value: 0 } };
  const paint = (name, draft, material, depth, cast, receive = true) => {
    if (!draft.tri.length) return;
    const mesh = new T.Mesh(draft.geometry(T), material);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (depth) mesh.customDepthMaterial = depth;
    group.add(mesh);
  };
  paint(
    'Pencilled trunks and winter tracery',
    drafts.wood,
    new T.MeshLambertMaterial({ vertexColors: true }),
    null,
    true,
  );
  const ink = new T.BufferGeometry();
  ink.setAttribute('position', new T.Float32BufferAttribute(drafts.twigPosition, 3));
  ink.setAttribute('color', new T.Float32BufferAttribute(drafts.twigColor, 3));
  const twigs = new T.LineSegments(
    ink,
    new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.49, depthWrite: false }),
  );
  twigs.name = 'Winter pencil tracery';
  group.add(twigs);
  const leaves = foliageMaterial(T, uniforms);
  // Each clump has a convex, directionally lit normal field. Its shadow-facing
  // and eye-facing skins intersect inside the clump, so it casts onto solid
  // ground and architecture without sampling that intersection on itself.
  paint(
    'Seasonal leaf washes and porous outer sprays',
    drafts.canopy,
    leaves.material,
    leaves.depth,
    true,
    false,
  );
  const herb = growthMaterial(T, uniforms, { side: T.DoubleSide });
  paint('Underplanting, wildflowers, reeds and windrows', drafts.ground, herb.material, herb.depth, false);
  return {
    update(sim) {
      const [spring, summer, autumn, winter] = sim.weights;
      uniforms.season.value.fromArray(sim.weights);
      uniforms.snow.value = sim.snow || 0;
      twigs.material.opacity = 0.27 * spring + 0.09 * summer + 0.24 * autumn + 0.58 * winter;
    },
    stats,
  };
}
