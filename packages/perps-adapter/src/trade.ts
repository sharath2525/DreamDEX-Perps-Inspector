import type { Executor, SomniaMarkets, UnsignedCall } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { encodeFunctionData, formatUnits, parseAbi, zeroAddress, type Address } from 'viem';
import { PERPS_CONFIG as config } from './config';
import { bankAbi, poolAbi } from './abi';
import { readMarket, sameAddress, verifyDeployment } from './read';
import { bookEstimate, exactUnits, validateGrid } from './precision';

// Verified against SDK 0.32.1 tradeAbi.js. No approval, delegation or stop call is exposed.
export const orderWriteAbi = parseAbi([
  'function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k)',
  'function cancelOrder(uint128 orderId)',
]);
export type OrderMode = 'limit' | 'ioc' | 'fok' | 'post';
export interface OrderDraft { pool: Address; owner: Address; isBid: boolean; price: string; quantity: string; mode: OrderMode; expiryMinutes: string; gasBudget: string }
export interface OrderIntent { pool: Address; owner: Address; isBid: boolean; price: bigint; quantity: bigint; orderType: number; expireTimestampNs: bigint }
export const PREFLIGHT_TTL_MS = 30_000;

export async function withSdk<T>(signal: AbortSignal, work: (sdk: SomniaMarkets['client']) => Promise<T>) {
  const { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } = await import('@somnia-chain/markets-sdk');
  signal.throwIfAborted();
  const exchange = new SomniaMarkets({ chain: hidekiTestnet, wsRpcUrl: config.wsUrl, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    indexerUrl: config.indexerUrl, signal });
  try { return await work(exchange.client); } finally { await exchange.close(); }
}
function buildOnlyExecutor(actor: Address): Executor {
  return { actor, chainId: config.chainId, execute: async () => { throw new Error('Build-only executor cannot sign or send.'); } };
}
export async function buildOrder(intent: OrderIntent, signal: AbortSignal): Promise<UnsignedCall> {
  return withSdk(signal, async sdk => {
    const trader = sdk.createTrader({ executor: buildOnlyExecutor(intent.owner) });
    const built = await trader.buildPlacePerpOrder({ ...intent, selfMatchingOption: 0, builder: zeroAddress, builderFeeBpsTimes1k: 0n });
    if (built.approval || built.order.chainId !== config.chainId || !sameAddress(built.order.to, intent.pool) || built.order.value !== 0n) throw new Error('Unexpected SDK transaction or approval.');
    const expected = encodeFunctionData({ abi: orderWriteAbi, functionName: 'placeOrder', args: [intent.isBid, 0n, intent.price, intent.quantity, intent.expireTimestampNs, intent.orderType, 0, zeroAddress, 0n] });
    if (built.order.data !== expected) throw new Error('SDK calldata differs from the reviewed intent.');
    return built.order;
  });
}
export async function prepareOrder(draft: OrderDraft, signal: AbortSignal, originalIntent?: OrderIntent) {
  const market = await readMarket(draft.pool, signal);
  const price = exactUnits(draft.price, market.decimals), quantity = exactUnits(draft.quantity, market.metadata.baseDecimals);
  validateGrid(price, quantity, market.metadata.tickSize, market.metadata.lotSize, market.metadata.minQuantity);
  if (!/^\d+$/.test(draft.expiryMinutes) || Number(draft.expiryMinutes) < 1 || Number(draft.expiryMinutes) > 1440) throw new Error('Expiry must be 1–1440 whole minutes.');
  const orderType = { limit: 0, fok: 1, ioc: 2, post: 3 }[draft.mode];
  if (orderType === undefined) throw new Error('Unsupported order type.');
  const intent: OrderIntent = originalIntent ?? { pool: draft.pool, owner: draft.owner, isBid: draft.isBid, price, quantity, orderType,
    expireTimestampNs: BigInt(Date.now() + Number(draft.expiryMinutes) * 60_000) * 1_000_000n };
  if (!sameAddress(intent.pool, draft.pool) || !sameAddress(intent.owner, draft.owner) || intent.price !== price || intent.quantity !== quantity || intent.isBid !== draft.isBid || intent.orderType !== orderType) throw new Error('Intent changed. Review a new preflight.');
  if (intent.expireTimestampNs < BigInt(Date.now() + 30_000) * 1_000_000n || intent.expireTimestampNs >= 2n ** 64n) throw new Error('Expiry is too close or outside uint64.');
  if (!market.mark.ok || !market.mark.value[0]) throw new Error('Market is unpriceable. No order can be prepared.');
  const [maximum, margin] = await withSdk(signal, sdk => Promise.all([
    sdk.getMaxPerpOrderSize({ pool: draft.pool, marginBank: config.marginBank, account: draft.owner, isBid: draft.isBid, price, autoPull: true }),
    sdk.previewPerpOrderMargin({ pool: draft.pool, marginBank: config.marginBank, account: draft.owner, isBid: draft.isBid, price, quantity, autoPull: true }),
  ]));
  if (!maximum.priceable || !margin.priceable) throw new Error('SDK cannot price this account.');
  if (!maximum.placeable || quantity > maximum.maxQuantity) throw new Error(`Order exceeds current capacity (${maximum.limitedBy}).`);
  if (!margin.sufficient) throw new Error(`Margin check failed: collateral=${margin.hasCollateralForLock}, initial margin=${margin.meetsInitialMargin}, voucher blocked=${margin.voucherBlocked}, restricted=${margin.restrictedBlocked}, isolation=${margin.isolationBlocked}.`);
  // Main-wallet rails need their own authorization UX; direct EOA trading does not silently opt in.
  if (margin.fundingPayer) throw new Error('Linked main-wallet funding is not supported in this direct-wallet release.');
  const call = await buildOrder(intent, signal);
  const execution = await simulateCall(draft.owner, call, exactUnits(draft.gasBudget, 18), signal);
  const latest = execution.blockNumber;
  if (Date.now() - market.observedAt > PREFLIGHT_TTL_MS) throw new Error('Market snapshot aged out during preflight. Check again.');
  for (const source of [market.blockNumber, maximum.asOfBlock, margin.asOfBlock]) {
    if (source > latest + 5n || latest - source > 100n) throw new Error('Preflight sources disagree or are stale. Run the check again.');
  }
  const book = draft.isBid ? market.asks : market.bids;
  return { kind: 'place' as const, draft, intent, call, market, maximum, margin, ...execution,
    estimate: book.ok ? bookEstimate(book.value, draft.isBid, price, quantity) : null, checkedAt: Date.now() };
}
export type PreparedOrder = Awaited<ReturnType<typeof prepareOrder>>;

