import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(path.join(here, name), 'utf8');
const output = path.resolve(process.argv[2] || path.join(here, 'dist', 'index.html'));
mkdirSync(path.dirname(output), { recursive: true });
const temp = path.join(here, '.build');
mkdirSync(temp, { recursive: true });
mkdirSync(path.dirname(output), { recursive: true });
const bund = path.join(temp, 'scene.js');
if (process.env.POCKET_ESBUILD) {
  execFileSync(
    process.env.POCKET_ESBUILD,
    [
      'src/main.js',
      '--bundle',
      '--minify',
      '--loader:.gz=binary',
      '--format=iife',
      '--legal-comments=inline',
      '--target=es2020',
      '--outfile=' + bund,
    ],
    { cwd: here, stdio: 'inherit' },
  );
} else {
  const { build } = await import('esbuild');
  await build({
    absWorkingDir: here,
    entryPoints: ['src/main.js'],
    outfile: bund,
    bundle: true,
    format: 'iife',
    minify: true,
    loader: { '.gz': 'binary' },
    legalComments: 'inline',
    target: 'es2020',
  });
}
const html = read('page.html')
  .replace('/*POCKET_STYLE*/', () => read('style.css'))
  .replace('/*POCKET_JS*/', () => readFileSync(bund, 'utf8').replace(/<\/script/gi, '<\\/script'));
writeFileSync(
  output,
  html +
    '\n<!-- Oxford in Pockets application code\n' +
    read('LICENSE') +
    '\nMap data: © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright\n' +
    'Original Oxford Atlas model geometry: MIT. Sandstone Blocks 05 and Roof Slates 03 by Rob Tuytel / Poly Haven: CC0. Contains public sector information licensed under the Open Government Licence v3.0. © Environment Agency copyright and/or database right 2022. See CREDITS.md and models/PROVENANCE.md.\nThree.js\n' +
    read('THREE-LICENSE.txt') +
    '\nfflate\n' +
    read('FFLATE-LICENSE.txt') +
    '\n-->\n',
);
console.log(output + ' · ' + (Buffer.byteLength(html) / 1048576).toFixed(2) + ' MiB');
