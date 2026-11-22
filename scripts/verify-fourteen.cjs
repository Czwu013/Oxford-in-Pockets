const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const [entry, output = 'verification/fourteen'] = process.argv.slice(2);
const url = pathToFileURL(path.resolve(entry)).href;
fs.mkdirSync(output, { recursive: true });
const report = {
  errors: [],
  external: [],
  scopes: [],
  views: {},
  walks: [],
  layouts: [],
  photo: [],
  physicalPhones: 0,
};
const views = {
  queens: ['caroline', 'queenarcade', 'queenlibrary', 'petrine'],
  univ: ['univgate', 'univcourt', 'radcourt', 'logic', 'exams'],
};
let browser;
const state = (p) => p.evaluate(() => cityProof.read());
const advance = (p, sec, draw = false) => p.evaluate(([t, d]) => cityProof.advance(t, d), [sec, draw]);
const act = (k) => '[data-act="' + k + '"]';
async function select(p, id) {
  if (await p.locator('#place-menu').isVisible()) await p.selectOption('#place-menu', id);
  else await p.click('button[data-pocket="' + id + '"]');
  await advance(p, 1.72, true);
}
async function press(p, selector, sec = 0, draw = false) {
  await p.locator(selector).click();
  if (sec > 0 || draw) await advance(p, sec, draw);
  return state(p);
}
async function snapshot(p, name, ui = false) {
  const style = ui
    ? null
    : await p.addStyleTag({
        content:
          'header, footer,#scope,#actions,#caption,#camera-tools,#marks,#credit,#scale,#compass {visibility:hidden!important}',
      });
  await p.screenshot({
    path: path.join(output, name + '.jpg'),
    quality: 89,
    timeout: 120000,
    clip: ui ? undefined : await p.locator('#view').boundingBox(),
  });
  if (style) await style.evaluate((e) => e.remove());
}
async function waitForPhotoLayout(p, enabled) {
  await p.waitForFunction((on) => {
    const canvas = document.querySelector('#view');
    const expected = on ? innerHeight : document.querySelector('#stage').clientHeight;
    const rect = canvas.getBoundingClientRect();
    return (
      document.body.classList.contains('photo-mode') === on &&
      rect.x === 0 &&
      rect.y === 0 &&
      rect.width === innerWidth &&
      rect.height === expected &&
      canvas.width === rect.width &&
      canvas.height === expected
    );
  }, enabled);
}
async function switchPhoto(p, enabled, input = 'click') {
  const before = await state(p);
  const people = await p.evaluate(() => cityProof.population());
  const control = p.locator(enabled ? '#photo-mode' : '#restore-ui');
  if (input === 'Escape') await p.keyboard.press('Escape');
  else if (input === 'tap') await control.tap();
  else await control.click();
  await waitForPhotoLayout(p, enabled);
  await advance(p, 0, true);
  const after = await state(p);
  for (const key of ['pose', 'eye', 'clock', 'state', 'active', 'scope', 'mode', 'language']) {
    assert.deepEqual(after[key], before[key], (enabled ? 'enter ' : 'leave ') + 'photo mode: ' + key);
  }
  assert.deepEqual(await p.evaluate(() => cityProof.population()), people);
  assert.equal(await p.evaluate(() => document.activeElement.id), enabled ? 'restore-ui' : 'photo-mode');
  if (enabled) {
    assert.match(
      await p.locator('#view').evaluate((e) => getComputedStyle(e).backgroundImage),
      /^linear-gradient/,
    );
    const visible = await p
      .locator(
        'button:visible, a:visible, select:visible, dialog:visible, header:visible, footer:visible, #marks:visible, #caption:visible, #scope:visible, #actions:visible, #compass:visible, #scale:visible, #notice:visible',
      )
      .evaluateAll((els) => els.map((e) => e.id || e.tagName));
    assert.deepEqual(visible, ['restore-ui']);
    const bounds = await p.locator('#restore-ui').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x <= 24 && bounds.y >= 0 && bounds.y <= 24);
    assert.ok(bounds.height >= 44 && bounds.width >= 44);
    assert.equal(
      await p.locator('#restore-ui').innerText(),
      before.language === 'en' ? 'Show controls' : '恢复界面',
    );
    report.photo.push({
      place: before.active,
      scope: before.scope,
      mode: before.mode,
      language: before.language,
      viewport: p.viewportSize(),
    });
  } else {
    assert.equal(await p.locator('#restore-ui').isVisible(), false);
    assert.equal(await p.locator('#photo-mode').isVisible(), true);
  }
}
async function open(w, h, touch = false, proof = true) {
  const c = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
    offline: true,
  });
  const p = await c.newPage();
  await p.addInitScript(() => addEventListener('error', (e) => (window.__bootError = e.message)));
  p.on('pageerror', (e) => report.errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') report.errors.push(m.text());
  });
  p.on('request', (r) => {
    if (/^https?:/i.test(r.url())) report.external.push(r.url());
  });
  await p.goto(url + (proof ? '?proof' : ''), { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForFunction(
    () => window.__bootError || document.body.dataset.ready || document.body.dataset.error,
    null,
    { timeout: 180000 },
  );
  assert.equal(await p.evaluate(() => window.__bootError), undefined);
  assert.equal(await p.locator('body').getAttribute('data-error'), null);
  assert.equal(await p.locator('html').getAttribute('lang'), 'en');
  assert.equal(await p.locator('#languages').isVisible(), false);
  if (proof) await p.evaluate(() => cityProof.freeze());
  return { c, p };
}
async function scope(p, id, solo) {
  const s = await state(p),
    pop = await p.evaluate(() => cityProof.population());
  const after = await press(p, '[data-scope="' + (solo ? 'pocket' : 'map') + '"]');
  assert.deepEqual(after.pose, s.pose);
  assert.equal(after.clock, s.clock);
  assert.deepEqual(after.state, s.state);
  assert.deepEqual(await p.evaluate(() => cityProof.population()), pop);
  assert.equal(after.scope, solo ? id : null);
  assert.equal(after.contextVisible, !solo);
  assert.equal(after.visibleSites.length, solo ? 1 : 14);
  if (solo) {
    assert.deepEqual(after.visibleSites, [id]);
    assert.equal(after.sectionVisible, true);
  }
}
async function walk(p, from, to) {
  await select(p, from);
  if (!(await state(p)).scope) await scope(p, from, true);
  await press(p, act('walk'), 1.01);
  const eyes = [];
  for (let i = 0; i <= 50; i++) {
    const s = await state(p);
    assert.equal(s.scope, null);
    assert.ok(s.eye[1] >= 1.35 && s.eye[1] < 2.25, 'pavement clearance ' + s.eye);
    if (i < 50) assert.equal(s.mode, 'crossing');
    eyes.push(s.eye);
    if (i < 50) await advance(p, 1);
  }
  const s = await state(p);
  assert.equal(s.active, to);
  assert.equal(s.mode, 'walk');
  const distances = eyes.slice(1).map((e, i) => Math.hypot(e[0] - eyes[i][0], e[2] - eyes[i][2]));
  assert.ok(Math.max(...distances) < 4.8);
  const length = distances.reduce((a, b) => a + b, 0);
  assert.ok(length > 77 && length < 86, 'route metres ' + length);
  report.walks.push({ from, to, length, eyes });
}
async function run() {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.POCKET_BROWSER || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const { c, p } = await open(1440, 920);
  assert.equal((await state(p)).sites.length, 14);
  console.log('Running fourteen-place visual checks');
  await snapshot(p, 'city', true);
  await press(p, '#weather');
  await switchPhoto(p, true);
  const tower = await p.evaluate(() => cityProof.project(-28.2, 34, 19.8));
  await p.mouse.click(...tower);
  assert.equal((await state(p)).active, 'city');
  const cityCamera = (await state(p)).pose;
  await p.mouse.move(480, 510);
  await p.mouse.down();
  await p.mouse.move(535, 518, { steps: 3 });
  await p.mouse.up();
  await p.mouse.wheel(0, -90);
  await p.waitForFunction((span) => cityProof.read().pose.span < span, cityCamera.span);
  assert.ok(Math.abs((await state(p)).pose.az - cityCamera.az) > 8);
  await switchPhoto(p, false, 'Escape');
  assert.ok(await p.locator('#weather-panel').isVisible());
  await press(p, '#weather');
  await select(p, 'magdalen');
  await switchPhoto(p, true);
  await snapshot(p, 'photo-magdalen', true);
  await switchPhoto(p, false);
  await scope(p, 'magdalen', true);
  await press(p, act('overview'), 1.7, true);
  await snapshot(p, 'magdalen');
  await scope(p, 'magdalen', false);
  for (const [id, names] of Object.entries(views)) {
    await select(p, id);
    await snapshot(p, id + '-map');
    await scope(p, id, true);
    await advance(p, 0, true);
    await snapshot(p, id + '-solo');
    await press(p, act('overview'), 1.7, true);
    await snapshot(p, id + '-fit');
    await scope(p, id, false);
    for (const view of names) {
      const s = await press(p, act(view), 1.75, true);
      assert.equal(s.mode, view);
      assert.ok(s.eye[1] >= 1.35 && s.eye[1] < 2.45, view + ' clearance ' + s.eye);
      report.views[view] = { id, eye: s.eye };
      await snapshot(p, view);
    }
    console.log(id + ' rendered');
  }
  for (const id of (await state(p)).sites) {
    await select(p, id);
    await scope(p, id, true);
    await scope(p, id, false);
    report.scopes.push(id);
  }
  await walk(p, 'queens', 'univ');
  await walk(p, 'univ', 'queens');
  await select(p, 'univ');
  await press(p, act('radcourt'), 1.7, true);
  const camera = (await state(p)).pose;
  for (let i = 0; i < 4; i++) {
    const s = await press(p, '[data-season="' + i + '"]', 3.5, true);
    assert.deepEqual(s.pose, camera);
    assert.ok(s.state.weights[i] > 0.99);
    await snapshot(p, 'season-' + i);
  }
  await press(p, '#time-of-day', 3.6, true);
  await press(p, '#weather');
  await press(p, '#wet');
  await press(p, '#snow');
  await press(p, '#weather');
  await advance(p, 6, true);
  await scope(p, 'univ', true);
  let s = await state(p);
  assert.ok(s.state.night && s.state.load > 0 && s.state.rain);
  await snapshot(p, 'night', true);
  await switchPhoto(p, true);
  await switchPhoto(p, false);
  await select(p, 'magdalen');
  await press(p, act('may'), 2);
  await switchPhoto(p, true);
  const morning = (await state(p)).state.eventTime;
  await advance(p, 1.0, true);
  assert.ok((await state(p)).state.eventTime > morning);
  await switchPhoto(p, false, 'Escape');
  assert.equal((await state(p)).state.event, 'may');
  await press(p, act('end'), 2);
  s = await state(p);
  assert.ok(s.state.night && s.active === 'magdalen' && s.scope === 'magdalen');
  await c.close();
  const { c: m, p: t } = await open(390, 844, true);
  await select(t, 'univ');
  await press(t, '[data-scope="pocket"]');
  await press(t, act('overview'), 1.7, true);
  await snapshot(t, 'portrait', true);
  const cdp = await m.newCDPSession(t);
  const gesture = (type, points) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], i) => ({ id: i + 1, x, y, radiusX: 3, radiusY: 3 })),
    });
  async function touchCamera(y) {
    const az = (await state(t)).pose.az;
    await gesture('touchStart', [[120, y]]);
    await gesture('touchMove', [[176, y + 5]]);
    await gesture('touchEnd', []);
    assert.ok(Math.abs((await state(t)).pose.az - az) > 8);
    const span = (await state(t)).pose.span;
    await gesture('touchStart', [
      [125, y],
      [203, y + 4],
    ]);
    for (let i = 1; i <= 5; i++)
      await gesture('touchMove', [
        [125 - 6 * i, y],
        [203 + 6 * i, y + 4],
      ]);
    await gesture('touchEnd', []);
    assert.ok((await state(t)).pose.span < span * 0.83);
  }
  await touchCamera(310);
  await switchPhoto(t, true, 'tap');
  await touchCamera(784);
  await advance(t, 0, true);
  await snapshot(t, 'photo-portrait', true);
  await t.setViewportSize({ width: 844, height: 390 });
  await waitForPhotoLayout(t, true);
  await switchPhoto(t, false, 'tap');
  await t.setViewportSize({ width: 390, height: 844 });
  await waitForPhotoLayout(t, false);
  await t.locator('[data-season="2"]').tap();
  await advance(t, 3.6);
  await select(t, 'queens');
  await press(t, act('caroline'), 1.7, true);
  s = await state(t);
  assert.equal(s.scope, 'queens');
  assert.equal(s.state.index, 2);
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [650, 844],
    [768, 844],
    [920, 844],
    [1120, 844],
    [1366, 844],
    [1680, 970],
  ]) {
    await t.setViewportSize({ width, height });
    await t.waitForTimeout(90);
    const invalid = await t
      .locator('footer button:visible, footer select:visible, #scope button:visible, #photo-mode:visible')
      .evaluateAll(
        (els, w) =>
          els
            .filter((e) => {
              const r = e.getBoundingClientRect();
              return (
                r.left < -0.8 ||
                r.right > innerWidth + 0.8 ||
                r.top < 0 ||
                r.bottom > innerHeight + 0.8 ||
                !e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) ||
                (w <= 650 && (r.height < 43 || r.width < 42))
              );
            })
            .map((e) => [e.textContent.slice(0, 24), e.getBoundingClientRect().width]),
        width,
      );
    assert.deepEqual(invalid, [], 'layout ' + width);
    const headerFits = await t.evaluate(() => {
      const brand = document.querySelector('.brand').getBoundingClientRect();
      const camera = document.querySelector('#photo-mode').getBoundingClientRect();
      const info = document.querySelector('#info').getBoundingClientRect();
      return brand.right <= camera.left && info.right <= document.documentElement.clientWidth;
    });
    assert.ok(headerFits, 'header ' + width);
    report.layouts.push([width, height]);
  }
  await t.click('#lang');
  await t.click('[data-lang="zh"]');
  s = await state(t);
  assert.equal(s.language, 'zh-CN');
  assert.equal(s.active, 'queens');
  assert.equal(s.mode, 'caroline');
  assert.equal(await t.locator('#place-name').innerText(), '皇后学院与皇后巷');
  await t.setViewportSize({ width: 320, height: 568 });
  await waitForPhotoLayout(t, false);
  assert.equal(await t.locator('#photo-mode').getAttribute('aria-label'), '照片模式');
  await switchPhoto(t, true, 'tap');
  await switchPhoto(t, false, 'tap');
  await t.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
  await t.waitForFunction(() => document.body.dataset.ready, null, { timeout: 180000 });
  assert.equal(await t.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await t.locator('#languages').isVisible(), false);
  await t.click('#lang');
  await t.click('[data-lang="en"]');
  assert.equal(await t.locator('html').getAttribute('lang'), 'en');
  await m.close();
  const normal = await open(1050, 750, false, false);
  await normal.p.click('[data-pocket="univ"]');
  await normal.p.click('[data-scope="pocket"]');
  await normal.p.getByRole('button', { name: 'Photo mode' }).click();
  await waitForPhotoLayout(normal.p, true);
  assert.equal(await normal.p.locator('button:visible').count(), 1);
  await normal.p.getByRole('button', { name: 'Show controls' }).click();
  await waitForPhotoLayout(normal.p, false);
  assert.equal(await normal.p.locator('body').getAttribute('data-display'), 'pocket');
  assert.equal(await normal.p.evaluate(() => typeof window.cityProof), 'undefined');
  await normal.c.close();
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.external, []);
  report.passed = true;
}
run()
  .catch((e) => {
    console.error(e);
    report.failure = String(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(path.join(output, 'fourteen-browser.json'), JSON.stringify(report, null, 2));
    await browser?.close();
  });
