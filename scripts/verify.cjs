// Run against a built file. The browser context is offline throughout.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const entry = pathToFileURL(path.resolve(process.argv[2] || 'dist/index.html')).href,
  out = path.resolve(process.argv[3] || '.verification');
fs.mkdirSync(out, { recursive: true });
const result = { cases: [], requests: [], errors: [], physicalDevices: 0 };
const read = (p) => p.evaluate(() => cityProof.read()),
  adv = (p, dt) => p.evaluate((s) => cityProof.advance(s), dt);
const click = (p, q) => p.locator(q).click();
const pocket = (p, id) => click(p, 'button[data-pocket="' + id + '"]');
const act = (p, id) => click(p, '[data-act="' + id + '"]');
const season = (p, i) => click(p, '[data-season="' + i + '"]');
const near = (a, b, e = 0.0001) => Math.abs(a - b) < e;
function compare(a, b) {
  for (const k of Object.keys(a)) assert.ok(near(a[k], b[k]), k + ' failed ' + a[k] + ' versus ' + b[k]);
}
const yes = (n) => {
  result.cases.push(n);
  console.log('PASS', n);
};
async function screenshot(p, name) {
  await p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 90, timeout: 90000 });
}
function watch(p) {
  p.on('request', (r) => {
    if (/^https?:/.test(r.url())) result.requests.push(r.url());
  });
  p.on('pageerror', (e) => result.errors.push(String(e)));
  p.on('console', (m) => {
    if (m.type() === 'error') result.errors.push(m.text().slice(0, 500));
  });
}
async function load(p, proof = true) {
  watch(p);
  await p.goto(entry + (proof ? '?proof' : ''), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(
    () => document.body.dataset.ready === 'yes' || document.body.dataset.error,
    {},
    { timeout: 110000 },
  );
  assert.equal(await p.locator('body').getAttribute('data-error'), null);
  if (proof) await p.evaluate(() => cityProof.freeze());
  if(await p.locator('#languages').isVisible())await p.locator('[data-lang=zh]').click();
}
async function touchPair(client, points, type) {
  await client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4 })),
  });
}
async function main() {
  const opts = {
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  };
  if (process.env.POCKET_BROWSER) opts.executablePath = process.env.POCKET_BROWSER;
  const b = await chromium.launch(opts);
  result.browser = b.version();
  try {
    const desk = await b.newContext({
      viewport: { width: 1280, height: 840 },
      deviceScaleFactor: 1,
      offline: true,
    });
    const p = await desk.newPage();
    await load(p);
    const initial = await read(p);
    assert.equal(initial.active, 'city');
    assert.equal(initial.sites.length, 12);
    assert.ok(initial.cityBuildings > 1800);
    assert.equal(await p.locator('.mark:visible').count(), 12);
    result.desktop = [1280, 840];
    await screenshot(p, 'city');
    yes('Ten pockets share the offline 3D city');
    await p.mouse.move(410, 285);
    await p.mouse.down();
    await p.mouse.move(473, 300, { steps: 9 });
    await p.mouse.up();
    await adv(p, 0.02);
    const turned = (await read(p)).pose;
    assert.ok(Math.abs(turned.az - initial.pose.az) > 10);
    await p.mouse.move(650, 370);
    await p.mouse.wheel(0, -135);
    const custom = (await read(p)).pose;
    assert.ok(custom.span < turned.span);
    yes('Desktop rotation and cursor-centred wheel zoom');
    const physical = await p.evaluate(() => cityProof.project(-519.75, 28, -164.3));
    await p.mouse.click(...physical);
    assert.equal((await read(p)).active, 'radcliffe');
    await adv(p, 1.6);
    await screenshot(p, 'radcliffe');
    yes('Clicking the dome geometry focuses Radcliffe Square');
    const known = (await read(p)).pose;
    await season(p, 2);
    await adv(p, 1.25);
    const blend = await read(p);
    assert.ok(blend.state.weights[2] > 0.1 && blend.state.weights[2] < 0.99);
    compare(blend.pose, known);
    await adv(p, 2);
    await act(p, 'walk');
    await adv(p, 11.6);
    const radWalk = await read(p);
    assert.ok(radWalk.eye[1] > 2 && radWalk.eye[1] < 5);
    await screenshot(p, 'catte');
    yes('Autumn blends in place and the Catte Street route stays at street height');
    await click(p, '#back');
    await adv(p, 1.6);
    compare((await read(p)).pose, custom);
    assert.equal((await read(p)).state.index, 2);
    yes('Return restores the former overview pose and current season');
    await pocket(p, 'market');
    await adv(p, 1.6);
    await screenshot(p, 'market');
    await act(p, 'cut');
    await adv(p, 1.6);
    assert.ok((await read(p)).marketLift > 0.98);
    await screenshot(p, 'cut');
    await act(p, 'walk');
    await adv(p, 6);
    assert.ok((await read(p)).marketLift < 0.02);
    await screenshot(p, 'aisle');
    await adv(p, 7);
    const aisle = await read(p);
    assert.ok(aisle.eye[1] < 3 && aisle.eye[1] > 1.5);
    await act(p, 'opening');
    await adv(p, 12);
    assert.equal((await read(p)).state.event, 'opening');
    await act(p, 'end');
    compare((await read(p)).pose, aisle.pose);
    yes('Market roof, four avenues, indoor route and morning event restore');
    await pocket(p, 'christ');
    await adv(p, 1.6);
    await screenshot(p, 'christ');
    await act(p, 'walk');
    await adv(p, 2.6);
    const gate = await read(p);
    assert.ok(gate.eye[1] < 4.5);
    await screenshot(p, 'gate');
    await adv(p, 10);
    const court = await read(p);
    assert.ok(court.eye[0] > -685 && court.eye[1] < 4.5);
    await act(p, 'bell');
    await adv(p, 3);
    let event = await read(p);
    assert.equal(event.state.sounding, false);
    assert.equal(event.bell, 2);
    await act(p, 'sound');
    assert.equal((await read(p)).state.sounding, true);
    await act(p, 'sound');
    assert.equal((await read(p)).state.sounding, false);
    await screenshot(p, 'bell');
    await adv(p, 233);
    assert.equal((await read(p)).bell, 101);
    await adv(p, 5.5);
    const ended = await read(p);
    assert.equal(ended.state.event, false);
    compare(ended.pose, court.pose);
    yes('Walk through Tom Gate, muted Great Tom, 101 strikes and automatic return');
    await pocket(p, 'magdalen');
    await adv(p, 1.6);
    await screenshot(p, 'magdalen');
    await act(p, 'cloister');
    await adv(p, 1.6);
    const mag = await read(p);
    await act(p, 'may');
    await adv(p, 3);
    assert.equal((await read(p)).state.sounding, false);
    await act(p, 'sound');
    assert.equal((await read(p)).state.sounding, true);
    await act(p, 'end');
    compare((await read(p)).pose, mag.pose);
    await act(p, 'addison');
    await adv(p, 1.6);
    assert.equal((await read(p)).mode, 'addison');
    yes('Magdalen cloister, riverbank and opt-in May Morning return');
    await pocket(p, 'christ');
    await adv(p, 1.6);
    await season(p, 3);
    await click(p, '#weather');
    await click(p, '#snow');
    await click(p, '#wet');
    await click(p, '.dismiss');
    await adv(p, 3.6);
    const snow1 = await read(p);
    await adv(p, 18);
    const snow2 = await read(p);
    assert.ok(snow2.state.load > snow1.state.load + 0.25 && snow2.state.wet > 0.9);
    await click(p, '#weather');
    await click(p, '#snow');
    await click(p, '#auto');
    await click(p, '.dismiss');
    await adv(p, 40);
    const later = await read(p);
    assert.equal(later.state.index, 0);
    assert.ok(later.state.load < snow2.state.load);
    yes('Independent wetness, accumulating and melting snow, automatic four-season cycle');
    await desk.close();
    const phone = await b.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      offline: true,
    });
    const m = await phone.newPage();
    await load(m);
    result.portrait = [393, 852];
    await screenshot(m, 'portrait');
    const cdp = await phone.newCDPSession(m);
    const base = await read(m);
    await touchPair(cdp, [[135, 371, 1]], 'touchStart');
    await touchPair(cdp, [[200, 380, 1]], 'touchMove');
    await touchPair(cdp, [], 'touchEnd');
    assert.ok(Math.abs((await read(m)).pose.az - base.pose.az) > 5);
    const before = (await read(m)).pose;
    await touchPair(
      cdp,
      [
        [155, 390, 1],
        [238, 390, 2],
      ],
      'touchStart',
    );
    for (let i = 1; i <= 5; i++)
      await touchPair(
        cdp,
        [
          [155 - i * 6, 390, 1],
          [238 + i * 6, 390, 2],
        ],
        'touchMove',
      );
    await touchPair(cdp, [], 'touchEnd');
    assert.ok((await read(m)).pose.span < before.span * 0.8);
    await m.locator('[data-season="1"]').tap();
    for (const id of ['magdalen', 'radcliffe', 'market', 'christ','museum','castle']) {
      const t = m.locator('button[data-pocket="' + id + '"]');
      const box = await t.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 43 && box.y > 650 && box.x >= 0 && box.x + box.width <= 394);
      await t.tap();
      await adv(m, 1.5);
      assert.equal((await read(m)).active, id);
      assert.equal((await read(m)).state.index, 1);
    }
    await m.locator('#back').tap();
    await adv(m, 1.5);
    await m.locator('#info').tap();
    assert.equal(await m.locator('#sources').isVisible(), true);
    await m.locator('#sources .x').tap();
    yes('393 × 852 Chrome touch emulation: one-finger orbit, pinch and thumb controls');
    await phone.close();
    const ordinary = await b.newContext({ viewport: { width: 1024, height: 768 }, offline: true });
    const n = await ordinary.newPage();
    await load(n, false);
    assert.equal(await n.evaluate(() => typeof cityProof), 'undefined');
    await n.locator('button[data-pocket="market"]').click();
    await n.locator('[data-act=cut]').click();
    assert.equal(await n.locator('body').getAttribute('data-mode'), 'cut');
    yes('Normal file entry works without diagnostics');
    await ordinary.close();
    assert.deepEqual(result.requests, []);
    assert.deepEqual(result.errors, []);
    yes('No network requests or browser / GLSL errors');
  } finally {
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(result, null, 2));
    await b.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
