import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/index.ts', outDir: 'test-results/operations-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'adapter.mjs' } } } });
const api = await import(pathToFileURL(resolve('test-results/operations-adapter/adapter.mjs')).href);
const sample = JSON.parse(await readFile('docs/research/parts6-7-live.json', 'utf8'));
const owner = sample.owner, pool = sample.checks.publicAccountSnapshot.value.positions[0].pool;
const report = { timestamp: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_NO_SIGNER', owner, pool, checks: {} };
for (const [name, run] of Object.entries({ marginAccount: () => api.readOperationAccount(owner, AbortSignal.timeout(45000)), stopContext: () => api.readStopContext(owner, pool, AbortSignal.timeout(45000)), indexedStops: () => api.listOwnerStops(owner, pool, AbortSignal.timeout(45000)), operatorPermissions: () => api.readPermissions(owner, '0x000000000000000000000000000000000000dEaD', pool, AbortSignal.timeout(45000)) })) {
  try { const result = await run(); const value = name === 'stopContext' ? { registry: result.registry, pool: result.pool, payment: result.payment, refund: result.refund, permission: result.permission, position: result.position, blockNumber: result.blockNumber } : result; report.checks[name] = { status: 'PASS', value }; console.log(name, 'PASS'); }
  catch (error) { report.checks[name] = { status: 'INCONCLUSIVE', reason: api.readError(error) }; console.log(name, 'INCONCLUSIVE', api.readError(error)); process.exitCode = 1; }
  await writeFile('docs/research/part9-live.json', api.evidenceJson(report));
}
