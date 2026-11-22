const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const [file, folder] = process.argv.slice(2),
  out = path.resolve(folder || 'verification');
fs.mkdirSync(out, { recursive: true });
const result = { errors: [], requests: [], views: {}, realPhones: 0 };
let browser;
const receipt = () => fs.writeFileSync(path.join(out, 'eight-browser.json'), JSON.stringify(result, null, 2));
async function load(width, height, phone = false) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    offline: true,
    isMobile: phone,
    hasTouch: phone,
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => {
    result.errors.push(String(e));
    console.error(String(e));
  });
  p.on('console', (m) => {
    if (m.type() === 'error') {
      result.errors.push(m.text());
      console.error(m.text().slice(0, 2800));
    }
  });
  p.on('request', (r) => {
    if (/^https?:/.test(r.url())) result.requests.push(r.url());
  });
  await p.goto(pathToFileURL(path.resolve(file)).href + '?proof', {
    waitUntil: 'domcontentloaded',
    timeout: 150000,
  });
  await p.waitForFunction(() => window.cityProof || document.body.dataset.error, null, { timeout: 150000 });
  assert.equal(await p.locator('body').getAttribute('data-error'), null);
  await p.evaluate(() => cityProof.freeze());
  await p.locator('[data-lang="' + (phone ? 'en' : 'zh') + '"]').click();
  return { p, ctx };
}
const read = (p) => p.evaluate(() => cityProof.read());
const step = (p, t, render = true) => p.evaluate(([s, r]) => cityProof.advance(s, r), [t, render]);
const hit = (p, s) => p.locator(s).click();
async function choose(p, id) {
  await hit(p, '[data-pocket="' + id + '"]');
  await step(p, 1.6);
}
async function view(p, id, t = 1.6) {
  await hit(p, '[data-act="' + id + '"]');
  await step(p, t);
}
async function shot(p, id, clean = true) {
  const h =
    clean &&
    (await p.addStyleTag({
      content:
        'header,footer,#caption,#actions,#camera-tools,#compass,#scale,#credit,#marks{visibility:hidden!important}',
    }));
  await p.screenshot({
    path: path.join(out, id + '.png'),
    timeout: 120000,
    clip: clean ? await p.locator('#view').boundingBox() : undefined,
  });
  if (h) await h.evaluate((e) => e.remove());
}
async function toggleShafts(p) {
  await hit(p, '#weather');
  await hit(p, '#shafts');
  if (await p.locator('#weather-panel').isVisible()) await hit(p, '#weather');
  await step(p, 0);
}
async function run() {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.POCKET_BROWSER || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  result.browser = browser.version();
  const { p, ctx } = await load(1200, 780);
  const initial = await read(p);
  assert.equal(initial.sites.length, 12);
  assert.equal(initial.state.index, 0);
  assert.equal(initial.state.night, false);
  await shot(p, 'city', false);
  for (const [id, modes] of [
    ['ashmolean', ['portico', 'martyrs']],
    ['carfax', ['dial', 'townhall']],
  ]) {
    await choose(p, id);
    assert.equal((await read(p)).active, id);
    await shot(p, id + '-district');
    for (const mode of modes) {
      await view(p, mode);
      let r = await read(p);
      assert.equal(r.mode, mode);
      assert.ok(r.eye[1] > 1 && r.eye[1] < 4.5, mode + ' eye ' + r.eye);
      result.views[mode] = { eye: r.eye, triangles: r.triangles, leaves: r.leaves };
      await shot(p, mode + '-day');
      if (mode === 'portico') {
        await toggleShafts(p);
        assert.equal((await read(p)).aerial.active, false);
        await shot(p, 'portico-no-rays');
        await toggleShafts(p);
        r = await read(p);
        assert.ok(r.aerial.active && r.aerial.volumeCount > 0);
        const before = r;
        await hit(p, '#time-of-day');
        await step(p, 1.62);
        const mid = await read(p);
        await step(p, 1.64);
        const dark = await read(p);
        result.dayNight = {
          day: before.litHour,
          half: mid.litHour,
          night: dark.litHour,
          daylight: [before.sunPower, mid.sunPower, dark.sunPower],
          lamps: [before.lamps, mid.lamps, dark.lamps],
          lights: before.aerial,
          nightLights: dark.aerial,
        };
        assert.ok(mid.litHour > before.litHour && mid.litHour < dark.litHour);
        assert.ok(dark.sunPower < 0.12 && dark.lamps > 0.94 && !dark.aerial.active);
        assert.deepEqual(dark.pose, before.pose);
        assert.equal(dark.state.index, before.state.index);
        assert.ok(dark.peopleTime > before.peopleTime);
        await shot(p, 'portico-night');
        await hit(p, '#time-of-day');
        await step(p, 3.4);
        const back = await read(p);
        assert.ok(!back.state.night && Math.abs(back.litHour - before.litHour) < 0.01);
      }
      if (mode === 'townhall') {
        await hit(p, '#time-of-day');
        await step(p, 3.4);
        await shot(p, 'townhall-night');
        await hit(p, '#time-of-day');
        await step(p, 3.4);
      }
      if (mode === 'dial') {
        async function leafCount() {
          let airborne = 0;
          for (let i = 0; i < 12; i++) {
            await step(p, 1, false);
            airborne += (await read(p)).leaves.airborne;
          }
          return airborne;
        }
        const sparse = await leafCount();
        await hit(p, '[data-season="2"]');
        await step(p, 3);
        const gold = await leafCount();
        assert.ok(sparse > 0 && gold > sparse * 1.35);
        result.shedding = { spring: sparse, autumn: gold, sampleSeconds: 12 };
        await hit(p, '[data-season="0"]');
        await step(p, 3);
      }
    }
    await view(p, 'walk', 1);
    let pathSamples = [];
    for (let i = 0; i < 12; i++) {
      const s = await read(p);
      pathSamples.push(s.eye);
      await step(p, 0.92, false);
    }
    result.views[id + 'Walk'] = pathSamples;
    assert.ok(pathSamples.every((a) => a[1] > 1.6 && a[1] < 3));
    console.log('Viewed', id);
    receipt();
  }
  await choose(p, 'magdalen');
  await view(p, 'addison');
  let spring = await read(p);
  await shot(p, 'river-spring');
  await toggleShafts(p);
  await shot(p, 'river-no-rays');
  await toggleShafts(p);
  assert.ok(spring.leaves.airborne > 0);
  await step(p, 0.7);
  const second = await read(p);
  assert.notDeepEqual(second.leaves.nearest, spring.leaves.nearest);
  await view(p, 'linden');
  assert.ok((await read(p)).eye[1] < 3.5);
  result.leafFrames = [];
  for (let i = 0; i < 25 && result.leafFrames.length < 4; i++) {
    await step(p, 0.79, false);
    const count = await p.evaluate(() => {
      const gl = document.querySelector('#view').getContext('webgl2');
      const w = gl.drawingBufferWidth,
        h = gl.drawingBufferHeight;
      function pixels(visible) {
        cityProof.proofLeaves(visible);
        const a = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a);
        return a;
      }
      const lit = pixels(true),
        bare = pixels(false);
      let n = 0;
      for (let j = 0; j < lit.length; j += 4) {
        if (
          Math.max(
            Math.abs(lit[j] - bare[j]),
            Math.abs(lit[j + 1] - bare[j + 1]),
            Math.abs(lit[j + 2] - bare[j + 2]),
          ) > 13
        )
          n++;
      }
      return n;
    });
    if (count < 24) continue;
    const index = result.leafFrames.length;
    await shot(p, 'lime-clear-' + index);
    await p.evaluate(() => cityProof.proofLeaves(true));
    await shot(p, 'lime-' + index);
    result.leafFrames.push({ time: (await read(p)).clock, pixels: count });
  }
  assert.equal(
    result.leafFrames.length,
    4,
    'Spring foliage visible in four independently rendered frame pairs',
  );
  await view(p, 'addison');
  const riverPose = (await read(p)).pose;
  for (const [index, tag] of [
    [1, 'summer'],
    [3, 'winter'],
  ]) {
    await hit(p, '[data-season="' + index + '"]');
    await step(p, 3.4);
    assert.deepEqual((await read(p)).pose, riverPose);
    await shot(p, 'river-' + tag);
  }
  await hit(p, '#weather');
  await hit(p, '#wet');
  await hit(p, '#snow');
  await hit(p, '.dismiss');
  await step(p, 8);
  const cold = await read(p);
  await hit(p, '#time-of-day');
  await step(p, 3.4);
  const darkWinter = await read(p);
  assert.deepEqual(darkWinter.pose, cold.pose);
  assert.ok(
    darkWinter.state.night &&
      darkWinter.state.snowOn &&
      darkWinter.state.rain &&
      darkWinter.state.load > cold.state.load,
  );
  await hit(p, '#time-of-day');
  await step(p, 3.4);
  assert.ok(!(await read(p)).state.night);
  await hit(p, '#weather');
  await hit(p, '#wet');
  await hit(p, '#snow');
  await hit(p, '.dismiss');
  await step(p, 22, false);
  await hit(p, '[data-season="2"]');
  await step(p, 3);
  result.riverSpring = spring.leaves;
  await shot(p, 'river-autumn');
  await hit(p, '#time-of-day');
  await step(p, 3.4);
  const beforeMay = await read(p);
  await view(p, 'may', 3.1);
  let singing = await read(p);
  assert.equal(singing.state.event, 'may');
  assert.ok(Math.abs(singing.litHour - 6) < 0.01);
  assert.equal(singing.state.sounding, false);
  assert.ok(await p.locator('#time-of-day').isDisabled());
  await view(p, 'end', 0.01);
  const afterMay = await read(p);
  assert.ok(afterMay.state.night);
  assert.deepEqual(afterMay.pose, beforeMay.pose);
  assert.equal(afterMay.state.index, 2);
  assert.equal(afterMay.mode, 'addison');
  result.eventClock = {
    enteredFrom: beforeMay.litHour,
    performance: singing.litHour,
    returnedTo: afterMay.litHour,
  };
  // Press the day/night switch twice during the fade. The second press reverses from the intermediate light.
  await hit(p, '#time-of-day');
  await step(p, 0.9);
  const interrupted = await read(p);
  await hit(p, '#time-of-day');
  await step(p, 0);
  assert.equal((await read(p)).litHour, interrupted.litHour);
  await step(p, 3.4);
  assert.ok((await read(p)).state.night);
  await hit(p, '#time-of-day');
  await step(p, 3.4);
  await hit(p, '[data-season="0"]');
  await step(p, 3);
  const mask = await p.addStyleTag({ content: '#marks{visibility:hidden!important}' });
  result.roofs = {};
  for (const [id, name, coord] of [
    ['ashmolean', 'Museum', [-951.5, 21, -400.1]],
    ['carfax', 'Town Hall', [-721, 18, 40]],
    ['city', 'Examination Schools', [-275, 21, -26]],
  ]) {
    await hit(p, '#back');
    await step(p, 1.6);
    const [x, y] = await p.evaluate((v) => cityProof.project(...v), coord);
    await p.mouse.click(x, y);
    await step(p, 1.6);
    result.roofs[name] = (await read(p)).active;
    assert.equal(result.roofs[name], id, name);
  }
  await mask.evaluate((e) => e.remove());
  await ctx.close();
  const phone = await load(390, 844, true),
    m = phone.p;
  for (const width of [320, 390]) {
    await m.setViewportSize({ width, height: 844 });
    await m.waitForTimeout(90);
    const boxes = await m.locator('footer button').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return [r.left, r.top, r.right, r.bottom, r.height];
      }),
    );
    assert.ok(
      boxes.every((b) => b[0] >= -0.5 && b[2] <= width + 0.5 && b[1] > 650 && b[4] >= 43),
      width + ': ' + JSON.stringify(boxes),
    );
  }
  await m.locator('[data-pocket="carfax"]').tap();
  await step(m, 1.6);
  await m.locator('[data-act="dial"]').tap();
  await step(m, 1.6);
  await m.locator('#time-of-day').tap();
  await step(m, 3.4);
  await m.locator('[data-season="3"]').tap();
  await step(m, 3);
  const mobileState = await read(m);
  assert.equal(mobileState.mode, 'dial');
  assert.ok(mobileState.state.night && mobileState.state.index === 3);
  for (const width of [320, 390]) {
    await m.setViewportSize({ width, height: 844 });
    await m.waitForTimeout(110);
    for (const id of ['zin', 'zout']) {
      const clear = await m.locator('#' + id).evaluate((e) => {
        const r = e.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e;
      });
      assert.ok(clear, id + ' reachable above all rows of camera actions at ' + width);
    }
  }
  result.phone = {
    widths: [320, 390],
    actualTap: true,
    mode: mobileState.mode,
    night: mobileState.state.night,
  };
  await shot(m, 'mobile', false);
  await phone.ctx.close();
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
    receipt();
    await browser?.close();
  });
