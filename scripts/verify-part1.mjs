import { build } from 'vite';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { isAddress } from 'viem';

const [owner, actor, pool] = process.argv.slice(2);
if (![owner, actor, pool].every(value => typeof value === 'string' && isAddress(value))) throw new Error('Usage: node scripts/verify-part1.mjs <public-trading-account> <public-signer> <public-pool>. Read-only; never pass keys.');
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/index.ts', outDir: 'test-results/part1-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'adapter.mjs' } } } });
const api = await import(pathToFileURL(resolve('test-results/part1-adapter/adapter.mjs')).href);
const report = { observedAt: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_NO_SIGNER', sdkVersion: api.PERPS_CONFIG.sdkVersion, chainId: api.PERPS_CONFIG.chainId, owner, actor, pool, checks: {} };
const checks = {
  signerGas: () => api.readSignerGas(actor, AbortSignal.timeout(45000)),
  operatorPermission: () => api.readPermissions(owner, actor, pool, AbortSignal.timeout(45000)),
  discovery: () => api.discoverTradingAccounts(actor, AbortSignal.timeout(18000)),
  accountAndRisk: async () => {
    const snapshot = await api.readAccount(owner, AbortSignal.timeout(45000));
    const risk = await api.calculateRisk(snapshot, 0n, {});
    return { block: snapshot.blockNumber, observedAt: snapshot.observedAt, unlocked: snapshot.state.unlockedCollateralBalance, locked: snapshot.state.lockedCollateral, health: snapshot.health, floor: snapshot.floor, withdrawable: snapshot.withdrawable, positions: snapshot.positions.map(row => ({ pool: row.pool, position: row.position, metadata: row.metadata })), pendingOrderCount: snapshot.orderCount, positionCoverageComplete: snapshot.positionCoverageComplete, orderCoverageComplete: snapshot.orderCoverageComplete, zeroShockReconciled: risk.ready, differences: risk.difference };
  },
};
await Promise.all(Object.entries(checks).map(async ([name, read]) => {
  try { report.checks[name] = { status: 'READ_RETURNED', value: await read() }; }
  catch (error) { report.checks[name] = { status: 'INCONCLUSIVE', reason: api.readError(error) }; process.exitCode = 1; }
  console.log(name, report.checks[name].status);
}));
await writeFile('docs/research/part1-improvements-live.json', api.evidenceJson(report));
console.log('Saved read-only observations. This does not prove a PEI-originated transaction.');
