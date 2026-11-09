import { build } from 'vite';
import { writeFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { formatUnits } from 'viem';
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';

// Public observation + eth_call ONLY. No wallet, key, executor send or broadcast.
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/index.ts', outDir: 'test-results/preflight-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'adapter.mjs' } } } });
const adapter = await import(pathToFileURL(resolve('test-results/preflight-adapter/adapter.mjs')).href);
const prior = JSON.parse(await readFile('docs/research/parts2-3-live.json', 'utf8'));
const pool = prior.checks.selectedMarket.value.pool;
const owner = prior.checks.publicNonEmptyAccount.value.owner;
const config = adapter.PERPS_CONFIG;
const signal = AbortSignal.timeout(90_000);
const report = { timestamp: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_SIMULATION_NO_SIGNER_NO_BROADCAST', sampleOwner: owner, pool, checks: {} };
async function check(name, operation) {
  try { const value = await operation(); report.checks[name] = { status: 'PASS', value }; console.log(name, 'PASS'); return value; }
  catch (error) { report.checks[name] = { status: 'BLOCKED', reason: adapter.readError(error) }; console.log(name, 'BLOCKED', adapter.readError(error)); }
  finally { await writeFile('docs/research/parts4-5-preflight-live.json', JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2)); }
}
const market = await check('market', () => adapter.readMarket(pool, signal));
if (market?.mark.ok && market.mark.value[0]) {
  const price = market.mark.value[1] / market.metadata.tickSize * market.metadata.tickSize;
  const quantity = ((market.metadata.minQuantity + market.metadata.lotSize - 1n) / market.metadata.lotSize) * market.metadata.lotSize;
  const exchange = new SomniaMarkets({ chain: hidekiTestnet, wsRpcUrl: config.wsUrl, indexerUrl: config.indexerUrl, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, signal });
  try {
    await check('sdkMaximum', () => exchange.client.getMaxPerpOrderSize({ pool, marginBank: config.marginBank, account: owner, isBid: true, price, autoPull: true }));
    await check('sdkMargin', () => exchange.client.previewPerpOrderMargin({ pool, marginBank: config.marginBank, account: owner, isBid: true, price, quantity, autoPull: true }));
  } finally { await exchange.close(); }
  const intent = { pool, owner, isBid: true, price, quantity, orderType: 0, expireTimestampNs: BigInt(Date.now() + 600_000) * 1_000_000n };
  const built = await check('sdkBuildOnly', () => adapter.buildOrder(intent, signal));
  if (built) await check('actualContractSimulation', async () => {
    const { client, blockNumber } = await adapter.verifyDeployment(signal);
    const simulation = await client.call({ account: owner, to: pool, data: built.data, value: 0n, blockNumber });
    const gas = await client.estimateGas({ account: owner, to: pool, data: built.data, value: 0n });
    return { blockNumber, simulation, gas, statement: 'Public-address simulation, not wallet authority or a transaction.' };
  });
  await check('fullDirectWalletPreflight', async () => {
    const prepared = await adapter.prepareOrder({ pool, owner, isBid: true, price: formatUnits(price, market.decimals), quantity: formatUnits(quantity, market.metadata.baseDecimals), mode: 'limit', expiryMinutes: '10', gasBudget: '0.1' }, signal);
    return { intent: prepared.intent, call: prepared.call, gasLimit: prepared.gasLimit, maximumGasCost: prepared.maximumGasCost, checkedAt: prepared.checkedAt, statement: 'No wallet was connected. Passing is not authorization to send for this public address.' };
  });
}
console.log('Live signed-order gate remains BLOCKED: user trading wallet is not ready. No transaction was sent.');
