const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.POCKET_PLAYWRIGHT || 'playwright');
const [release, folder, previous] = process.argv.slice(2);
const out = path.resolve(folder || 'verification');
fs.mkdirSync(out, { recursive: true });
const sites = ['magdalen', 'market', 'radcliffe', 'christ', 'museum', 'castle'];
const secondary = {
  market: 'cross',
  radcliffe: 'sighs',
  christ: 'peck',
  museum: 'liddon',
  castle: 'nuffield',
};
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/quarters.json')));
const stats = {
  errors: [],
  requests: [],
  oldViews: {},
  newViews: {},
  extents: {},
  wings: {},
  details: {},
  roofClicks: {},
  realPhones: 0,
};
const probes = {
  magdalen: [
    [-107, 8.2, -10],
    [-74, 8, 4],
    [-33, 8.2, 38],
  ],
  market: [
    [-775, 8, -54],
    [-763, 8, -96],
  ],
  radcliffe: [
    [-590, 15, -269],
    [-467, 12, -207],
    [-505, 7, -287],
  ],
  christ: [
    [-578, 14, 99],
    [-556, 15, 274],
  ],
  museum: [
    [-590, 13, -765],
    [-781, 17, -846],
  ],
  castle: [
    [-1096, 24, -68],
    [-1103, 11, -70],
  ],
};
const opt = {
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
};
if (process.env.POCKET_BROWSER) opt.executablePath = process.env.POCKET_BROWSER;
let browser;
async function run() {
  browser = await chromium.launch(opt);
  stats.browser = browser.version();
  const advance = (p, t) => p.evaluate((x) => cityProof.advance(x), t);
  const read = (p) => p.evaluate(() => cityProof.read());
  async function load(f, viewport, lang) {
    const c = await browser.newContext({ offline: true, viewport, deviceScaleFactor: 1 });
    const p = await c.newPage();
    p.on('pageerror', (e) => stats.errors.push(String(e)));
    p.on('console', (m) => {
      if (m.type() === 'error') stats.errors.push(m.text());
    });
    p.on('request', (r) => {
      if (/^https?:/.test(r.url())) stats.requests.push(r.url());
    });
    await p.goto(pathToFileURL(path.resolve(f)).href + '?proof', {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await p.waitForFunction(() => window.cityProof || document.body.dataset.error, null, { timeout: 135000 });
    assert.equal(await p.locator('body').getAttribute('data-error'), null, JSON.stringify(stats.errors));
    await p.evaluate(() => cityProof.freeze());
    await p.locator('[data-lang="' + lang + '"]').click();
    return [c, p];
  }
  async function shot(p, key, clean = true, marks = false) {
    let hide;
    if (clean)
      hide = await p.addStyleTag({
        content:
          'header,footer,#caption,#actions,#camera-tools,#compass,#scale,#credit' +
          (marks ? '' : ',#marks') +
          '{visibility:hidden!important}',
      });
    const bounds = await p.locator('#view').boundingBox();
    await p.screenshot({
      path: path.join(out, key + '.png'),
      clip: clean ? bounds : undefined,
      timeout: 120000,
    });
    if (hide) await hide.evaluate((el) => el.remove());
  }
  const choose = async (p, k) => {
    await p.locator('button[data-pocket="' + k + '"]').click();
    await advance(p, 1.6);
  };
  const view = async (p, k) => {
    await p.locator('[data-act="' + k + '"]').click();
    await advance(p, 1.6);
  };
  async function testOwnership(p) {
    // Hide the floating names so normal pointer events hit geometry in every probe.
    const mask = await p.addStyleTag({ content: '#marks{visibility:hidden!important}' });
    const samples = [
      ['magdalen', 'St Swithun’s Quad', [-112.8, 10.2, -54.55]],
      ['market', 'Golden Cross', [-766.6, 12.8, -66.51]],
      ['radcliffe', 'Sheldonian Theatre', [-590, 19, -265]],
      ['christ', 'Peckwater Library', [-582.9, 15, 98]],
      ['museum', 'Keble Chapel', [-783.9, 21, -844.1]],
      ['castle', 'Nuffield Library', [-1096.3, 31, -68]],
      ['ashmolean', 'Ashmolean Museum', [-951.5, 21, -400.1]],
      ['city', 'Examination Schools', [-275, 21, -26]],
    ];
    for (const [id, name, world] of samples) {
      await p.locator('#back').click();
      await advance(p, 1.6);
      const pixel = await p.evaluate((pt) => cityProof.project(...pt), world);
      await p.mouse.click(...pixel);
      await advance(p, 1.6);
      const actual = (await read(p)).active;
      stats.roofClicks[name] = { expected: id, actual };
      assert.equal(actual, id, name + ' at ' + pixel);
    }
    await mask.evaluate((el) => el.remove());
  }
  for (const [f, tag] of [...(previous ? [[previous, 'old']] : []), [release, 'new']]) {
    const [ctx, p] = await load(f, { width: 1260, height: 802 }, 'zh');
    await shot(p, tag + '-city', true, true);
    for (const id of sites) {
      await choose(p, id);
      const base = await read(p);
      assert.equal(base.active, id);
      assert.ok(base.state.weights[0] > 0.99);
      if (tag === 'new') {
        await shot(p, 'area-' + id);
        if (id !== 'magdalen') {
          stats.extents[id] = {
            hectares: data[id].hectares,
            original: data[id].core.length,
            additional: Object.keys(data[id].buildings).length,
          };
          await view(p, 'core');
        }
      }
      const r = await read(p);
      stats[tag + 'Views'][id] = r.pose;
      await shot(p, tag + '-' + id);
      if (tag === 'new') {
        if (previous) assert.deepEqual(r.pose, stats.oldViews[id]);
        stats.wings[id] = await p.evaluate((pts) => pts.map((pt) => cityProof.project(...pt)), probes[id]);
        if (secondary[id]) {
          await view(p, secondary[id]);
          const detail = await read(p);
          stats.details[id] = {
            mode: detail.mode,
            eye: detail.eye,
            triangles: detail.triangles,
            calls: detail.calls,
          };
          await shot(p, 'view-' + id);
        }
      }
    }
    if (tag === 'new') await testOwnership(p);
    await ctx.close();
    const [wide, wp] = await load(f, { width: 1720, height: 636 }, 'en');
    await choose(wp, 'magdalen');
    await shot(wp, tag + '-wide-magdalen', false);
    await wide.close();
    console.log('Recorded', tag, 'six sites and wide Magdalen');
  }
  assert.deepEqual(stats.errors, []);
  assert.deepEqual(stats.requests, []);
}
run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(path.join(out, 'quarters-browser.json'), JSON.stringify(stats, null, 2));
    if (browser) await browser.close();
  });
