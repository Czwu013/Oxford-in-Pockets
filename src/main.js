import * as T from 'three';
import city from './data/city.json';
import { pockets, localViews, journeys, adjacentPocket } from './data/views.js';
import { seasons } from './magdalen/data/seasons.js';
import { daylight, initialSolarHour, secondsPerSolarHour } from './magdalen/data/daylight.js';
import { buildCity } from './city.js';
import { buildLandmarks } from './landmarks.js';
import { buildMarket, marketPoint } from './market.js';
import { mountMagdalen } from './magdalen-campus.js';
import { navigation } from './navigation.js';
import { streetLife, citySnow, greatTom } from './city-life.js';
import { atmosphere } from './palette.js';
import { inside } from './magdalen/ground.js';
import quadData from './data/quad.json';
import { buildMuseum } from './museum.js';
import { buildCastle, moundHeight } from './castle.js';
import { swiftColony } from './swifts.js';
import { districtLife } from './place-life.js';
import { quadHeight } from './college-craft.js';
import { tr, english, goTo, bellText, languageChooser, applyShell } from './language.js';
import { buildQuarters, placeAt, quarterBuilding, quarterOwner, roofClearance } from './quarters.js';
import { containsPlace, pocketScope } from './pocket-scope.js';
import { aerialLight, nightLanterns } from './sunlight.js';
import { lanternSites } from './street-craft.js';
import { fallingFoliage } from './windfall.js';
import { gardenHeight } from './new-college.js';

const siteOrder = [
  'magdalen',
  'radcliffe',
  'market',
  'christ',
  'museum',
  'castle',
  'ashmolean',
  'carfax',
  'newcollege',
  'merton',
  'balliol',
  'trinity',
  'queens',
  'univ',
];
const extraViews = {
  queens: [
    ['caroline', '卡罗琳圆亭'],
    ['queenarcade', '前庭柱廊'],
    ['queenlibrary', '后庭图书馆'],
    ['petrine', '圣彼得旧教堂'],
  ],
  univ: [
    ['univgate', '高街门楼'],
    ['univcourt', '主庭院'],
    ['radcourt', '拉德克利夫庭院'],
    ['logic', '逻辑巷廊桥'],
    ['exams', '考试学校'],
  ],
  balliol: [
    ['waterhouse', '沃特豪斯门楼'],
    ['butterfield', '彩带礼拜堂'],
    ['hallgarden', '花园与大厅'],
  ],
  trinity: [
    ['irongate', '宽街铁门'],
    ['frontclock', '前庭钟塔'],
    ['wrencourt', '花园庭院'],
    ['weston', '韦斯顿柱廊'],
  ],
  newcollege: [
    ['oakcourt', '栎树回廊'],
    ['cloisterwalk', '回廊内侧'],
    ['wallgarden', '城墙花境'],
  ],
  merton: [
    ['mobquad', '旧图书馆庭院'],
    ['mertontower', '礼拜堂塔楼'],
    ['fellowscourt', '院士庭院'],
  ],
  ashmolean: [
    ['portico', '博物馆柱廊'],
    ['martyrs', '殉道者纪念碑'],
  ],
  carfax: [
    ['dial', '钟面与报时人偶'],
    ['townhall', '市政厅立面'],
  ],
  radcliffe: [
    ['north', '北阶与柱廊'],
    ['sighs', '叹息桥巷'],
  ],
  market: [['cross', '金十字庭院']],
  christ: [
    ['court', '水池与院墙'],
    ['peck', '佩克沃特庭院'],
  ],
  museum: [
    ['nest', '雨燕巢口'],
    ['glass', '玻璃大厅'],
    ['liddon', '利登庭院'],
  ],
  castle: [
    ['prison', '旧监狱'],
    ['mound', '土丘顶'],
    ['nuffield', '纽菲尔德学院'],
  ],
};
const viewNames = {
  ...Object.fromEntries([...extraViews.queens, ...extraViews.univ]),
  waterhouse: '沃特豪斯门楼',
  butterfield: '彩带礼拜堂',
  hallgarden: '花园与大厅',
  irongate: '宽街铁门',
  frontclock: '前庭钟塔',
  wrencourt: '花园庭院',
  weston: '韦斯顿柱廊',
  oakcourt: '从回廊草坪看常绿栎树与独立钟楼',
  cloisterwalk: '穿过新学院回廊南侧的木构廊道',
  wallgarden: '沿花境看中世纪城墙与半圆堡台',
  mobquad: '从莫布庭院看旧图书馆与礼拜堂塔顶',
  mertontower: '从默顿街看礼拜堂耳堂与交叉塔',
  fellowscourt: '院士庭院南翼的四柱式门楼',
  linden: 'Addison’s Walk 的椴树与河岸',
  portico: '博蒙特街庭院里的爱奥尼柱廊',
  martyrs: '圣吉尔斯街南端的三面纪念碑',
  dial: '卡尔法克斯塔东面的钟面与报时人偶',
  townhall: '从圣奥尔代茨街看市政厅主入口',
  core: '地标近景',
  sighs: '从新学院巷看赫特福德叹息桥',
  cross: '从金十字庭院走向市场',
  peck: '从庭院望向基督堂图书馆',
  liddon: '从利登庭院望向基布尔礼拜堂',
  nuffield: '从上庭院望向图书馆尖塔',
  north: '圆顶阅览室北侧门廊',
  court: '墨丘利水池与汤姆庭院',
  glass: '铁柱与玻璃分跨屋顶',
  mound: '保留地形的丘顶视角',
  prison: 'D 翼拱廊与债务人塔',
};

