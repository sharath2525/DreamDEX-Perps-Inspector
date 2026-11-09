import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Public account reads + frozen-snapshot calculations only. No wallet or write path.
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/index.ts', outDir: 'test-results/risk-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'adapter.mjs' } } } });
const adapter = await import(pathToFileURL(resolve('test-results/risk-adapter/adapter.mjs')).href);
const previous = JSON.parse(await readFile('docs/research/parts2-3-live.json', 'utf8'));
const owner = previous.checks.publicNonEmptyAccount.value.owner;
const report = { timestamp: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_FROZEN_SCENARIOS_NO_WALLET', owner, checks: {} };
const signal = AbortSignal.timeout(120_000);
async function check(name, run) {
  try { const value = await run(); report.checks[name] = { status: 'PASS', value }; console.log(name, 'PASS'); return value; }
  catch (error) { report.checks[name] = { status: 'FAIL', error: adapter.readError(error) }; console.log(name, 'FAIL', adapter.readError(error)); process.exitCode = 1; }
  finally { await writeFile('docs/research/parts6-7-live.json', adapter.evidenceJson(report)); }
}
const snapshot = await check('publicAccountSnapshot', () => adapter.readAccount(owner, signal));
if (snapshot) {
  for (const bps of [0n, -2000n, 2000n]) await check(`scenario${bps}`, async () => {
    const result = await adapter.calculateRisk(snapshot, bps);
    if (!result.ready) throw new Error(`Baseline did not reconcile: ${adapter.evidenceJson(result.difference)}; complete=${result.coverageComplete}`);
    return adapter.riskEvidence(result);
  });
  if (snapshot.positions[0]) await check('customMarketShock', async () => {
    const result = await adapter.calculateRisk(snapshot, 0n, { [snapshot.positions[0].pool.toLowerCase()]: -1000n });
    if (!result.ready) throw new Error('Custom baseline did not reconcile.');
    return adapter.riskEvidence(result);
  });
  const order = snapshot.orders.find(row => row.detail.ok);
  if (order) await check('boundedIndexerReconciliation', () => adapter.reconcileIndexer({ owner, pool: order.pool }, snapshot.blockNumber, order.orderId, signal));
  else if (snapshot.positions[0]) await check('boundedIndexerWatermark', () => adapter.reconcileIndexer({ owner, pool: snapshot.positions[0].pool }, snapshot.blockNumber, undefined, signal));
}
console.log('No actual signed-order proof exists. Part 6 real execution demonstration remains blocked by Part 5 wallet readiness.');
