import { decodeFunctionData, parseEventLogs, type Address, type Hash, type Hex } from 'viem';
import { bankAbi, poolAbi } from './abi';
import { PERPS_CONFIG as config } from './config';
import { orderWriteAbi } from './trade';
import { readMarket, result, sameAddress, verifyDeployment } from './read';
import { uniqueReceiptLogs } from './diagnostics';

export interface ExecutionReference { owner: Address; pool: Address; data: Hex; hash: Hash; kind: 'place' | 'cancel' }
export async function inspectExecution(reference: ExecutionReference, signal: AbortSignal) {
  await readMarket(reference.pool, signal);
  const { client, blockNumber } = await verifyDeployment(signal);
  const [rawReceipt, transaction] = await Promise.all([
    client.getTransactionReceipt({ hash: reference.hash }), client.getTransaction({ hash: reference.hash }),
  ]);
  const receipt = { ...rawReceipt, logs: uniqueReceiptLogs(rawReceipt.logs) };
  if (!sameAddress(transaction.from, reference.owner) || !transaction.to || !sameAddress(transaction.to, reference.pool) || transaction.input !== reference.data || transaction.value !== 0n || (transaction.chainId !== undefined && transaction.chainId !== config.chainId)) throw new Error('Transaction does not match the saved owner, pool, calldata, value or chain. It cannot resolve this attempt.');
  const canonical = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (canonical.hash !== receipt.blockHash || transaction.blockHash !== receipt.blockHash) throw new Error('Receipt is not on the current canonical chain. Recheck before acting.');
  const decodedCall = decodeFunctionData({ abi: orderWriteAbi, data: transaction.input });
  if ((reference.kind === 'place' && decodedCall.functionName !== 'placeOrder') || (reference.kind === 'cancel' && decodedCall.functionName !== 'cancelOrder')) throw new Error('Saved operation differs from actual calldata.');
  const { decodePlaceOrder, orderBookEventsAbi } = await import('@somnia-chain/markets-sdk');
  const decoded = receipt.status === 'success' && reference.kind === 'place' ? decodePlaceOrder(receipt, reference.pool) : { orderId: undefined, fills: [] };
  const orderId = decodedCall.functionName === 'cancelOrder' ? decodedCall.args[0] : decoded.orderId ?? decoded.fills[0]?.takerOrderId;
  const logs = parseEventLogs({ abi: orderBookEventsAbi, logs: receipt.logs.filter(log => sameAddress(log.address, reference.pool)) });
  const cancelled = receipt.status === 'success' && reference.kind === 'cancel' && logs.some(log => (log.eventName === 'OrderCancelled' || log.eventName === 'OrderExpired') && log.args.orderId === orderId);
  const filledQuantity = decoded.fills.reduce((sum, fill) => sum + fill.quantityFilled, 0n);
  const position = (at: bigint) => client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getPosition', args: [reference.owner, reference.pool], blockNumber: at });
  const [before, after, current, resting] = await Promise.all([
    result(position(receipt.blockNumber > 0n ? receipt.blockNumber - 1n : 0n)), result(position(receipt.blockNumber)), result(position(blockNumber)),
    orderId !== undefined ? result(client.readContract({ address: reference.pool, abi: poolAbi, functionName: 'getOrder', args: [orderId], blockNumber })) : Promise.resolve(null),
  ]);
  const account = (at: bigint) => client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getAccountState', args: [reference.owner], blockNumber: at });
  const [accountBefore, accountAfter] = await Promise.all([result(account(receipt.blockNumber > 0n ? receipt.blockNumber - 1n : 0n)), result(account(receipt.blockNumber))]);
  const restingOrder = resting?.ok && resting.value.orderId === orderId && sameAddress(resting.value.owner, reference.owner) && resting.value.quantityRemaining > 0n ? resting.value : null;
  const submittedQuantity = decodedCall.functionName === 'placeOrder' ? decodedCall.args[3] : null;
  let outcome = 'Confirmed; business outcome unresolved';
  if (receipt.status === 'reverted') outcome = 'Reverted; no order execution from this transaction';
  else if (reference.kind === 'cancel') outcome = cancelled ? 'Cancellation / expiry event confirmed' : 'Confirmed; cancellation event not found';
  else if (submittedQuantity !== null && filledQuantity === submittedQuantity) outcome = 'Fully filled in this receipt';
  else if (filledQuantity > 0n) outcome = 'Partially filled in this receipt';
  else if (restingOrder) outcome = 'No fills in receipt; order currently resting';
  return { receipt, transaction, orderId, fills: decoded.fills, filledQuantity, submittedQuantity, cancelled, outcome,
    before, after, current, accountBefore, accountAfter, resting, restingOrder, currentBlock: blockNumber, observedAt: Date.now(),
    gasCost: receipt.gasUsed * receipt.effectiveGasPrice };
}
export type ExecutionInspection = Awaited<ReturnType<typeof inspectExecution>>;
