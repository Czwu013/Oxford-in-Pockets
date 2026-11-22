const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');

async function main() {
  const file = path.resolve(process.argv[2] || 'dist/index.html');
  const out = path.resolve(process.argv[3] || '.verification');
  fs.mkdirSync(out, { recursive: true });
  const opts = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.POCKET_BROWSER) opts.executablePath = process.env.POCKET_BROWSER;
  const browser = await chromium.launch(opts);
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 840 },
      deviceScaleFactor: 1,
      offline: true,
    });
    await ctx.addInitScript(() => {
      const connect = AudioNode.prototype.connect;
      window.measuredPeak = 0;
      AudioNode.prototype.connect = function (target, ...rest) {
        if (!(target instanceof AudioDestinationNode)) return connect.call(this, target, ...rest);
        const meter = this.context.createAnalyser();
        const buf = new Float32Array(512);
        meter.fftSize = buf.length;
        connect.call(this, meter);
        connect.call(meter, target);
        const timer = setInterval(() => {
          if (meter.context.state === 'closed') return clearInterval(timer);
          meter.getFloatTimeDomainData(buf);
          for (const x of buf) window.measuredPeak = Math.max(window.measuredPeak, Math.abs(x));
        }, 23);
        return target;
      };
    });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href + '?proof', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForFunction(() => !!window.cityProof, {}, { timeout: 95000 });
    await p.evaluate(() => cityProof.freeze());
    if (await p.locator('#languages').isVisible()) await p.locator('[data-lang=zh]').click();
    const advance = (s) => p.evaluate((dt) => cityProof.advance(dt), s);
    const click = (s) => p.locator(s).click();
    const capture = (s) => p.screenshot({ path: path.join(out, s + '.jpg'), type: 'jpeg', quality: 91 });
    await click('button[data-pocket="christ"]');
    await advance(1.6);
    const fixed = await p.evaluate(() => cityProof.read().pose);
    for (const [i, name] of ['spring', 'summer', 'autumn', 'winter'].entries()) {
      await click(`[data-season="${i}"]`);
      await advance(3.4);
      const r = await p.evaluate(() => cityProof.read());
      assert.deepEqual(r.pose, fixed);
      assert.equal(r.state.weights[i], 1);
      assert.equal(r.state.snowOn, false);
      await capture(name);
    }
    await click('#weather');
    await click('#snow');
    await click('.dismiss');
    await advance(39);
    await capture('winter-snow');
    const readings = {};
    for (const [pocket, event] of [
      ['christ', 'bell'],
      ['magdalen', 'may'],
    ]) {
      await click(`button[data-pocket="${pocket}"]`);
      await advance(1.55);
      await click(`[data-act="${event}"]`);
      await advance(1);
      assert.equal(await p.evaluate(() => cityProof.read().state.sounding), false);
      await p.evaluate(() => {
        window.measuredPeak = 0;
      });
      await click('[data-act="sound"]');
      await p.waitForFunction(() => window.measuredPeak > 0.0008, {}, { timeout: 12000 });
      readings[event] = await p.evaluate(() => window.measuredPeak);
      await click('[data-act="end"]');
      assert.equal(await p.evaluate(() => cityProof.read().state.sounding), false);
    }
    const report = {
      fixedCamera: fixed,
      fourDefaultSnowFreeSeasons: true,
      winterSnowSeparate: true,
      audioOutputPeaks: readings,
    };
    fs.writeFileSync(path.join(out, 'four-seasons-and-audio.json'), JSON.stringify(report, null, 2));
    console.log('Four fixed-camera seasons, separate snow and two nonzero audio outputs', readings);
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