const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)],
  stage = $('#stage'),
  canvas = $('#view');
const smooth = (t) => t * t * (3 - 2 * t),
  lerp = T.MathUtils.lerp;
const hoursBetween = (from, to) => ((to - from + 36) % 24) - 12;
const eventHour = (from, to, mix) => (from + hoursBetween(from, to) * mix + 24) % 24;
function button(parent, title, click, attributes = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = title;
  for (const [k, v] of Object.entries(attributes)) b.setAttribute(k, v);
  b.addEventListener('click', click);
  parent.append(b);
  return b;
}
async function start() {
  const mobile = matchMedia('(max-width:730px),(pointer:coarse)').matches;
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0xf5f3e9, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.3 : 1.55));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new T.Scene(),
    sky = new T.HemisphereLight(0xfffcf0, 0xbfc1b6, 1.65),
    sun = new T.DirectionalLight(0xffedcc, 2.35);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
  sun.shadow.normalBias = 0.13;
  sun.shadow.bias = -0.00027;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 4800;
  scene.add(sky, sun, sun.target);
  const table = new T.Mesh(
    new T.PlaneGeometry(3400, 2850),
    new T.ShadowMaterial({ opacity: 0.14, depthWrite: false }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.set(-450, -5.48, -140);
  table.receiveShadow = true;
  scene.add(table);
  const state = {
    index: 0,
    weights: [1, 0, 0, 0],
    from: [1, 0, 0, 0],
    fade: 1,
    solarHour: initialSolarHour,
    night: false,
    savedDayHour: initialSolarHour,
    timeFade: null,
    shafts: true,
    wet: 0,
    rain: false,
    snowOn: false,
    load: 0,
    auto: false,
    autoTime: 0,
    event: false,
    eventTime: 0,
    sounding: false,
  };
  let active = 'city',
    mode = 'overview',
    photoMode = false,
    stored = null,
    clock = 0,
    lastSh = -1e5,
    shadowKey = '',
    lastBell = 0,
    pending = false,
    wheelStart = null,
    lastWheel = 0;
  const marks = {},
    groups = {};
  const ray = new T.Raycaster(),
    screen = new T.Vector2(),
    point = new T.Vector3();
  const rig = navigation(canvas, tap, manual);
  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    rig.resize(r.width, r.height, stage.getBoundingClientRect().height);
    lastSh = -1e5;
  }
  const viewportObserver = new ResizeObserver(resize);
  viewportObserver.observe(stage);
  viewportObserver.observe(canvas);
  const actions = $('#actions');
  new ResizeObserver(() => {
    document.body.style.setProperty('--actions-height', actions.getBoundingClientRect().height + 'px');
  }).observe(actions);
  resize();
  const contextCity = buildCity(scene, city);
  const [sites, museum] = await Promise.all([buildLandmarks(scene, city), buildMuseum(scene)]);
  Object.assign(groups, sites);
  groups.museum = museum.group;
  groups.castle = buildCastle(scene, city);
  for (const id of ['ashmolean', 'carfax', 'newcollege', 'merton', 'balliol', 'trinity', 'queens', 'univ']) {
    const group = new T.Group();
    group.name = pockets[id].en;
    group.userData.pocket = id;
    scene.add(group);
    groups[id] = group;
  }
  const swifts = swiftColony(museum.group, museum.nests);
  const market = buildMarket(scene, city),
    mag = mountMagdalen(scene, renderer, mobile);
  groups.market = market.group;
  groups.magdalen = mag.root;
  const placeLife = districtLife(groups, city.anchors.mercury, placeAt);
  const scope = pocketScope(groups, contextCity, table);
  const updateQuarters = await buildQuarters(groups, city);
  const aerial = aerialLight(renderer, sun, mobile),
    foliage = fallingFoliage(scene, city, mag.surfaces);
  const lightStreets = nightLanterns(
    scene,
    [...lanternSites, ...(mag.root.userData.lanternSites || [])],
    placeAt,
  );
  const lane = market.lanes[2],
    laneAt = (v, h) => {
      const p = marketPoint(lane.at(v), v);
      return [p[0], h, p[1]];
    };
  journeys.market.steps = [
    [-5, 2.23],
    [5.5, 2.12],
    [17, 1.98],
    [32, 1.95],
  ].map(([v, y]) => ({ eye: laneAt(v, y), look: laneAt(v + 15, 2.7) }));
  const solids = [
    ...city.buildings.filter((b) => b[3] !== 'market' && b[0] !== 'w24077527'),
    ...quadData.wings,
  ].map(([id, rings, height, owner]) => {
    const xs = rings[0].map((p) => p[0]),
      zs = rings[0].map((p) => p[1]);
    return {
      rings,
      owner:
        typeof owner === 'string' && owner in groups
          ? owner
          : quarterOwner(id) || (quadData.wings.some((row) => row[0] === id) ? 'christ' : null),
      style: quarterBuilding(id),
      height,
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      z0: Math.min(...zs),
      z1: Math.max(...zs),
    };
  });
  function inPassage(style, x, z, eyeY) {
    if (!style) return false;
    if (style.family === 'bridge') return eyeY < 5.1;
    if (eyeY > 2.95 || !style.passages) return false;
    return style.passages.some((line) =>
      line.slice(1).some(([bx, bz], i) => {
        const [ax, az] = line[i],
          dx = bx - ax,
          dz = bz - az,
          l2 = dx * dx + dz * dz;
        if (l2 < 0.0001) return false;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        return (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2 < 0.87 ** 2;
      }),
    );
  }
  rig.setClearance((x, z, eyeY) => {
    let min = Math.max(
      1.32,
      !scope.id || scope.id === 'castle' ? moundHeight(x, z) + 1.19 : 0,
      !scope.id || scope.id === 'christ' ? quadHeight(x, z) + 1.15 : 0,
      !scope.id || scope.id === 'newcollege' ? gardenHeight(x, z) + 1.18 : 0,
    );
    if ((!scope.id || scope.id === 'magdalen') && Math.abs(x) < 167 && z > -169 && z < 184) {
      const hit = mag.surfaces.sample(x, z);
      if (hit.kind !== 'water' && Number.isFinite(hit.y)) min = Math.max(min, hit.y + 1.05);
    }
    for (const b of solids)
      if (
        x > b.x0 &&
        (!scope.id || scope.id === b.owner) &&
        x < b.x1 &&
        z > b.z0 &&
        z < b.z1 &&
        inside(x, z, b.rings[0]) &&
        !b.rings.slice(1).some((r) => inside(x, z, r)) &&
        !inPassage(b.style, x, z, eyeY)
      )
        min = Math.max(min, roofClearance(b.style, x, z, b.height) + 1.15);
    return min;
  });
  const life = streetLife(scene, market, (x, z) => !scope.id || containsPlace(scope.id, x, z)),
    snow = citySnow(scene),
    bell = greatTom();
  const eventTitle = { may: '五月晨唱', bell: '汤姆钟夜鸣', opening: '清晨开市' };
  const colors = ['lawn', 'meadow', 'bank', 'garden', 'water', 'sun', 'sky'],
    env = Object.fromEntries(colors.map((k) => [k, new T.Color()]));
  const pal = seasons.map((s) => Object.fromEntries(colors.map((k) => [k, new T.Color(s[k])])));
  const sunDir = new T.Vector3(),
    sim = {
      camera: rig.cam,
      weights: [1, 0, 0, 0],
      snow: 0,
      wet: 0,
      event: 0,
      eventTime: 0,
      sunDir,
      lamps: 0,
      time: 0,
    };
  const moonDir = new T.Vector3(),
    shadeAxis = new T.Vector3(),
    shadeUp = new T.Vector3(),
    originUp = new T.Vector3(0, 1, 0),
    moonColor = new T.Color('#adc2e3'),
    groundDay = new T.Color('#c2b7a2'),
    groundNight = new T.Color('#77869d'),
    twilightTop = new T.Color('#20354f'),
    twilightHorizon = new T.Color('#627487'),
    paperTop = new T.Color('#f3f1e5'),
    paperBase = new T.Color('#f5f2e8'),
    horizonMix = new T.Color();
  const skyPaper = new T.Color('#cedfe0'),
    skyMix = new T.Color(),
    skyNight = new T.Color('#798790');
  let lastSky = '';
  const seasonButtons = all('[data-season]'),
    selectionButtons = {};
  const chooser = $('#place-menu');
  const placeOptions = {};
  chooser.onchange = () => (chooser.value === 'city' ? back() : select(chooser.value));
  function say(s) {
    $('#notice').textContent = s;
  }
  for (const id of siteOrder) {
    const p = pockets[id];
    placeOptions[id] = new Option(tr(p.name), id);
    chooser.add(placeOptions[id]);
    selectionButtons[id] = button($('#pockets'), p.short, () => select(id), {
      'data-pocket': id,
      'aria-label': p.name,
    });
    marks[id] = button($('#marks'), p.name, () => select(id), {
      class: 'mark',
      'data-mark': id,
      'aria-label': '前往' + p.name,
    });
  }
  function tabLabel(id) {
    return id === 'city' ? '牛津市中心' : pockets[id].name;
  }
  function setScope(id) {
    scope.set(id);
    rig.setBounds(scope.mask?.bounds);
    lastSh = -1e5;
    renderer.shadowMap.needsUpdate = true;
  }
  for (const b of all('#scope button'))
    b.onclick = () => {
      if (active === 'city') return;
      // A connected walk uses both frontages. If the visitor isolates mid-walk,
      // retain the current camera and cancel arrival at the neighbouring college.
      if (mode === 'crossing' && b.dataset.scope === 'pocket') {
        rig.cancel();
        mode = 'walk';
      }
      setScope(b.dataset.scope === 'pocket' ? active : null);
      ui();
      if (frozen) {
        tickSim(0);
        draw();
      }
    };
  function ui() {
    const event = state.event,
      p = pockets[active];
    document.body.dataset.pocket = active;
    document.body.dataset.mode = mode;
    document.body.dataset.display = scope.id ? 'pocket' : 'map';
    $('#scope').hidden = !p;
    for (const b of all('#scope button'))
      b.setAttribute('aria-pressed', String((b.dataset.scope === 'pocket') === !!scope.id));
    $('#place-name').textContent = tr(event ? eventTitle[event] : tabLabel(active));
    const timeControl = $('#time-of-day');
    timeControl.querySelector('span').textContent = tr(state.night ? '日景' : '夜景');
    timeControl.dataset.night = String(state.night);
    timeControl.setAttribute('aria-label', tr(state.night ? '切换到日景' : '切换到夜景'));
    timeControl.disabled = !!event;
    $('#place-en').classList.toggle('daily', !event);
    $('#place-en').textContent =
      event === 'may'
        ? 'May Morning · 1 May'
        : event === 'bell'
          ? 'Great Tom · 21:05'
          : event === 'opening'
            ? 'Market Morning'
            : p
              ? p.en
              : 'Central Oxford';
    $('#place-desc').textContent = tr(
      event === 'bell'
        ? bellText(Math.max(1, bell.count))
        : event === 'may'
          ? '5 月 1 日清晨 · 大塔上的合唱'
          : event === 'opening'
            ? '花摊摆货，廊灯次第点亮'
            : mode === 'crossing'
              ? p.action
              : mode === 'walk'
                ? '街面视角'
                : mode === 'cloister'
                  ? '回廊庭院'
                  : mode === 'addison'
                    ? 'Addison’s Walk 河岸'
                    : mode === 'nest'
                      ? state.index < 2
                        ? '春夏 · 雨燕在通风罩下收翼入巢'
                        : '秋冬 · 巢口空置，雨燕已迁离'
                      : viewNames[mode] || (p ? p.sub : '轻点彩色建筑，走近一处街景'),
    );
    for (const [id, b] of Object.entries(selectionButtons)) {
      placeOptions[id].text = tr(pockets[id].name);
      b.setAttribute('aria-pressed', String(id === active));
      b.textContent = tr(pockets[id].short);
      if (english() && (id === 'magdalen' || id === 'ashmolean')) {
        const full = document.createElement('span'),
          compact = document.createElement('span');
        full.className = 'tab-full';
        compact.className = 'tab-short';
        full.textContent = b.textContent;
        compact.textContent = id === 'magdalen' ? 'Magd.' : 'Ashm.';
        b.replaceChildren(full, compact);
      }
      b.setAttribute('aria-label', tr(pockets[id].name));
      marks[id].textContent = english() ? pockets[id].en : pockets[id].name;
      marks[id].setAttribute('aria-label', goTo(pockets[id].name));
    }
    $('#back').setAttribute('aria-pressed', String(active === 'city'));
    chooser.options[0].text = tr('选择街区');
    chooser.value = active;
    seasonButtons.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(i === state.index));
      b.disabled = !!event;
    });
    for (const [id, k] of [
      ['#wet', 'rain'],
      ['#snow', 'snowOn'],
      ['#auto', 'auto'],
      ['#shafts', 'shafts'],
    ]) {
      $(id).setAttribute('aria-pressed', String(state[k]));
      $(id).disabled = !!event;
    }
    const a = $('#actions');
    a.replaceChildren();
    a.hidden = !p;
    if (event) {
      if (event !== 'opening')
        button(a, state.sounding ? '关闭声音' : '开启声音', toggleAudio, {
          'data-act': 'sound',
          'aria-pressed': String(state.sounding),
        });
      button(a, '返回日常', leaveEvent, { 'data-act': 'end' });
    } else if (p) {
      if (scope.id || mode !== 'overview')
        button(a, scope.id ? '街区全貌' : '地点全景', () => select(active, true), { 'data-act': 'overview' });
      if (active === 'magdalen') {
        if (mode !== 'cloister') button(a, '回廊', () => subview('cloister'), { 'data-act': 'cloister' });
        if (mode !== 'addison') button(a, '河岸', () => subview('addison'), { 'data-act': 'addison' });
        if (mode === 'addison') button(a, '椴树下', () => subview('linden'), { 'data-act': 'linden' });
        button(a, '五月晨唱', () => eventStart('may'), { 'data-act': 'may' });
      } else {
        if (mode !== 'core') button(a, '地标近景', () => subview('core'), { 'data-act': 'core' });
        if (mode !== 'crossing' && (mode !== 'walk' || adjacentPocket[active]))
          button(a, p.action, () => walk(active), { 'data-act': 'walk' });
        if (active === 'market') {
          button(
            a,
            mode === 'cut' ? '合上屋顶' : '揭开屋顶',
            () => {
              if (mode === 'cut') select('market', true);
              else {
                mode = 'cut';
                market.open(true);
                rig.fly({ ...p.landmarkView, az: 13, alt: 58, span: 111 });
                ui();
              }
            },
            { 'data-act': 'cut' },
          );
          button(a, '清晨开市', () => eventStart('opening'), { 'data-act': 'opening' });
        }
        if (active === 'christ') button(a, '21:05 钟声', () => eventStart('bell'), { 'data-act': 'bell' });
        for (const [key, name] of extraViews[active] || [])
          if (mode !== key) button(a, name, () => subview(key), { 'data-act': key });
      }
    }
    for (const b of a.children) b.textContent = tr(b.textContent);
  }
  function select(id, reset = false) {
    if (state.event) leaveEvent();
    if (active === 'city' && !reset) rig.remember();
    active = id;
    if (scope.id) setScope(active);
    mode = 'overview';
    market.open(false);
    const place = pockets[id];
    rig.fly(scope.id ? rig.fitPocket(place.view, scope.outline, place.label) : place.view);
    closeWeather();
    ui();
    say(tr(tabLabel(id)));
  }
  function back() {
    if (state.event) leaveEvent();
    if (active === 'city') {
      rig.fly(rig.defaultCity());
    } else {
      setScope(null);
      active = 'city';
      mode = 'overview';
      market.open(false);
      rig.back();
    }
    closeWeather();
    ui();
  }
  function subview(id) {
    mode = id;
    market.open(false);
    const v =
      id === 'nest' ? swifts.nextArrival() : id === 'core' ? pockets[active].landmarkView : localViews[id];
    rig.fly(v.eye ? rig.viewFrom(v.eye, v.target, v.lens, v.minVertical) : v);
    ui();
  }
  function walk(id) {
    const destination = adjacentPocket[id];
    mode = destination ? 'crossing' : 'walk';
    market.open(false);
    if (destination) setScope(null);
    rig.journey(
      id,
      destination
        ? () => {
            active = destination;
            mode = 'walk';
            ui();
            say(tr(tabLabel(active)));
          }
        : undefined,
    );
    ui();
  }
  function manual(type, old, span, prior) {
    if (state.event) return;
    if (mode === 'crossing') {
      mode = 'walk';
      ui();
    }
    if (scope.id || photoMode) return;
    if (type !== 'zoom') {
      wheelStart = null;
      return;
    }
    if (active === 'city' && span < old) {
      const now = performance.now();
      if (!wheelStart || (now - lastWheel > 950 && old > 480)) wheelStart = prior;
      lastWheel = now;
    }
    if (active !== 'city' && span > 485 && span > old) {
      active = 'city';
      mode = 'overview';
      market.open(false);
      ui();
    } else if (active === 'city' && old >= 300 && span < 300) {
      const place = placeAt(rig.pose.x, rig.pose.z);
      if (place) {
        rig.remember(wheelStart || prior);
        wheelStart = null;
        active = place;
        mode = 'overview';
        ui();
      }
    }
  }
  function tap(x, y) {
    if (state.event || photoMode) return;
    const box = canvas.getBoundingClientRect();
    screen.set(((x - box.left) / box.width) * 2 - 1, 1 - ((y - box.top) / box.height) * 2);
    ray.setFromCamera(screen, rig.cam);
    // Respect visible roofs in front of a target, including district extensions.
    const hits = ray.intersectObjects([...Object.values(groups), contextCity], true);
    for (const h of hits) {
      let o = h.object,
        owner = null,
        hidden = false;
      while (o) {
        if (!o.visible) {
          hidden = true;
          break;
        }
        if (o.userData.pocket) owner = o.userData.pocket;
        o = o.parent;
      }
      if (hidden) continue;
      if (owner === 'magdalen' && active === owner && h.object.userData.landmark === 'great-tower')
        eventStart('may');
      else if (owner && active !== owner) select(owner);
      return;
    }
  }
  function changeSeason(i) {
    if (state.event) return;
    state.from = [...state.weights];
    state.index = i;
    state.fade = 0;
    state.autoTime = 0;
    ui();
    say(tr(seasons[i].name + '季'));
  }
  function eventStart(id) {
    if (state.event) return;
    stored = { active, mode, pose: rig.snapshot(), daily: structuredClone(state) };
    state.event = id;
    state.eventTime = 0;
    state.sounding = false;
    mode = 'event';
    bell.reset();
    lastBell = 0;
    if (id === 'opening') {
      market.open(false);
      rig.journey('market');
    } else rig.fly(localViews[id]);
    ui();
    say(tr(eventTitle[id]));
  }
  function leaveEvent() {
    if (!stored) return;
    const saved = stored;
    stored = null;
    pending = false;
    bell.mute();
    mag.life.stopAudio();
    Object.assign(state, saved.daily);
    state.sounding = false;
    active = saved.active;
    mode = saved.mode;
    market.open(mode === 'cut');
    rig.restore(saved.pose);
    ui();
  }
  async function toggleAudio() {
    if (!state.event || pending) return;
    if (state.sounding) {
      bell.mute();
      mag.life.stopAudio();
      state.sounding = false;
      ui();
      return;
    }
    pending = true;
    const event = state.event;
    try {
      const started = event === 'bell' ? (await bell.enable(), true) : await mag.life.startAudio();
      if (state.event === event) state.sounding = !!started;
      else {
        bell.mute();
        mag.life.stopAudio();
      }
    } catch {
      say(tr('浏览器声音暂不可用'));
    } finally {
      pending = false;
      ui();
    }
  }
  function closeWeather() {
    $('#weather-panel').hidden = true;
    $('#weather').setAttribute('aria-expanded', 'false');
  }
  const photoButton = $('#photo-mode');
  const restoreButton = $('#restore-ui');
  function setPhotoMode(enabled) {
    photoMode = enabled;
    document.body.classList.toggle('photo-mode', enabled);
    canvas.setAttribute(
      'aria-label',
      tr(enabled ? '照片取景。拖动旋转，滚轮或双指缩放。' : canvas.dataset.aria),
    );
    wheelStart = null;
    (enabled ? restoreButton : photoButton).focus({ preventScroll: true });
  }
  photoButton.onclick = () => setPhotoMode(true);
  restoreButton.onclick = () => setPhotoMode(false);
  seasonButtons.forEach((b, i) => (b.onclick = () => changeSeason(i)));
  $('#back').onclick = back;
  $('#time-of-day').onclick = () => {
    if (state.event) return;
    if (!state.night && !state.timeFade) state.savedDayHour = state.solarHour;
    state.night = !state.night;
    const end = state.night ? 22.6 : state.savedDayHour;
    const delta = hoursBetween(state.solarHour, end);
    state.timeFade = { start: state.solarHour, delta, t: 0 };
    closeWeather();
    ui();
    say(tr(state.night ? '夜景' : '日景'));
  };
  $('#zin').onclick = () => rig.zoom(0.78);
  $('#zout').onclick = () => rig.zoom(1.28);
  $('#weather').onclick = () => {
    const p = $('#weather-panel');
    p.hidden = !p.hidden;
    $('#weather').setAttribute('aria-expanded', String(!p.hidden));
  };
  $('.dismiss').onclick = closeWeather;
  for (const [id, k] of [
    ['#wet', 'rain'],
    ['#snow', 'snowOn'],
    ['#auto', 'auto'],
    ['#shafts', 'shafts'],
  ])
    $(id).onclick = () => {
      if (!state.event) {
        state[k] = !state[k];
        state.autoTime = 0;
        ui();
      }
    };
  $('#info').onclick = () => $('#sources').showModal();
  $('#credit').onclick = () => $('#sources').showModal();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.repeat && !$('#sources').open && !$('#languages').open) {
      if (photoMode) {
        e.preventDefault();
        setPhotoMode(false);
      } else if (!$('#weather-panel').hidden) closeWeather();
      else if (state.event) leaveEvent();
      else if (mode !== 'overview') select(active, true);
      else if (active !== 'city') back();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!photoMode && !$('#weather-panel').hidden && !e.target.closest('#weather,#weather-panel,#photo-mode'))
      closeWeather();
  });
  function positionMarks() {
    if (photoMode) return;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    const visible = active === 'city' && rig.pose.span > 335;
    const assigned = [];
    for (const id of siteOrder) {
      const el = marks[id];
      if (!visible) {
        el.hidden = true;
        continue;
      }
      point.fromArray(pockets[id].label).project(rig.cam);
      let x = ((point.x + 1) * w) / 2,
        y = ((1 - point.y) * h) / 2 - 9;
      el.hidden = point.z > 1 || point.z < 0 || x < 15 || x > w - 15 || y < 45 || y > h - 12;
      if (el.hidden) continue;
      const half = el.offsetWidth / 2;
      x = T.MathUtils.clamp(x, half + 6, w - half - 6);
      for (const box of assigned)
        if (Math.abs(x - box.x) < half + box.half + 6 && Math.abs(y - box.y) < 26) y = box.y - 28;
      assigned.push({ x, y, half });
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
    const mp = w / rig.width,
      unit = [1, 2, 5, 10, 20, 50, 100, 200, 500].reduce((a, b) =>
        Math.abs(a * mp - 52) < Math.abs(b * mp - 52) ? a : b,
      );
    $('#scale span').style.width = Math.max(8, unit * mp) + 'px';
    $('#scale small').textContent = unit + ' m';
    $('#compass').style.transform = 'rotate(' + -rig.pose.az + 'deg)';
  }
  function tickSim(dt) {
    clock += dt;
    rig.step(dt);
    if (state.event) {
      state.eventTime += dt;
      if (state.event === 'bell') {
        bell.update(state.eventTime);
        if (lastBell !== bell.count) {
          lastBell = bell.count;
          $('#place-desc').textContent = bellText(bell.count);
        }
      }
      if (state.eventTime > { may: 72, opening: 37, bell: 241 }[state.event]) leaveEvent();
    } else {
      if (state.timeFade) {
        const f = state.timeFade;
        f.t = Math.min(1, f.t + dt / 3.2);
        state.solarHour = (f.start + smooth(f.t) * f.delta + 24) % 24;
        if (f.t >= 1) state.timeFade = null;
      } else {
        state.solarHour = (state.solarHour + dt / secondsPerSolarHour) % 24;
        const dusk = daylight(state.weights, state.solarHour, moonDir).sunset + 0.3;
        const naturalNight = state.solarHour >= dusk || state.solarHour < 24 - dusk;
        if (state.night !== naturalNight) {
          state.night = naturalNight;
          if (naturalNight) state.savedDayHour = initialSolarHour;
          ui();
        }
      }
      state.fade = Math.min(1, state.fade + dt / 2.8);
      const f = smooth(state.fade);
      state.weights = state.from.map((v, i) => lerp(v, i === state.index ? 1 : 0, f));
      state.wet = T.MathUtils.damp(state.wet, state.rain ? 1 : 0, 1.8, dt);
      state.load = T.MathUtils.clamp(
        state.load + dt * (state.snowOn ? 1 / 49 : -(state.rain ? 1 / 30 : 1 / 61)),
        0,
        1,
      );
      if (state.auto && (state.autoTime += dt) > 38) changeSeason((state.index + 1) % 4);
    }
    const spring = state.event === 'may' ? smooth(Math.min(1, state.eventTime / 2.3)) : 0;
    for (let i = 0; i < 4; i++) sim.weights[i] = lerp(state.weights[i], i === 0 ? 1 : 0, spring);
    for (const k of colors) {
      const out = env[k];
      out.setRGB(0, 0, 0);
      for (let i = 0; i < 4; i++) {
        const c = pal[i][k],
          s = sim.weights[i];
        out.r += c.r * s;
        out.g += c.g * s;
        out.b += c.b * s;
      }
    }
    const e = state.event ? smooth(Math.min(1, state.eventTime / 2.4)) : 0,
      hour =
        state.event === 'may'
          ? eventHour(state.solarHour, 6, e)
          : state.event === 'bell'
            ? eventHour(state.solarHour, 21.083, e)
            : state.event === 'opening'
              ? eventHour(state.solarHour, 7.5, e)
              : state.solarHour;
    const day = daylight(sim.weights, hour, sunDir);
    if (day.power < 0.16) {
      daylight(sim.weights, (hour + 12) % 24, moonDir);
      sunDir.lerp(moonDir, (0.16 - day.power) / 0.1).normalize();
    }
    sim.solarHour = hour;
    sim.sunPower = day.power;
    sim.wet = state.wet;
    sim.lamps = Math.max(day.lamps, 0.03);
    lightStreets(sim, rig.pose, rig.cam.position, scope.id);
    sim.camera = rig.cam;
    sim.event = state.event === 'may' ? 1 : 0;
    sim.eventTime = state.eventTime;
    sim.time = clock;
    const darkness = 1 - T.MathUtils.smoothstep(day.power, 0.06, 0.9);
    const street = rig.pose.lens > 41 && active !== 'city';
    const top = skyMix
      .copy(street ? env.sky : paperTop)
      .lerp(street ? skyPaper : paperBase, street ? 0.24 : 0)
      .lerp(twilightTop, darkness)
      .getHexString();
    const bottom = horizonMix.copy(paperBase).lerp(twilightHorizon, darkness).getHexString();
    const skyKey = top + bottom;
    if (skyKey !== lastSky) {
      canvas.style.background = 'linear-gradient(180deg,#' + top + ' 0%,#' + bottom + ' 96%)';
      lastSky = skyKey;
    }
    env.sky.lerp(skyNight, darkness * 0.72);
    sky.color.copy(env.sky);
    sky.groundColor.copy(groundDay).lerp(groundNight, darkness);
    sky.intensity = T.MathUtils.lerp(1.19, 0.57, darkness) + state.wet * 0.075;
    sun.color.copy(env.sun).lerp(moonColor, darkness);
    sun.intensity = T.MathUtils.lerp(3.02, 0.35, darkness) * (1 - state.wet * 0.16);
    const shadowSpan = T.MathUtils.clamp(rig.width * 0.7 + 9, 29, 1180),
      texel = (2 * shadowSpan) / sun.shadow.mapSize.x;
    const anchor = sun.target.position.set(rig.pose.x, Math.max(3, Math.min(18, rig.pose.y)), rig.pose.z);
    shadeAxis.crossVectors(originUp, sunDir).normalize();
    shadeUp.crossVectors(sunDir, shadeAxis).normalize();
    for (const axis of [shadeAxis, shadeUp]) {
      const d = anchor.dot(axis);
      anchor.addScaledVector(axis, Math.round(d / texel) * texel - d);
    }
    const lightDistance = shadowSpan * 1.52 + 106;
    sun.position.copy(anchor).addScaledVector(sunDir, lightDistance);
    const key = [
      active,
      mode,
      state.event,
      Math.round(rig.pose.span / 20),
      Math.round(rig.pose.x / 24),
      Math.round(rig.pose.z / 20),
      Math.round(sunDir.x * 175),
      Math.round(sunDir.z * 175),
      Math.round(sim.weights[3] * 12),
    ].join('/');
    if (key !== shadowKey || clock - lastSh > (rig.moving ? 0.35 : 2.5)) {
      const c = sun.shadow.camera;
      c.left = c.bottom = -shadowSpan;
      c.right = c.top = shadowSpan;
      c.near = Math.max(0.5, lightDistance - shadowSpan * 1.46 - 73);
      c.far = lightDistance + shadowSpan * 1.46 + 70;
      sun.shadow.bias = -0.0001;
      sun.shadow.normalBias = Math.min(0.12, Math.max(0.016, texel * 0.46));
      sun.shadow.radius = 1.35;
      c.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
      shadowKey = key;
      lastSh = clock;
    }
    const nearMag =
      scope.id === 'magdalen' ||
      (!scope.id &&
        Math.hypot(rig.pose.x, rig.pose.z) < 182 &&
        rig.pose.span < (active === 'magdalen' ? 690 : 410));
    atmosphere.snow.value = state.load * (1 - spring);
    atmosphere.wet.value = state.wet;
    atmosphere.night.value = sim.lamps;
    atmosphere.seasons.value.fromArray(sim.weights);
    sim.landSnow = atmosphere.snow.value;
    updateQuarters(sim, rig.pose);
    foliage.update(clock, sim, rig.pose, scope.id);
    mag.update(dt, state, env, sim, nearMag, canvas);
    market.update(
      dt,
      Math.hypot(rig.pose.x + 706, rig.pose.z + 86) < 175 && rig.pose.span < 420,
      hour,
      sim.lamps,
    );
    swifts.update(
      clock,
      sim.weights,
      Math.hypot(rig.pose.x + 645, rig.pose.z + 746) < 182 && rig.pose.span < 350,
    );
    placeLife(clock, sim, Math.hypot(rig.pose.x + 1141, rig.pose.z - 2) < 166 && rig.pose.span < 300);
    life.update(dt, state, sim);
    snow(dt, rig.pose, rig.pose.span, state.snowOn && !nearMag && !state.event, scope.mask);
    positionMarks();
  }
  let last = performance.now(),
    frozen = false;
  function loop(now) {
    const dt = Math.min(0.32, Math.max(0, (now - last) / 1000));
    last = now;
    if (!document.hidden && !frozen) {
      tickSim(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }
  languageChooser(() => {
    ui();
    positionMarks();
  });
  ui();
  tickSim(0);
  function draw() {
    aerial.render(scene, rig.cam, sim, rig.pose, active, state.shafts);
  }
  draw();
  $('#loading').hidden = true;
  document.body.dataset.ready = 'yes';
  requestAnimationFrame(loop);
  if (new URLSearchParams(location.search).has('proof'))
    window.cityProof = {
      population: () => life.sample(),
      placeAt,
      proofLeaves(visible) {
        foliage.display(visible);
        draw();
      },
      read: () => ({
        active,
        scope: scope.id,
        contextVisible: contextCity.visible,
        sectionVisible: scope.id ? groups[scope.id].getObjectByName('Landscape section')?.visible : false,
        visibleSites: Object.keys(groups).filter((key) => groups[key].visible),
        mode,
        state: structuredClone(state),
        pose: rig.snapshot(),
        eye: rig.cam.position.toArray(),
        clock,
        marketLift: market.lift,
        bell: bell.count,
        peopleTime: life.time,
        calls: aerial.inspect().active ? aerial.inspect().geometryCalls + 2 : renderer.info.render.calls,
        triangles: aerial.inspect().active
          ? aerial.inspect().geometryTriangles + 4
          : renderer.info.render.triangles,
        aerial: aerial.inspect(),
        leaves: foliage.inspect(),
        sun: sim.sunDir.toArray(),
        sunPower: sim.sunPower,
        lamps: sim.lamps,
        litHour: sim.solarHour,
        sites: Object.keys(groups),
        swifts: swifts.inspect(),
        language: document.documentElement.lang,
        nests: museum.nests.length,
        cityBuildings: city.buildings.length,
      }),
      freeze() {
        frozen = true;
      },
      advance(sec, draw = true) {
        frozen = true;
        while (sec > 1e-6) {
          const dt = Math.min(0.25, sec);
          tickSim(dt);
          sec -= dt;
        }
        if (draw) aerial.render(scene, rig.cam, sim, rig.pose, active, state.shafts);
      },
      project(x, y, z) {
        point.set(x, y, z).project(rig.cam);
        const b = canvas.getBoundingClientRect();
        return [b.x + ((point.x + 1) * b.width) / 2, b.y + ((1 - point.y) * b.height) / 2];
      },
    };
}
applyShell();
start().catch((err) => {
  console.error(err);
  $('#loading').textContent =
    '请用支持 WebGL 2 的浏览器重新打开。 · Please reopen in a browser with WebGL 2.';
  document.body.dataset.error = String(err);
});
