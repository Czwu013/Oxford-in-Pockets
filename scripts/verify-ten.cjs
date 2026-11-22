const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const [file, folder] = process.argv.slice(2),
  out = path.resolve(folder || 'verification/colleges');
fs.mkdirSync(out, { recursive: true });
const result = {
  views: {},
  walks: {},
  roofs: {},
  seasons: [],
  screens: [],
  errors: [],
  requests: [],
  physicalPhones: 0,
};
const read = (p) => p.evaluate(() => cityProof.read());
const advance = (p, t, draw = true) => p.evaluate(([s, d]) => cityProof.advance(s, d), [t, draw]);
let browser;
async function open(w, h, touch, lang) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    offline: true,
    isMobile: touch,
    hasTouch: touch,
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => {
    result.errors.push(e.message);
    console.error(e.message);
  });
  p.on('console', (m) => {
    if (m.type() === 'error') {
      result.errors.push(m.text());
      console.error(m.text().slice(0, 400));
    }
  });
  p.on('request', (r) => {
    if (/^https?:/.test(r.url())) result.requests.push(r.url());
  });
  await p.goto(pathToFileURL(path.resolve(file)).href + '?proof', {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });
  await p.waitForFunction(() => window.cityProof || document.body.dataset.error, null, { timeout: 180000 });
  assert.equal(await p.locator('body').getAttribute('data-error'), null);
  await p.evaluate(() => cityProof.freeze());
  await p.locator('[data-lang="' + lang + '"]').click();
  return { p, ctx };
}
async function snap(p, id, ui = false) {
  const style =
    !ui &&
    (await p.addStyleTag({
      content:
        'header,footer,#caption,#actions,#camera-tools,#compass,#scale,#credit,#marks{visibility:hidden!important}',
    }));
  await p.screenshot({
    path: path.join(out, id + '.png'),
    clip: ui ? undefined : await p.locator('#view').boundingBox(),
    timeout: 120000,
  });
  if (style) await style.evaluate((e) => e.remove());
}
async function click(p, selector, seconds = 1.7) {
  await p.locator(selector).click();
  await advance(p, seconds);
  return read(p);
}
async function run() {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.POCKET_BROWSER || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const { p, ctx } = await open(1200, 825, false, 'en');
  const initial = await read(p);
  assert.equal(initial.sites.length, 12);
  assert.match(await p.title(), /Twelve neighbourhoods/);
  await snap(p, 'city', true);
  const places = {
    newcollege: ['oakcourt', 'cloisterwalk', 'wallgarden'],
    merton: ['mobquad', 'mertontower', 'fellowscourt'],
  };
  for (const [id, views] of Object.entries(places)) {
    let state = await click(p, 'button[data-pocket="' + id + '"]');
    assert.equal(state.active, id);
    await snap(p, id);
    state = await click(p, '[data-act="core"]');
    await snap(p, id + '-core');
    for (const view of views) {
      state = await click(p, '[data-act="' + view + '"]');
      assert.equal(state.mode, view);
      assert.ok(state.eye[1] >= 1.5 && state.eye[1] < 3.2, view + ': ' + state.eye);
      result.views[view] = { eye: state.eye, triangles: state.triangles };
      if (['oakcourt', 'mobquad', 'mertontower'].includes(view)) {
        const apex = view === 'oakcourt' ? [-416.2, 32.3, -295.1] : [-437.0, 37.45, 103.22];
        const at = await p.evaluate((a) => cityProof.project(...a), apex),
          bounds = await p.locator('#view').boundingBox();
        assert.ok(
          at[0] > bounds.x + 6 &&
            at[0] < bounds.x + bounds.width - 6 &&
            at[1] > bounds.y + 5 &&
            at[1] < bounds.y + bounds.height - 5,
          'tower framing ' + view + ' ' + at,
        );
        result.views[view].topInFrame = at;
      }
      await snap(p, view);
    }
    await p.locator('[data-act="walk"]').click();
    await advance(p, 1.5);
    const heights = [];
    for (let i = 0; i < 14; i++) {
      await advance(p, 0.8, false);
      heights.push((await read(p)).eye[1]);
    }
    assert.ok(Math.max(...heights) < 3.1, id + ' walk height ' + heights);
    result.walks[id] = heights;
  }
  const garden = await click(p, '[data-act="overview"]');
  assert.equal(garden.active, 'merton');
  for (let i = 0; i < 4; i++) {
    const season = await click(p, '[data-season="' + i + '"]', 2.85);
    assert.deepEqual(season.pose, garden.pose);
    assert.equal(season.state.snowOn, false);
    await snap(p, 'merton-season-' + i);
  }
  await click(p, '[data-season="0"]', 2.85);
  await click(p, 'button[data-pocket="newcollege"]');
  let s = await click(p, '[data-act="oakcourt"]');
  const pose = s.pose,
    t0 = s.peopleTime;
  for (let i = 0; i < 4; i++) {
    await p.locator('[data-season="' + i + '"]').click();
    await advance(p, 2.85);
    s = await read(p);
    assert.equal(s.mode, 'oakcourt');
    assert.deepEqual(s.pose, pose);
    assert.ok(s.state.weights[i] > 0.99);
    await snap(p, 'oak-' + i);
    result.seasons.push({ season: i, eye: s.eye, peopleTime: s.peopleTime });
  }
  assert.ok(s.peopleTime > t0);
  assert.equal(s.state.snowOn, false);
  await p.locator('#weather').click();
  await p.locator('#snow').click();
  if (await p.locator('#weather-panel').isVisible()) await p.locator('#weather').click();
  await advance(p, 3.0);
  const early = (await read(p)).state.load;
  await advance(p, 22);
  const later = (await read(p)).state.load;
  assert.ok(later > early && early > 0);
  result.snow = [early, later];
  await snap(p, 'oak-snow');
  s = await click(p, '#time-of-day', 3.5);
  assert.ok(s.state.night);
  assert.deepEqual(s.pose, pose);
  await snap(p, 'oak-night');
  await p.locator('#lang').click();
  await p.locator('[data-lang="zh"]').click();
  assert.match(await p.locator('#place-name').innerText(), /新学院/);
  assert.ok((await read(p)).state.night);
  result.languageSwitch = true;
  await click(p, '#time-of-day', 3.5);
  await click(p, '[data-season="0"]', 3);
  const mask = await p.addStyleTag({ content: '#marks{visibility:hidden!important}' });
  for (const [id, coords] of Object.entries({
    newcollege: [-411.6, 30.15, -298.3],
    merton: [-431.1, 32.05, 95.5],
  })) {
    await click(p, '#back');
    const [x, y] = await p.evaluate((a) => cityProof.project(...a), coords);
    await p.mouse.click(x, y);
    await advance(p, 1.65);
    result.roofs[id] = (await read(p)).active;
    assert.equal(result.roofs[id], id, 'physical roof ' + id);
  }
  await mask.evaluate((e) => e.remove());
  await p.setViewportSize({ width: 3440, height: 1270 });
  await p.waitForTimeout(100);
  result.ultrawide = {};
  for (const [id, view, peak] of [
    ['newcollege', 'oakcourt', [-416.2, 32.3, -295.1]],
    ['merton', 'mobquad', [-437.0, 37.45, 103.22]],
    ['merton', 'mertontower', [-437.0, 37.45, 103.22]],
  ]) {
    await click(p, 'button[data-pocket="' + id + '"]');
    await click(p, '[data-act="' + view + '"]');
    const screen = await p.evaluate((c) => cityProof.project(...c), peak),
      box = await p.locator('#view').boundingBox();
    assert.ok(
      screen[0] > 15 &&
        screen[0] < box.width - 15 &&
        screen[1] > box.y + 10 &&
        screen[1] < box.y + box.height - 10,
    );
    result.ultrawide[view] = screen;
  }
  await ctx.close();
  const { p: m, ctx: phone } = await open(390, 844, true, 'en');
  const label = await m.locator('[data-mark="newcollege"]').boundingBox(),
    track = await phone.newCDPSession(m);
  const x = label.x + label.width / 2,
    y = label.y + label.height / 2,
    dir = x > 195 ? -1 : 1;
  const touch = (type, points) =>
    track.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], i) => ({ id: i + 1, x, y, radiusX: 3, radiusY: 3 })),
    });
  const before = (await read(m)).pose;
  await touch('touchStart', [
    [x, y],
    [x + dir * 58, y],
  ]);
  for (let i = 1; i <= 6; i++)
    await touch('touchMove', [
      [x - dir * i * 2, y],
      [x + dir * (58 + i * 5), y],
    ]);
  await touch('touchEnd', []);
  const pinched = await read(m);
  assert.equal(pinched.active, 'city');
  assert.ok(pinched.pose.span < before.span * 0.78);
  result.pinchAcrossMapLabel = true;
  await m.locator('#back').tap();
  await advance(m, 1.7);
  for (const w of [320, 390, 650, 768, 920, 1024]) {
    await m.setViewportSize({ width: w, height: 844 });
    await m.waitForTimeout(130);
    const geom = await m.locator('footer button').evaluateAll((buttons) =>
      buttons.map((b) => {
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return {
          ok: b.contains(hit) && r.left >= -0.5 && r.right <= innerWidth + 0.5,
          width: r.width,
          height: r.height,
          label: b.textContent.trim(),
        };
      }),
    );
    assert.ok(
      geom.every((b) => b.ok),
      'footer at ' + w + ': ' + JSON.stringify(geom.filter((b) => !b.ok)),
    );
    if (w <= 650)
      assert.ok(
        geom.every((b) => b.height >= 43 && b.width >= 43),
        'touch size ' + w + ': ' + JSON.stringify(geom.filter((b) => b.height < 43 || b.width < 43)),
      );
    result.screens.push(w);
  }
  await m.setViewportSize({ width: 390, height: 844 });
  for (const [id, mode] of [
    ['newcollege', 'wallgarden'],
    ['merton', 'mobquad'],
  ]) {
    await m.locator('button[data-pocket="' + id + '"]').tap();
    await advance(m, 1.65);
    await m.locator('[data-act="' + mode + '"]').tap();
    await advance(m, 1.65);
    await m.locator('[data-season="2"]').tap();
    await advance(m, 2.85);
    const s = await read(m);
    assert.equal(s.active, id);
    assert.equal(s.mode, mode);
    assert.equal(s.state.index, 2);
  }
  await snap(m, 'phone', true);
  result.touch = true;
  await phone.close();
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
    fs.writeFileSync(path.join(out, 'ten-browser.json'), JSON.stringify(result, null, 2));
    await browser?.close();
  });
