import { decodeFunctionData, parseAbi, parseEventLogs, TransactionNotFoundError, TransactionReceiptNotFoundError, type Address, type Hash, type Hex } from 'viem';
import { bankAbi, poolAbi } from './abi';
import { PERPS_CONFIG as config } from './config';
import { orderWriteAbi } from './trade';
import { operationsAbi } from './operations';
import { uniqueReceiptLogs } from './diagnostics';
import { readMarket, result, sameAddress, verifyDeployment } from './read';

// reduceOrder is inherited from OrderBook; the SDK's tradeAbi.ts documents
// this selector. This is decoding only: no additional write path is introduced.
const reportAbi = [...orderWriteAbi, ...operationsAbi.filter(item => item.type === 'function' && ['placeOrderFor', 'cancelOrderFor', 'reduceOrderFor'].includes(item.name)), ...parseAbi(['function reduceOrder(uint128 orderId, uint256 newQuantityRemaining)'])] as const;
export function decodeReportIntent(actor: Address, data: Hex) {
  const call = decodeFunctionData({ abi: reportAbi, data });
  switch (call.functionName) {
    case 'placeOrder': return { kind: 'place' as const, owner: actor, delegated: false, quantity: call.args[3], price: call.args[2], isBid: call.args[0], orderId: null, newRemaining: null };
    case 'placeOrderFor': return { kind: 'place' as const, owner: call.args[0], delegated: true, quantity: call.args[4], price: call.args[3], isBid: call.args[1], orderId: null, newRemaining: null };
    case 'cancelOrder': return { kind: 'cancel' as const, owner: actor, delegated: false, quantity: null, price: null, isBid: null, orderId: call.args[0], newRemaining: null };
    case 'cancelOrderFor': return { kind: 'cancel' as const, owner: call.args[0], delegated: true, quantity: null, price: null, isBid: null, orderId: call.args[1], newRemaining: null };
    case 'reduceOrder': return { kind: 'reduce' as const, owner: actor, delegated: false, quantity: null, price: null, isBid: null, orderId: call.args[0], newRemaining: call.args[1] };
    case 'reduceOrderFor': return { kind: 'reduce' as const, owner: call.args[0], delegated: true, quantity: null, price: null, isBid: null, orderId: call.args[1], newRemaining: call.args[2] };
    default: throw new Error('Unsupported call. This report handles single direct or delegated place, cancel and reduce calls only.');
  }
}
export const reportPath = (hash: Hash) => `/executions?chain=${config.chainId}&tx=${hash}`;
export const transactionExplorer = (hash: Hash) => `https://explorer.testnet.somnia.network/tokyo/tx/${hash}`;

