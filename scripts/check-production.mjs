import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const assets = await readdir('apps/web/dist/assets');
const prohibited = ['Developer Test Lab', 'Run read-only diagnostics', 'pei-manual-tests-v1', 'Guided tests · one scenario at a time'];
for (const name of assets.filter(name => /\.(js|map)$/.test(name))) {
  if (name.endsWith('.map')) throw new Error(`Unexpected public source map: ${name}`);
  const code = await readFile(join('apps/web/dist/assets', name), 'utf8');
  if (prohibited.some(text => code.includes(text))) throw new Error(`Developer tools found in public artifact: ${name}`);
}
console.log('PASS: production JavaScript excludes Developer Test Lab, diagnostics runner and manual test-note UI.');
