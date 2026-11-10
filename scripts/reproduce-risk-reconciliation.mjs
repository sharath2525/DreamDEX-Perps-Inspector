import { createPublicClient, http, parseAbi, isAddress } from 'viem';
import { perpPositionAnalytics } from '@somnia-chain/markets-sdk';
import { writeFile } from 'node:fs/promises';

// Public read-only reproduction. No wallet client, secret, signature or write.
// node scripts/reproduce-risk-reconciliation.mjs <public-account> [block-number]
const [account, blockText] = process.argv.slice(2);
if (!isAddress(account ?? '')) throw Error('Supply a public account address.');
const bank = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';
const client = createPublicClient({ transport: http('https://api.hideki2.infra.testnet.somnia.network', { timeout: 20000, retryCount: 1 }) });
if (await client.getChainId() !== 50383) throw Error('Wrong chain');
const blockNumber = blockText ? BigInt(blockText) : await client.getBlockNumber();
const block = await client.getBlock({ blockNumber });
const abi = parseAbi([
  'function getAccountState(address account) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools))',
  'function getAccountHealth(address account) view returns (int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq)',
  'function getPosition(address account, address perpPool) view returns ((int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs))',
  'function tryGetHealthSnapshot() view returns (bool ok, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps) snapshot)',
]);
const read = (address, functionName, args = []) => client.readContract({ address, abi, functionName, args, blockNumber });
const [state, health] = await Promise.all([read(bank, 'getAccountState', [account]), read(bank, 'getAccountHealth', [account])]);
const rows = await Promise.all(state.activePerpPools.map(async pool => {
  const [position, [priceable, snapshot]] = await Promise.all([read(bank, 'getPosition', [account, pool]), read(pool, 'tryGetHealthSnapshot')]);
  if (!priceable) throw Error(`Unpriceable pool ${pool}; no zero substituted.`);
  const inputs = { ...position, ...snapshot, effectiveImfBps: snapshot.effectiveIMFBps };
  return { pool, inputs, metrics: perpPositionAnalytics(inputs) };
}));
const sdk = rows.reduce((sum, { metrics: m }) => [sum[0] + m.equityContribution, sum[1] + m.initialMarginRequirement, sum[2] + m.maintenanceMarginRequirement, sum[3] + m.closeOutMarginRequirement], [state.unlockedCollateralBalance + state.lockedCollateral, 0n, 0n, 0n]);
const evidence = { observedAt: new Date().toISOString(), mode:'PUBLIC_READ_ONLY_NO_TRANSACTIONS', sdkVersion:'0.32.1', chainId:50383, account, marginBank:bank, blockNumber, blockHash:block.hash, state, health, sdk, sdkMinusChain:sdk.map((n,i)=>n-health[i]), rows };
const json = JSON.stringify(evidence, (_,v)=>typeof v === 'bigint' ? v.toString() : v, 2);
await writeFile('docs/research/risk-sdk-reproduction.json',json);
console.log(JSON.stringify({block:blockNumber.toString(),sdkMinusChain:evidence.sdkMinusChain.map(String),output:'docs/research/risk-sdk-reproduction.json'}));
