import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const findings = []; let checked = 0;
const secret = /(?:sk-proj-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xoxb-[A-Za-z0-9-]{20,}|(?:PRIVATE_KEY|privateKey|mnemonic|seedPhrase)\s*[:=]\s*["'](?:0x[0-9a-fA-F]{64}|(?:[a-z]+ ){11,23}[a-z]+)["'])/;
async function scan(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '.vite'].includes(entry.name)) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (/\.(ts|tsx|js|mjs|html|css|json)$/.test(entry.name)) { checked++; if (secret.test(await readFile(path, 'utf8'))) findings.push({ path, kind: 'Possible embedded secret; review privately' }); }
  }
}
for (const folder of ['apps', 'packages', 'scripts']) await scan(folder);
for (const file of await readdir('.')) if (file.startsWith('.env') && file !== '.env.example') findings.push({ path: file, kind: 'Local environment file must not be packaged' });
const app = JSON.parse(await readFile('packages/perps-adapter/package.json', 'utf8'));
if (app.dependencies['@somnia-chain/markets-sdk'] !== '0.32.1') findings.push({ kind: 'SDK pin changed' });
const assets = await readdir('apps/web/dist/assets');
for (const asset of assets.filter(value => value.endsWith('.js'))) {
  const content = await readFile(join('apps/web/dist/assets', asset), 'utf8');
  if (secret.test(content)) findings.push({ path: asset, kind: 'Possible embedded secret in production bundle' });
  if (/Controlled operation rejection|Synthetic test-only chain|Controlled contract simulation revert/.test(content)) findings.push({ path: asset, kind: 'Test fixture text in production bundle' });
}
const report = { timestamp: new Date().toISOString(), status: findings.length ? 'FAIL' : 'PASS', sourceFilesChecked: checked, sdkVersion: app.dependencies['@somnia-chain/markets-sdk'], findings, limitations: 'Pattern-based source/bundle checks, not a comprehensive security audit. Wallet signing acceptance remains separate.' };
await writeFile('docs/research/release-check.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); if (findings.length) process.exitCode = 1;