export async function simulateCall(owner: Address, call: UnsignedCall, gasBudget: bigint, signal: AbortSignal) {
  const deployment = await verifyDeployment(signal);
  const { client, blockNumber } = deployment;
  const [code, balance, gasPrice] = await Promise.all([client.getCode({ address: owner, blockNumber }), client.getBalance({ address: owner, blockNumber }), client.getGasPrice()]);
  if (code && code !== '0x') throw new Error('A direct EOA is required. Smart accounts and delegated actors need a separate authorized route.');
  if (call.chainId !== config.chainId || call.value !== 0n) throw new Error('Unexpected chain or native payment.');
  const request = { account: owner, to: call.to, data: call.data, value: 0n } as const;
  const simulation = await client.call({ ...request, blockNumber });
  const gas = await client.estimateGas(request);
  const gasLimit = (gas * 130n + 99n) / 100n;
  const cappedGasPrice = gasPrice * 2n;
  const maximumGasCost = gasLimit * cappedGasPrice;
  if (gas <= 0n || cappedGasPrice <= 0n) throw new Error('RPC returned an invalid gas estimate or price.');
  if (maximumGasCost > gasBudget) throw new Error(`Estimated gas ceiling ${formatUnits(maximumGasCost, 18)} STT exceeds your ${formatUnits(gasBudget, 18)} STT budget. Review the cost before increasing it.`);
  if (balance < maximumGasCost) throw new Error('The signing wallet has insufficient STT for the gas limit.');
  const position = await client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getPosition', args: [owner, call.to], blockNumber });
  signal.throwIfAborted();
  return { blockNumber, gasLimit, gasPrice: cappedGasPrice, maximumGasCost, gasBudget, positionBefore: position.size, simulationData: simulation.data ?? '0x' };
}
export async function prepareCancellation(owner: Address, pool: Address, orderId: bigint, gasBudget: bigint, signal: AbortSignal) {
  await readMarket(pool, signal); // Registered pool, bank and metadata verification.
  const { client, blockNumber } = await verifyDeployment(signal);
  const order = await client.readContract({ address: pool, abi: poolAbi, functionName: 'getOrder', args: [orderId], blockNumber });
  if (order.orderId !== orderId || !sameAddress(order.owner, owner) || order.quantityRemaining === 0n) throw new Error('No resting order owned by the signing account was found.');
  const call: UnsignedCall = { chainId: config.chainId, to: pool, value: 0n, data: encodeFunctionData({ abi: orderWriteAbi, functionName: 'cancelOrder', args: [orderId] }), description: `Cancel order ${orderId}` };
  return { kind: 'cancel' as const, owner, pool, orderId, call, ...await simulateCall(owner, call, gasBudget, signal), checkedAt: Date.now() };
}
export type PreparedCancellation = Awaited<ReturnType<typeof prepareCancellation>>;
