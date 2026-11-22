import { seeded } from './geometry.js';

function paperTile(T, kind, seed) {
  const r = seeded(seed),
    size = 384,
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3efe5';
  ctx.fillRect(0, 0, size, size);
  const slate = kind === 'slate',
    glass = kind === 'leadlight',
    rub = kind === 'rubble',
    fine = kind === 'fine';
  if (glass) {
    ctx.fillStyle = '#b7c3c6';
    ctx.fillRect(0, 0, size, size);
    const step = 16;
    for (let j = -1; j < 25; j++)
      for (let i = -1; i < 25; i++) {
        const x = (i * 2 + (j % 2)) * step,
          y = j * step;
        ctx.beginPath();
        ctx.moveTo(x, y - step);
        ctx.lineTo(x + step, y);
        ctx.lineTo(x, y + step);
        ctx.lineTo(x - step, y);
        ctx.closePath();
        const h = ['#8e9d9c', '#a8b9bd', '#adb7bb', '#bcc3bc', '#c6bb9e', '#98a6b5', '#a8abb9'][
          Math.floor(r() * 7)
        ];
        ctx.fillStyle = h;
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = 'rgba(49,62,65,.66)';
        ctx.stroke();
      }
  } else {
    const rows = slate ? 19 : rub ? 12 : fine ? 11 : 10,
      rowH = size / rows;
    for (let j = 0; j < rows; j++) {
      let x = -70 - r() * 70;
      const y = j * rowH,
        h = rowH;
      while (x < size) {
        const width = slate ? 20 + r() * 11 : rub ? 24 + r() * 58 : 43 + r() * 65,
          v = slate ? 201 + r() * 42 : rub ? 219 + r() * 31 : 231 + r() * 21,
          warm = slate ? 0 : r() * 6;
        ctx.fillStyle = 'rgb(' + [v + warm, v + warm * 0.32, v - warm * 0.95].map(Math.round).join(',') + ')';
        ctx.fillRect(x, y, width + 1, h + 0.8);
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.13);
        ctx.lineTo(x + 0.25 + r(), y + h - 0.9);
        ctx.lineTo(x + width * 0.53, y + h - 1.1 + r());
        ctx.lineTo(x + width, y + h - 0.7);
        ctx.strokeStyle = slate ? 'rgba(40,48,53,.32)' : rub ? 'rgba(76,67,53,.25)' : 'rgba(91,82,66,.21)';
        ctx.lineWidth = slate ? 1.25 : rub ? 1.4 : 0.87;
        ctx.stroke();
        if (r() < 0.81) {
          ctx.beginPath();
          ctx.moveTo(x + 1.4, y + h - 2.1);
          ctx.lineTo(x + width * (0.24 + r() * 0.72), y + h - 2.3);
          ctx.strokeStyle = 'rgba(255,252,233,.52)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        if (r() < 0.25) {
          ctx.beginPath();
          ctx.moveTo(x + width * 0.13, y + h * 0.2);
          ctx.lineTo(x + width * 0.24, y + h * 0.39);
          ctx.lineTo(x + width * 0.31, y + h * 0.36);
          ctx.strokeStyle = 'rgba(100,91,76,.13)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (r() < 0.25) {
          const xx = x + r() * width * 0.54,
            yy = y + h * (0.37 + r() * 0.44);
          for (let q = 0; q < 3 + r() * 4; q++) {
            ctx.beginPath();
            ctx.moveTo(xx + q * 2.5, yy);
            ctx.lineTo(xx + q * 2.5 + 3.4, yy - 4.2);
            ctx.strokeStyle = 'rgba(85,83,71,.13)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
        x += width;
      }
    }
    for (let i = 0; i < (rub ? 760 : 350); i++) {
      const x = r() * size,
        y = r() * size,
        rr = 2 + r() * 19;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, rr);
      gradient.addColorStop(0, r() > 0.45 ? 'rgba(102,103,78,.065)' : 'rgba(132,112,91,.06)');
      gradient.addColorStop(1, 'rgba(120,117,91,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }
  const pixels = ctx.getImageData(0, 0, size, size),
    data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (r() - 0.5) * (slate ? 14 : 10);
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(pixels, 0, 0);
  const t = new T.CanvasTexture(canvas);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function makeMaterials(T) {
  const snow = { value: 0 },
    wet = { value: 0 },
    lamps = { value: 0 };
  const m = {};
  const texture = Object.fromEntries(
    ['ashlar', 'rubble', 'fine', 'slate', 'leadlight'].map((n, i) => [n, paperTile(T, n, 1458 + i * 113)]),
  );
  // Original grisaille-inspired leadlight. The outer face largely reads as
  // clouded grey glass, with the painted medallions emerging at close range.
  const glazing = document.createElement('canvas');
  glazing.width = 512;
  glazing.height = 640;
  const cg = glazing.getContext('2d'),
    rg = seeded(1474);
  const tones = ['#738787', '#8c9690', '#91a3aa', '#86949a', '#8f887d', '#8b96a5', '#a3a79b'];
  for (let row = 0; row < 18; row++)
    for (let col = 0; col < 16; col++) {
      const x = col * 32,
        y = row * 36;
      cg.fillStyle = tones[Math.floor(rg() * tones.length)];
      cg.fillRect(x, y, 32, 36);
      cg.strokeStyle = '#596663';
      cg.lineWidth = 1.25;
      cg.strokeRect(x + 0.5, y + 0.5, 31.5, 35.5);
    }
  for (let i = 0; i < 4; i++) {
    const x = 64 + 128 * i,
      y = 284 + (i % 2) * 24;
    cg.save();
    cg.translate(x, y);
    cg.beginPath();
    cg.moveTo(-40, 91);
    cg.bezierCurveTo(-46, 12, -33, -66, 0, -78);
    cg.bezierCurveTo(33, -66, 46, 12, 40, 91);
    cg.closePath();
    cg.fillStyle = 'rgba(94,88,78,.62)';
    cg.fill();
    cg.strokeStyle = '#b4ac88';
    cg.lineWidth = 3.3;
    cg.stroke();
    cg.beginPath();
    cg.arc(0, -35, 13, 0, Math.PI * 2);
    cg.fillStyle = '#aa9d75';
    cg.fill();
    cg.strokeStyle = '#837c68';
    cg.lineWidth = 2.1;
    cg.stroke();
    cg.beginPath();
    cg.arc(0, -31, 6.8, 0, Math.PI * 2);
    cg.fillStyle = '#bab19a';
    cg.fill();
    cg.beginPath();
    cg.moveTo(-6, -21);
    cg.lineTo(-19, -7);
    cg.lineTo(-27, 70);
    cg.quadraticCurveTo(-5, 86, 25, 68);
    cg.lineTo(17, -8);
    cg.lineTo(6, -20);
    cg.closePath();
    cg.fillStyle = ['#8e8e8c', '#9b8879', '#7b898e', '#9b9683'][i];
    cg.fill();
    cg.strokeStyle = '#697170';
    cg.lineWidth = 2;
    cg.stroke();
    for (let j = 0; j < 5; j++) {
      const u = -18 + j * 8;
      cg.beginPath();
      cg.moveTo(u * 0.35, -8 + j);
      cg.bezierCurveTo(u * 0.7, 16, u * 1.4, 40, u * 1.18, 66 + j);
      cg.strokeStyle = j % 2 ? '#a9a697' : '#6e7673';
      cg.lineWidth = 1.6;
      cg.stroke();
    }
    cg.restore();
  }
  for (let j = 0; j < 13; j++) {
    const y = j * 53;
    cg.strokeStyle = 'rgba(61,70,66,.62)';
    cg.lineWidth = 2.2;
    cg.beginPath();
    cg.moveTo(0, y);
    cg.lineTo(512, y + 1);
    cg.stroke();
  }
  const grains = cg.getImageData(0, 0, 512, 640);
  for (let i = 0; i < grains.data.length; i += 4) {
    const n = (rg() - 0.5) * 12;
    grains.data[i] += n;
    grains.data[i + 1] += n;
    grains.data[i + 2] += n;
  }
  cg.putImageData(grains, 0, 0);
  texture.chapel = new T.CanvasTexture(glazing);
  texture.chapel.wrapS = T.RepeatWrapping;
  texture.chapel.wrapT = T.ClampToEdgeWrapping;
  texture.chapel.colorSpace = T.SRGBColorSpace;
  texture.chapel.anisotropy = 4;
  function material(key, map, mode) {
    const mat = new T.MeshStandardMaterial({
      map: map ? texture[map] : null,
      vertexColors: true,
      side: T.DoubleSide,
      roughness: mode === 'glass' ? 0.59 : 0.93,
    });
    mat.name = 'Magdalen / ' + key;
    mat.onBeforeCompile = (s) => {
      s.uniforms.inkSnow = snow;
      s.uniforms.inkWet = wet;
      s.uniforms.inkLamps = lamps;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 inkPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ninkPos=position;');
      s.fragmentShader = s.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 inkPos;\nuniform float inkSnow; uniform float inkWet; uniform float inkLamps;',
      );
      let code = '';
      if (mode === 'roof')
        code = `
        float wash=.5+.25*sin(inkPos.x*.58+inkPos.z*.31)+.16*cos(inkPos.z*1.41-inkPos.x*.75)+.09*sin(dot(inkPos.xz,vec2(6.24,2.3)));
        float hold=smoothstep(wash*.42-.03,wash*.42+.5,inkSnow)*.97;
        diffuseColor.rgb*=vec3(.88+.17*wash,.90+.14*wash,.95+.09*wash)*(1.-.14*inkWet);
        diffuseColor.rgb=mix(diffuseColor.rgb, vec3(.88,.91,.90)*(0.94+.06*wash),hold);`;
      else if (mode === 'stone' || mode === 'rubble' || mode === 'fine')
        code =
          `
        float tide=(.5+.5*sin(dot(inkPos.xz,vec2(0.51,0.34))+sin(inkPos.x*.14)));
        float foot=(1.-smoothstep(.15,2.7+tide,inkPos.y))*(.23+.22*tide);
        diffuseColor.rgb*=mix(vec3(1.),vec3(.55,.62,.52),foot);
        float field=.5+.19*sin(dot(inkPos.xz,vec2(.45,.33))+sin(inkPos.y*.37))+.15*cos(dot(inkPos.xz,vec2(.73,1.13))-inkPos.y*.70)+.14*sin(inkPos.y*.63);
        float stain=smoothstep(.42,.88,field);
        float lumin=dot(diffuseColor.rgb,vec3(.23,.65,.12));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lumin),.15)*vec3(1.10,1.15,1.21);
        diffuseColor.rgb*=mix(vec3(1.025,1.02,1.),vec3(.81,.83,.77),stain*` +
          (mode === 'rubble' ? '1.0' : mode === 'fine' ? '.30' : '.57') +
          `);
        diffuseColor.rgb*=1.-inkWet*(.026+.055*foot);`;
      else if (mode === 'painted-glass')
        code = `
        float glassTone=.5+.5*sin(inkPos.y*.39+inkPos.x*.11+inkPos.z*.08);
        diffuseColor.rgb=mix(diffuseColor.rgb*vec3(.94,1.03,1.12),diffuseColor.rgb*vec3(1.37,1.19,.84),inkLamps*(.32+.17*glassTone));`;
      else if (mode === 'sash-glass')
        code = `
        float sky=.5+.5*sin(inkPos.x*.77+inkPos.y*.38+inkPos.z*.55);
        diffuseColor.rgb*=mix(vec3(.82,.88,.94),vec3(1.12,1.20,1.19),sky);`;
      else if (mode === 'lamp')
        code = 'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.59,.23),inkLamps*.87);';
      if (mode === 'rubble') {
        // The exposed inner court shows pale lime repairs and rain marks below
        // stringcourses. Restrict the wash to that elevation in the survey grid.
        code += `
          vec2 pc=inkPos.xz-vec2(-4.17,-57.41);
          vec2 grid=vec2(dot(pc,vec2(.89174,.45254)),dot(pc,vec2(-.45254,.89174)));
          vec2 limit=abs(grid-vec2(18.565,22.55))-vec2(18.565,22.55);
          float edgeWash=1.-smoothstep(.3,.98,abs(max(limit.x,limit.y)));
          float brush=dot(inkPos.xz,vec2(.78,1.36));
          float rainMark=smoothstep(.23,1.12,sin(brush*.91+sin(brush*.28))+.47*sin(brush*3.21+.25*sin(inkPos.y*1.78)));
          float atCornice=exp(-pow((7.42-inkPos.y)/(.46+.7*rainMark),2.));
          float atCourse=exp(-pow((4.21-inkPos.y)/(.28+.63*rainMark),2.));
          float aged=edgeWash*rainMark*(.70*atCornice+.57*atCourse+.25*stain);
          diffuseColor.rgb*=mix(vec3(1.),vec3(.60,.62,.55),min(1.,aged));
          diffuseColor.rgb+=vec3(.034,.033,.029)*edgeWash*(1.-rainMark)*smoothstep(.29,.56,field);
        `;
      }
      s.fragmentShader = s.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' + code,
      );
      if (mode === 'lamp')
        s.fragmentShader = s.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.6,.25,.075)*inkLamps;',
        );
    };
    mat.customProgramCacheKey = () => mode || 'solid';
    m[key] = mat;
  }
  material('stone', 'ashlar', 'stone');
  material('rubble', 'rubble', 'rubble');
  material('fine', 'fine', 'fine');
  material('roof', 'slate', 'roof');
  material('lead', null, 'roof');
  material('trim', null, 'solid');
  material('glass', 'leadlight', 'glass');
  material('sash-glass', null, 'sash-glass');
  material('chapel-glass', 'chapel', 'painted-glass');
  material('lamp', 'leadlight', 'lamp');
  material('ink', null, 'solid');
  return {
    materials: m,
    update(p) {
      snow.value = p.snow || 0;
      wet.value = p.wet || 0;
      lamps.value = p.lamps || 0;
    },
  };
}
