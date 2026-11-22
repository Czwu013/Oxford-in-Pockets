const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const [file, dir] = process.argv.slice(2),
  out = path.resolve(dir || 'verification/twelve');
fs.mkdirSync(out, { recursive: true });
const result = { errors: [], requests: [], scopes: [], views: {}, walks: [], layouts: [], physicalPhones: 0 };
const pageState = (p) => p.evaluate(() => cityProof.read());
const advance = (p, sec, draw = true) => p.evaluate(([s, d]) => cityProof.advance(s, d), [sec, draw]);
async function press(p, sel, t = 1.7, draw = true) {
  await p.locator(sel).click();
  await advance(p, t, draw);
  return pageState(p);
}
async function capture(p, id, chrome = false) {
  const hide = chrome
    ? null
    : await p.addStyleTag({
        content:
          'header,footer,#caption,#scope,#actions,#camera-tools,#compass,#scale,#credit,#marks {visibility:hidden!important}',
      });
  await p.screenshot({
    path: path.join(out, id + '.jpg'),
    type: 'jpeg',
    quality: 92,
    timeout: 120000,
    clip: chrome ? undefined : await p.locator('#view').boundingBox(),
  });
  if (hide) await hide.evaluate((el) => el.remove());
}
let browser;
async function open(width, height, touch, lang, proof = true) {
  const c = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: touch,
    hasTouch: touch,
    offline: true,
  });
  const p = await c.newPage();
  p.on('pageerror', (e) => result.errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') result.errors.push(m.text());
  });
  p.on('request', (r) => {
    if (/^https?:/i.test(r.url())) result.requests.push(r.url());
  });
  await p.goto(pathToFileURL(path.resolve(file)).href + (proof ? '?proof' : ''), {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });
  await p.waitForFunction(() => document.body.dataset.ready || document.body.dataset.error, null, {
    timeout: 180000,
  });
  assert.equal(await p.locator('body').getAttribute('data-error'), null);
  if (proof) await p.evaluate(() => cityProof.freeze());
  assert.ok(await p.locator('#languages').isVisible());
  await p.locator('button[data-lang=' + lang + ']').click();
  return { c, p };
}
const pick = (id) => 'button[data-pocket=' + id + ']';
const act = (id) => 'button[data-act=' + id + ']';
const display = (id) => '#scope button[data-scope=' + id + ']';
async function scopeCheck(p, id, solo) {
  const before = await pageState(p),
    people = await p.evaluate(() => cityProof.population());
  await p.locator(display(solo ? 'pocket' : 'map')).click();
  const s = await pageState(p);
  assert.deepEqual(s.pose, before.pose);
  assert.equal(s.clock, before.clock);
  assert.deepEqual(s.state, before.state);
  assert.equal(s.mode, before.mode);
  assert.deepEqual(people, await p.evaluate(() => cityProof.population()));
  assert.equal(s.active, id);
  assert.equal(s.scope, solo ? id : null);
  assert.equal(s.contextVisible, !solo);
  assert.equal(s.visibleSites.length, solo ? 1 : 12);
  if (solo) {
    assert.deepEqual(s.visibleSites, [id]);
    assert.equal(s.sectionVisible, true);
  }
  assert.equal(await p.locator(display(solo ? 'pocket' : 'map')).getAttribute('aria-pressed'), 'true');
  return s;
}
async function walk(p, from, to) {
  await press(p, pick(from));
  await scopeCheck(p, from, true);
  const before = await pageState(p);
  await press(p, act('walk'), 1.01, false);
  const positions = [],
    owners = [];
  for (let i = 0; i <= 23; i++) {
    const s = await pageState(p);
    assert.equal(s.scope, null);
    assert.ok(s.eye[1] >= 1.32 && s.eye[1] < 2.18, 'clear pavement at ' + s.eye);
    if (i < 23) assert.equal(s.mode, 'crossing');
    if (i) assert.ok(Math.hypot(s.eye[0] - positions.at(-1)[0], s.eye[2] - positions.at(-1)[2]) < 3.9);
    positions.push(s.eye);
    owners.push(await p.evaluate(([x, , z]) => cityProof.placeAt(x, z), s.eye));
    if (i < 23) await advance(p, 1, false);
  }
  const end = await pageState(p);
  assert.equal(end.active, to);
  assert.equal(end.mode, 'walk');
  assert.equal(end.state.index, before.state.index);
  assert.ok(end.peopleTime > before.peopleTime + 22);
  assert.ok(owners.includes(from) && owners.includes(to));
  assert.ok(owners.every((o) => o === from || o === to));
  result.walks.push({
    from,
    to,
    sampleCount: positions.length,
    lengthMetres: positions.reduce(
      (n, v, i) => n + (i ? Math.hypot(v[0] - positions[i - 1][0], v[2] - positions[i - 1][2]) : 0),
      0,
    ),
    eyes: positions,
  });
}
async function run() {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.POCKET_BROWSER || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const { c, p } = await open(1480, 940, false, 'zh');
  const initial = await pageState(p);
  assert.equal(initial.sites.length, 12);
  assert.ok(await p.locator('#scope').isHidden());
  await capture(p, 'city', true);
  for (const id of initial.sites) {
    await press(p, pick(id), 1.8, false);
    await scopeCheck(p, id, true);
    await scopeCheck(p, id, false);
    result.scopes.push(id);
  }
  for (const [id, views] of Object.entries({
    balliol: ['waterhouse', 'butterfield', 'hallgarden'],
    trinity: ['irongate', 'frontclock', 'wrencourt', 'weston'],
  })) {
    await press(p, pick(id));
    await scopeCheck(p, id, true);
    await press(p, act('overview'));
    await capture(p, id + '-solo');
    await scopeCheck(p, id, false);
    await capture(p, id + '-map');
    for (const v of views) {
      const s = await press(p, act(v));
      assert.equal(s.mode, v);
      assert.ok(s.eye[1] >= 1.3 && s.eye[1] < 2.3, v + ' eye ' + s.eye);
      result.views[v] = { id, eye: s.eye };
      await capture(p, v);
    }
  }
  await press(p, pick('trinity'));
  await press(p, act('irongate'));
  const camera = (await pageState(p)).pose;
  for (let i = 0; i < 4; i++) {
    const s = await press(p, 'button[data-season="' + i + '"]', 3.3);
    assert.deepEqual(s.pose, camera);
    assert.ok(s.state.weights[i] > 0.99);
    await capture(p, 'gates-' + i);
  }
  await press(p, '#time-of-day', 3.6);
  await p.locator('#weather').click();
  await p.locator('#wet').click();
  await p.locator('#snow').click();
  await p.locator('#weather').click();
  await advance(p, 4);
  const winter = await scopeCheck(p, 'trinity', true);
  assert.ok(winter.state.load > 0 && winter.state.rain && winter.state.night);
  await capture(p, 'winter-night-solo');
  await walk(p, 'balliol', 'trinity');
  await walk(p, 'trinity', 'balliol');
  await press(p, pick('magdalen'));
  await scopeCheck(p, 'magdalen', true);
  await press(p, act('overview'));
  const stored = await pageState(p);
  await press(p, act('may'), 3);
  await press(p, act('end'), 0);
  const returned = await pageState(p);
  assert.deepEqual(returned.pose, stored.pose);
  assert.equal(returned.scope, 'magdalen');
  assert.equal(returned.state.index, stored.state.index);
  assert.equal(returned.state.snowOn, true);
  assert.equal(returned.state.night, true);
  await p.locator('#lang').click();
  await p.locator('[data-lang=en]').click();
  assert.match(await p.title(), /Twelve/);
  assert.equal(await p.locator(display('pocket')).innerText(), 'Pocket only');
  await press(p, '#time-of-day', 3.5);
  await p.locator('#weather').click();
  await p.locator('#snow').click();
  await p.locator('#wet').click();
  await p.locator('#weather').click();
  await press(p, 'button[data-season="0"]', 3.2);
  await capture(p, 'magdalen-solo', true);
  await press(p, '#back');
  assert.equal((await pageState(p)).active, 'city');
  assert.deepEqual((await pageState(p)).pose, initial.pose);
  const labels = await p.addStyleTag({ content: '#marks{visibility:hidden!important}' });
  for (const [id, peak] of [
    ['balliol', [-746, 26.36, -284.9]],
    ['trinity', [-738, 20.2, -362.5]],
  ]) {
    const a = await p.evaluate((v) => cityProof.project(...v), peak);
    await p.mouse.click(...a);
    await advance(p, 1.7);
    assert.equal((await pageState(p)).active, id, 'roof ' + id);
    await press(p, '#back');
  }
  await labels.evaluate((e) => e.remove());
  await c.close();
  const { p: m, c: phone } = await open(390, 844, true, 'en');
  await m.locator(pick('balliol')).tap();
  await advance(m, 1.7);
  await m.locator(display('pocket')).tap();
  await m.locator(act('overview')).tap();
  await advance(m, 1.7);
  await capture(m, 'phone', true);
  const session = await phone.newCDPSession(m);
  const gesture = (type, points) =>
    session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], i) => ({ id: i + 1, x, y, radiusX: 3, radiusY: 3 })),
    });
  const az = (await pageState(m)).pose.az;
  await gesture('touchStart', [[120, 330]]);
  await gesture('touchMove', [[169, 335]]);
  await gesture('touchEnd', []);
  assert.ok(Math.abs((await pageState(m)).pose.az - az) > 8);
  const span = (await pageState(m)).pose.span;
  await gesture('touchStart', [
    [135, 318],
    [208, 327],
  ]);
  for (let k = 1; k < 6; k++)
    await gesture('touchMove', [
      [135 - k * 5, 318],
      [208 + k * 7, 327],
    ]);
  await gesture('touchEnd', []);
  assert.ok((await pageState(m)).pose.span < span * 0.8);
  await m.locator('button[data-season="2"]').tap();
  await advance(m, 3.2);
  await m.locator(pick('trinity')).tap();
  await advance(m, 1.7);
  await m.locator(act('frontclock')).tap();
  await advance(m, 1.7);
  assert.equal((await pageState(m)).scope, 'trinity');
  assert.equal((await pageState(m)).state.index, 2);
  for (const w of [320, 360, 375, 390, 650, 768, 920, 1120, 1366]) {
    await m.setViewportSize({ width: w, height: 844 });
    await m.waitForTimeout(80);
    const bad = await m.locator('footer button,#scope button,#actions button').evaluateAll(
      (bs, w) =>
        bs.flatMap((b) => {
          const r = b.getBoundingClientRect(),
            hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return b.contains(hit) &&
            r.left >= -0.5 &&
            r.right <= innerWidth + 0.5 &&
            r.top >= 0 &&
            r.bottom <= innerHeight + 1 &&
            (w > 650 || (r.width >= 43 && r.height >= 43))
            ? []
            : [b.textContent, r.width, r.height];
        }),
      w,
    );
    assert.deepEqual(bad, [], 'controls at ' + w);
    result.layouts.push(w);
  }
  for (const [width, height] of [
    [320, 568],
    [375, 667],
  ]) {
    await m.setViewportSize({ width, height });
    await m.locator(pick('trinity')).tap();
    await advance(m, 1.65, false);
    await m.locator(act('weston')).tap();
    await advance(m, 1.65);
    assert.equal((await pageState(m)).mode, 'weston');
    assert.ok(
      await m.locator('#credit').evaluate((b) => {
        const r = b.getBoundingClientRect();
        return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }),
    );
  }
  result.compactPortrait = [
    [320, 568],
    [375, 667],
  ];
  await m.setViewportSize({ width: 3440, height: 1270 });
  await m.locator(pick('balliol')).click();
  await advance(m, 1.7);
  await m.locator(act('waterhouse')).click();
  await advance(m, 1.7);
  const peak = await m.evaluate(() => cityProof.project(-746, 27.32, -284.1)),
    stage = await m.locator('#view').boundingBox();
  assert.ok(peak[1] > 12 && peak[1] < stage.height - 20);
  result.ultrawidePeak = peak;
  await phone.close();
  const normal = await open(960, 750, false, 'en', false);
  await normal.p.locator(pick('trinity')).click();
  await normal.p.locator(display('pocket')).click();
  assert.equal(await normal.p.locator('body').getAttribute('data-display'), 'pocket');
  assert.equal(await normal.p.evaluate(() => typeof window.cityProof), 'undefined');
  await normal.c.close();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.requests, []);
  result.passed = true;
}
run()
  .catch((e) => {
    console.error(e);
    result.failure = String(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(path.join(out, 'twelve-browser.json'), JSON.stringify(result, null, 2));
    await browser?.close();
  });