/** Public inspection never imports or modifies a browser journal or send lock. */
export async function inspectTransaction(hash: Hash, chainId: number, outerSignal: AbortSignal) {
  if (!/^0x[\da-f]{64}$/i.test(hash)) throw new Error('Enter a full 32-byte transaction hash.');
  hash = hash.toLowerCase() as Hash;
  if (chainId !== config.chainId) throw new Error('Unsupported chain. Only verified testnet chain 50383 is supported.');
  const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(40_000)]);
  const { client, blockNumber } = await verifyDeployment(signal);
  const provenance = { schema: 'pei.execution-report.v1', chainId, genesis: config.genesisHash, sdkVersion: config.sdkVersion, hash, source: config.rpcUrl, explorer: transactionExplorer(hash), observedAt: Date.now() };
  let tx;
  try { tx = await client.getTransaction({ hash }); }
  catch (error) { if (error instanceof TransactionNotFoundError) return { ...provenance, state: 'not-found' as const, explanation: 'Transaction not found by this RPC. It may be unbroadcast, pending elsewhere, dropped, replaced or on another chain. No failure or fill is inferred.' }; throw error; }
  if (tx.hash !== hash || (tx.chainId !== undefined && tx.chainId !== chainId)) throw new Error('Transaction hash or chain mismatch.');
  if (!tx.to || tx.value !== 0n) return { ...provenance, state: 'unsupported' as const, explanation: 'Only zero-value calls directly to a registered perpetual pool are supported. Smart-account batches and other account operations retain their original inspectors.' };
  let intent;
  try { intent = decodeReportIntent(tx.from, tx.input); }
  catch { return { ...provenance, state: 'unsupported' as const, explanation: 'Unsupported calldata. Single direct/delegated place, cancel and reduce calls are supported; batches, router calls and non-trading operations are not decoded here.' }; }
  const market = await readMarket(tx.to, signal); // independently verifies factory membership and token precision
  let raw;
  try { raw = await client.getTransactionReceipt({ hash }); }
  catch (error) { if (error instanceof TransactionReceiptNotFoundError) return { ...provenance, state: 'pending' as const, explanation: 'Transaction observed; no canonical receipt is available yet. This is not a fill, revert, or permission to resend.' }; throw error; }
  const canonical = await client.getBlock({ blockNumber: raw.blockNumber });
  if (raw.transactionHash !== hash || canonical.hash !== raw.blockHash || tx.blockHash !== raw.blockHash || raw.blockNumber !== tx.blockNumber) throw new Error('Canonical receipt verification failed. The transaction may have been reorganized; outcome unresolved.');
  const { orderBookEventsAbi } = await import('@somnia-chain/markets-sdk');
  const cleanLogs = uniqueReceiptLogs(raw.logs).filter(log => sameAddress(log.address, tx.to!) && !log.removed && log.transactionHash === hash && log.blockHash === raw.blockHash);
  const events = raw.status === 'success' ? parseEventLogs({ abi: orderBookEventsAbi, logs: cleanLogs, strict: true }) : [];
  const placements = events.filter(event => event.eventName === 'OrderPlaced');
  const matchedPlacement = placements.find(event => sameAddress(event.args.placedOrder.owner, intent.owner) && event.args.orderId === event.args.placedOrder.orderId && event.args.placedOrder.fullQuantity === intent.quantity && event.args.placedOrder.price === intent.price && event.args.placedOrder.isBid === intent.isBid);
  const candidates = events.filter(event => event.eventName === 'OrderFilled');
  const takerIds = [...new Set(candidates.map(event => event.args.takerOrderId))];
  // Fully immediate orders need not emit OrderPlaced. One direct single-order
  // calldata + one unambiguous taker ID attributes that receipt's matching fills.
  const placeConsistent = placements.length === 0 || (placements.length === 1 && !!matchedPlacement);
  const orderId = intent.orderId ?? (placeConsistent ? matchedPlacement?.args.orderId ?? (takerIds.length === 1 ? takerIds[0] : undefined) : undefined);
  const attributedFills = intent.kind === 'place' && placeConsistent && takerIds.length <= 1 && orderId !== undefined ? candidates.filter(event => event.args.takerOrderId === orderId).map(event => ({ ...event.args, logIndex: event.logIndex })) : [];
  const candidateQuantity = attributedFills.reduce((total, fill) => total + fill.quantityFilled, 0n);
  const conflicting = !placeConsistent || takerIds.length > 1 || (intent.quantity !== null && candidateQuantity > intent.quantity);
  const fills = conflicting ? [] : attributedFills;
  const filled = fills.reduce((total, fill) => total + fill.quantityFilled, 0n);
  const cancelled = intent.kind === 'cancel' && events.some(event => (event.eventName === 'OrderCancelled' || event.eventName === 'OrderExpired') && event.args.orderId === orderId);
  const reduced = intent.kind === 'reduce' && events.some(event => event.eventName === 'OrderReduced' && event.args.orderId === orderId && event.args.newQuantity === intent.newRemaining);
  const parent = raw.blockNumber > 0n ? raw.blockNumber - 1n : 0n;
  const observedBlock = blockNumber > raw.blockNumber ? blockNumber : raw.blockNumber;
  const position = (block: bigint) => result(client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getPosition', args: [intent.owner, tx.to!], blockNumber: block }));
  const account = (block: bigint) => result(client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getAccountState', args: [intent.owner], blockNumber: block }));
  const [before, after, current, accountBefore, accountAfter, order] = await Promise.all([
    position(parent), position(raw.blockNumber), position(observedBlock), account(parent), account(raw.blockNumber),
    orderId === undefined ? Promise.resolve(null) : result(client.readContract({ address: tx.to, abi: poolAbi, functionName: 'getOrder', args: [orderId], blockNumber: observedBlock })),
  ]);
  const ownedOrder = order?.ok && order.value.orderId === orderId && sameAddress(order.value.owner, intent.owner) ? order.value : null;
  let outcome = 'Mined; business outcome unresolved';
  if (raw.status === 'reverted') outcome = 'Reverted; no execution from this transaction';
  else if (conflicting) outcome = 'Mined; conflicting event attribution — outcome unresolved';
  else if (cancelled) outcome = 'Cancellation / expiry event confirmed';
  else if (reduced) outcome = 'Resting remainder reduction confirmed';
  else if (intent.kind === 'place' && intent.quantity !== null && filled === intent.quantity) outcome = 'Fully filled in this receipt';
  else if (intent.kind === 'place' && filled > 0n) outcome = 'Partially filled in this receipt';
  else if (intent.kind === 'place' && ownedOrder && ownedOrder.quantityRemaining > 0n) outcome = 'No fills in receipt; remainder observed in current order storage';
  const warnings = [
    'Independent chain evidence does not prove which frontend submitted this transaction.',
    'Position and margin differences span whole blocks and may include other transactions.',
    'Current order storage includes later activity. A zero or absent remainder does not prove later fills; historical fills are not scanned by this report.',
    'Indexer history is not required or queried here. No claim of complete account or later-fill history is made.',
    'Stored remainder may be expired or unexecutable; cancellation and all other writes require fresh checks.',
    'Inspecting a hash never resolves a local unknown-send lock. Use the original journal recovery controls.',
  ];
  if (!before.ok || !after.ok || !accountBefore.ok || !accountAfter.ok) warnings.push('Historical block state is unavailable in part; receipt evidence remains separate and missing values are not zero.');
  if (conflicting) warnings.push('Event attribution is inconsistent. Fill totals are withheld; a zero decoded total is not evidence of no fills.');
  // Final canonical check prevents a read spanning a visible reorg from silently
  // mixing receipt and historical context. No depth/finality guarantee is made.
  if ((await client.getBlock({ blockNumber: raw.blockNumber })).hash !== raw.blockHash) throw new Error('Receipt block changed during inspection. Recheck; no final outcome is claimed.');
  return { ...provenance, observedAt: Date.now(), state: 'mined' as const, actor: tx.from, owner: intent.owner, pool: tx.to, intent, baseSymbol: market.metadata.baseSymbol, baseDecimals: market.metadata.baseDecimals, quoteSymbol: market.symbol, quoteDecimals: market.decimals,
    transactionStatus: raw.status, outcome, block: raw.blockNumber, blockHash: raw.blockHash, blockTimestamp: canonical.timestamp, nonce: tx.nonce, gasUsed: raw.gasUsed, gasPaid: raw.gasUsed * raw.effectiveGasPrice,
    orderId: orderId ?? null, fills, filled, conflicting, currentOrder: ownedOrder, orderRead: order, before, after, current, accountBefore, accountAfter, currentBlock: observedBlock, warnings };
}
export type TransactionReport = Awaited<ReturnType<typeof inspectTransaction>>;
