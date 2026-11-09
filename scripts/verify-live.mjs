import { build } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createPublicClient, http, parseAbi } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';

// Read-only integration evidence. No signer, wallet secret or write method exists here.
await build({ configFile: false, logLevel: 'warn', build: {
  ssr: 'packages/perps-adapter/src/read.ts', outDir: 'test-results/live-adapter', emptyOutDir: false,
  rolldownOptions: { output: { entryFileNames: 'read.mjs' } },
} });
const adapter = await import(pathToFileURL(resolve('test-results/live-adapter/read.mjs')).href);
const report = { timestamp: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_NO_SIGNER', checks: {} };
const signal = AbortSignal.timeout(180_000);
async function check(name, operation) {
  const start = Date.now();
  try { const value = await operation(); report.checks[name] = { ok: true, elapsedMs: Date.now() - start, value }; console.log(name, 'PASS', `${Date.now() - start}ms`); return value; }
  catch (error) { report.checks[name] = { ok: false, elapsedMs: Date.now() - start, error: adapter.readError(error) }; console.log(name, 'FAIL', adapter.readError(error)); }
  finally { await writeFile('docs/research/parts2-3-live.json', JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2)); }
}
await mkdir('docs/research', { recursive: true });
const discovery = await check('discovery', () => adapter.discoverMarkets(signal));
const market = discovery?.rows.find(row => row.metadata.ok && row.metadata.value.baseSymbol === 'SOL') ?? discovery?.rows.find(row => row.metadata.ok);
if (market) {
  await check('selectedMarket', () => adapter.readMarket(market.pool, signal));
  await check('diagnosticEmptyAccount', () => adapter.readAccount('0x0000000000000000000000000000000000000001', signal));
  const rpc = createPublicClient({ chain: hidekiTestnet, transport: http('https://api.hideki2.infra.testnet.somnia.network', { timeout: 12000, retryCount: 0 }) });
  const holders = await check('publicHolderSample', () => rpc.readContract({ address: '0x478769E1177C0773c43A593DCCc4Ad15F15F1394', abi: parseAbi(['function getSideHoldersPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns (address[] holders)']), functionName: 'getSideHoldersPaginated', args: [market.pool, true, 0n, 1n] }));
  if (holders?.[0]) {
    const account = await check('publicNonEmptyAccount', () => adapter.readAccount(holders[0], signal));
    if (account?.health.ok && account.analyticsComplete) await check('equityReconciliation', async () => {
      const reconstructed = account.positions.reduce((sum, row) => sum + (row.analytics.ok ? row.analytics.value.metrics.equityContribution : 0n), account.state.unlockedCollateralBalance + account.state.lockedCollateral);
      const difference = reconstructed - account.health.value[0];
      if (difference !== 0n) throw new Error(`Equity reconstruction differs by ${difference} raw collateral units.`);
      return { blockNumber: account.blockNumber, observed: account.health.value[0], reconstructed, difference };
    });
  }
  const orders = await check('publicRestingOrderSample', () => rpc.readContract({ address: market.pool, abi: parseAbi(['function getAllOpenOrdersOffChain(bool isBid, uint256 maxCount, uint64 startCursor) view returns ((uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs)[] orders, bool hasMoreOrders, uint64 nextCursor)']), functionName: 'getAllOpenOrdersOffChain', args: [true, 1n, 0n] }));
  if (orders?.[0]?.[0]) await check('publicAccountWithOrders', () => adapter.readAccount(orders[0][0].owner, signal));
}
console.log('Evidence saved in docs/research/parts2-3-live.json. Sample accounts are public protocol observations, not the user’s wallet.');
if (Object.values(report.checks).some(check => !check.ok)) process.exitCode = 1;
