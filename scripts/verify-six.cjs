// Exercise both languages and the *registered* nest entrances over complete
// arrivals, dwell, departure and migration. All inputs operate the public UI.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const file = pathToFileURL(path.resolve(process.argv[2] || 'dist/index.html')).href;
const out = path.resolve(process.argv[3] || 'verification');
const opts = {
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
};
if (process.env.POCKET_BROWSER) opts.executablePath = process.env.POCKET_BROWSER;
fs.mkdirSync(out, { recursive: true });
const result = { cases: [], errors: [], httpRequests: [], realPhones: 0 };
const pass = (n) => {
  result.cases.push(n);
  console.log('PASS', n);
};
const click = (p, q) => p.locator(q).click(),
  place = (p, k) => click(p, 'button[data-pocket="' + k + '"]'),
  act = (p, k) => click(p, '[data-act="' + k + '"]');
const read = (p) => p.evaluate(() => cityProof.read()),
  advance = (p, t) => p.evaluate((t) => cityProof.advance(t), t);
const shot = (p, n) =>
  p.screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 92, timeout: 90000 });
function watch(p) {
  p.on('pageerror', (e) => result.errors.push(String(e)));
  p.on('console', (m) => {
    if (m.type() === 'error') result.errors.push(m.text());
  });
  p.on('request', (r) => {
    if (/^https?:/.test(r.url())) result.httpRequests.push(r.url());
  });
}
async function load(p) {
  await p.goto(file + '?proof', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.cityProof || document.body.dataset.error, null, { timeout: 100000 });
  await p.evaluate(() => cityProof.freeze());
}
async function choose(p, lang) {
  await click(p, '[data-lang="' + lang + '"]');
  assert.equal(await p.locator('html').getAttribute('lang'), lang === 'zh' ? 'zh-CN' : 'en');
}
async function run() {
  const browser = await chromium.launch(opts);
  result.browser = browser.version();
  try {
    const c = await browser.newContext({
        offline: true,
        viewport: { width: 1220, height: 810 },
        deviceScaleFactor: 1,
      }),
      p = await c.newPage();
    watch(p);
    await load(p);
    assert.ok(await p.locator('#languages').isVisible());
    await shot(p, 'language');
    await choose(p, 'en');
    assert.match(await p.title(), /Twelve neighbourhoods/);
    assert.equal(await p.locator('[data-season="0"]').innerText(), 'Spring');
    await place(p, 'museum');
    await advance(p, 1.6);
    assert.match(await p.locator('#place-name').innerText(), /Museum of Natural History/);
    await shot(p, 'museum');
    await act(p, 'walk');
    await advance(p, 11);
    await shot(p, 'museum-door');
    assert.ok((await read(p)).eye[1] < 3.4);
    await act(p, 'glass');
    await advance(p, 1.5);
    await shot(p, 'museum-glass');
    await act(p, 'nest');
    await advance(p, 1.5);
    const saved = await read(p);
    assert.equal(saved.mode, 'nest');
    assert.equal(saved.nests, 46);
    const observations = await p.evaluate(() => {
      const phases = new Set(),
        seen = new Map(),
        path = [];
      let before = null,
        insideCount = 0,
        closest = 99,
        emerged = false,
        arrived = false,
        owner = cityProof.read().swifts.watch;
      for (let i = 0; i < 420; i++) {
        cityProof.advance(0.1, false);
        const b = cityProof.read().swifts.birds[owner];
        phases.add(b.phase);
        if (b.phase === 'entering' && b.visible) closest = Math.min(closest, b.distance);
        if (b.phase === 'inNest') {
          insideCount++;
          if (before === 'entering') arrived = true;
          if (b.visible) throw new Error('visible inside nest');
        }
        if (before === 'inNest' && b.phase === 'leaving') emerged = true;
        if (i % 8 === 0) path.push([b.phase, +b.distance.toFixed(2)]);
        before = b.phase;
      }
      cityProof.advance(0);
      return { phases: [...phases], insideCount, closest, arrived, emerged, owner, path };
    });
    assert.ok(
      observations.arrived &&
        observations.emerged &&
        observations.insideCount > 10 &&
        observations.closest < 0.23,
    );
    assert.ok(
      ['leaving', 'climbing', 'circling', 'approaching', 'entering', 'inNest'].every((k) =>
        observations.phases.includes(k),
      ),
    );
    result.swift = observations;
    pass('Spring swift flies an entire circuit, passes the mouth, dwells out of sight and departs');
    await click(p, '[data-season="1"]');
    await advance(p, 3.3);
    const summer = await read(p);
    assert.equal(summer.swifts.weight, 1);
    assert.deepEqual(summer.pose, saved.pose);
    for (const k of [2, 3]) {
      await click(p, '[data-season="' + k + '"]');
      await advance(p, 3.3);
      const cold = await read(p);
      assert.ok(cold.swifts.birds.every((b) => !b.visible));
      assert.match(await p.locator('#place-desc').innerText(), /migrated/);
    }
    await click(p, '[data-season="1"]');
    await advance(p, 3.2);
    await click(p, '#lang');
    const prior = await read(p);
    await choose(p, 'zh');
    const after = await read(p);
    assert.deepEqual(prior.pose, after.pose);
    assert.deepEqual(prior.swifts, after.swifts);
    assert.deepEqual(prior.state, after.state);
    assert.match(await p.locator('#place-desc').innerText(), /雨燕/);
    pass('Summer activity, autumn/winter absence and an in-place language switch');
    // Centre one arriving swift in the same physical observation view for a motion strip.
    await act(p, 'overview');
    await advance(p, 1.4);
    await act(p, 'nest');
    await advance(p, 1.45);
    const chosen = await p.evaluate(() => {
      let b;
      for (let i = 0; i < 520; i++) {
        b = cityProof.read().swifts;
        const o = b.birds[b.watch];
        if (o.phase === 'entering' && o.distance < 3.25 && o.distance > 2.65) break;
        cityProof.advance(0.04, false);
      }
      cityProof.advance(0);
      const s = cityProof.read().swifts;
      return s.birds[s.watch];
    });
    assert.equal(chosen.phase, 'entering');
    assert.ok(chosen.visible);
    const clip = await p.evaluate(() => {
      const s = cityProof.read().swifts,
        b = s.birds[s.watch],
        m = cityProof.project(...b.mouth),
        pos = cityProof.project(...b.position);
      const x = Math.min(Math.max(0, Math.round((m[0] + pos[0]) * 0.5 - 287)), innerWidth - 574);
      const y = Math.min(Math.max(75, Math.round((m[1] + pos[1]) * 0.5 - 170)), innerHeight - 450);
      return { x, y, width: 574, height: 340 };
    });
    const framesDir = path.join(out, 'swift-frames');
    fs.mkdirSync(framesDir, { recursive: true });
    const clearFrame = await p.addStyleTag({
      content: '#caption,#actions,header,#camera-tools,#compass,#marks{visibility:hidden!important}',
    });
    for (let i = 0; i < 28; i++) {
      await p.screenshot({
        path: path.join(framesDir, String(i).padStart(2, '0') + '.jpg'),
        type: 'jpeg',
        quality: 90,
        clip,
      });
      if (i === 11) await shot(p, 'museum-swift');
      await advance(p, 0.075);
    }
    await clearFrame.evaluate((el) => el.remove());
    await place(p, 'castle');
    await advance(p, 1.5);
    await shot(p, 'castle');
    await act(p, 'prison');
    await advance(p, 1.5);
    await shot(p, 'prison');
    let pose = await read(p);
    assert.ok(pose.eye[1] < 6.2);
    await act(p, 'mound');
    await advance(p, 1.5);
    await shot(p, 'mound');
    pose = await read(p);
    assert.ok(pose.eye[1] >= 19 && pose.eye[1] < 22);
    await act(p, 'walk');
    await advance(p, 11.5);
    await shot(p, 'castle-yard');
    pose = await read(p);
    assert.ok(pose.eye[1] < 3.2);
    pass('Castle Yard street height, former prison façade and 18 m motte summit viewpoints');
    for (const [id, action, name] of [
      ['radcliffe', 'north', 'square-north'],
      ['christ', 'court', 'tom-quad'],
      ['market', 'walk', 'covered-aisle'],
      ['magdalen', 'cloister', 'magdalen-cloister'],
    ]) {
      await place(p, id);
      await advance(p, 1.5);
      await act(p, action);
      await advance(p, action === 'walk' ? 9 : 1.5);
      await shot(p, name);
    }
    await click(p, '#back');
    await advance(p, 1.5);
    await shot(p, 'six-places');
    await place(p, 'christ');
    await advance(p, 1.5);
    const dailyPose = (await read(p)).pose;
    await act(p, 'bell');
    await advance(p, 8);
    const beforeLanguage = await read(p);
    await click(p, '#lang');
    await choose(p, 'en');
    const afterLanguage = await read(p);
    assert.equal(afterLanguage.state.event, 'bell');
    assert.equal(beforeLanguage.bell, afterLanguage.bell);
    assert.deepEqual(beforeLanguage.pose, afterLanguage.pose);
    assert.deepEqual(beforeLanguage.state, afterLanguage.state);
    assert.match(await p.locator('#place-desc').innerText(), /Toll \d+ of 101/);
    await act(p, 'end');
    await advance(p, 1.5);
    assert.deepEqual((await read(p)).pose, dailyPose);
    pass('Language changes during Great Tom preserve the live event and its return camera');
    await click(p, '#info');
    assert.match(await p.locator('#sources').innerText(), /Unsurveyed heights/);
    await click(p, '#sources .x');
    await load(p);
    assert.equal(await p.locator('html').getAttribute('lang'), 'en');
    assert.ok(!(await p.locator('#languages').isVisible()));
    pass('English defaults on reopening and complete translated sources remain accessible');
    await c.close();
    for (const width of [320, 393]) {
      const mobile = await browser.newContext({
          offline: true,
          viewport: { width, height: 852 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 1,
        }),
        m = await mobile.newPage();
      watch(m);
      await load(m);
      await choose(m, 'en');
      assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const id of ['museum', 'castle']) {
        const b = m.locator('button[data-pocket="' + id + '"]');
        const rect = await b.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 0.4 && rect.height >= 44);
        await b.tap();
        await advance(m, 1.5);
        await m.locator('[data-act="' + (id === 'museum' ? 'nest' : 'mound') + '"]').tap();
        await advance(m, 1.5);
        assert.equal((await read(m)).active, id);
      }
      await m.locator('[data-season="2"]').tap();
      await m.locator('#weather').tap();
      assert.match(await m.locator('#weather-panel').innerText(), /Wet paving/);
      await m.locator('.dismiss').tap();
      if (width === 393) await shot(m, 'english-portrait');
      await mobile.close();
    }
    pass('English on 320 px and 393 px simulated phones, one-thumb site, view, season and weather controls');
    assert.deepEqual(result.httpRequests, []);
    assert.deepEqual(result.errors, []);
    pass('No live requests or browser errors');
  } finally {
    fs.writeFileSync(path.join(out, 'six-places.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
