import type { Hash, Log, Transaction, TransactionReceipt } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { PERPS_CONFIG as config } from './config';
import { sameAddress, verifyDeployment } from './read';
import type { ExecutionReference } from './execution';

const explanations = {
  precision: ['Input precision or market grid rejected', 'Use the observed decimals, tick, lot and minimum; do not round silently.'],
  collateral: ['Collateral or margin constraint', 'Inspect unlocked margin, voucher rules and existing wallet allowances before changing size.'],
  liquidity: ['Order could not execute against available liquidity', 'Refresh the book and review the price bound and order type. A no-fill IOC is an expected restriction.'],
  identity: ['Account, permission or deployment mismatch', 'Reconnect the intended owner on the verified testnet. Do not bypass the identity check.'],
  gas: ['Gas budget or native balance constraint', 'Review the fresh gas estimate and signing-wallet STT balance.'],
  stale: ['Review or source data became stale', 'Refresh the snapshot and run a new preflight before confirming.'],
  rejected: ['Wallet rejected the request', 'No automatic retry. A new attempt requires another explicit confirmation.'],
  unresolved: ['Transaction outcome is not established', 'Inspect wallet activity and recover the hash or a proven same-nonce replacement. Do not resend blindly.'],
  unavailable: ['Read or simulation unavailable', 'Check the RPC/SDK connection and retry the read. This is not proof of a mined failure.'],
} as const;
export type DiagnosticCode = keyof typeof explanations;
export function diagnostic(code: DiagnosticCode) { return { code, title: explanations[code][0], nextCheck: explanations[code][1] }; }
/** Only constant explanations leave this boundary; raw provider errors can contain credentials. */
export function diagnoseFailure(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : '';
  const code: DiagnosticCode = /precision|decimal places|tick|lot|minimum|positive decimal/i.test(text) ? 'precision'
    : /collateral|margin check|capacity|voucher|isolat/i.test(text) ? 'collateral'
    : /ImmediateOrCancelNoFill|FillOrKill|PostOnly|liquidity/i.test(text) ? 'liquidity'
    : /genesis|identity|account changed|Wallet account|permission|direct EOA|registered|deployment|linked/i.test(text) ? 'identity'
    : /gas|STT budget/i.test(text) ? 'gas' : /stale|expired|aged out/i.test(text) ? 'stale'
    : /unresolved|outcome unknown/i.test(text) ? 'unresolved' : 'unavailable';
  return diagnostic(code);
}
export function uniqueReceiptLogs<T extends Log>(logs: readonly T[]) {
  const found = new Map<string, T>();
  for (const log of logs) {
    if (log.removed) continue;
    if (log.logIndex === null || !log.transactionHash || !log.blockHash) throw new Error('Receipt log identity is unavailable.');
    const key = `${log.blockHash}:${log.transactionHash}:${log.logIndex}`;
    const previous = found.get(key);
    if (previous && (previous.data !== log.data || previous.address.toLowerCase() !== log.address.toLowerCase() || previous.topics.join() !== log.topics.join())) throw new Error('Conflicting duplicate receipt logs.');
    found.set(key, log);
  }
  return [...found.values()];
}
export async function replayFailure(transaction: Transaction, receipt: TransactionReceipt, signal: AbortSignal) {
  const { client } = await verifyDeployment(signal);
  const at = receipt.blockNumber > 0n ? receipt.blockNumber - 1n : 0n;
  try { await client.call({ account: transaction.from, to: transaction.to!, data: transaction.input, value: transaction.value, gas: transaction.gas, blockNumber: at });
    return { atBlock: at, state: 'replay-succeeded' as const, explanation: diagnostic('unresolved') };
  } catch (caught) {
    const { decodeRevert } = await import('@somnia-chain/markets-sdk');
    const decoded = decodeRevert(caught);
    const explanation = diagnoseFailure(new Error(decoded.errorName ?? 'Unknown revert'));
    return { atBlock: at, state: decoded.errorName ? 'named-revert' as const : 'unavailable' as const, explanation };
  }
}
export async function reconcileIndexer(reference: Pick<ExecutionReference, 'owner' | 'pool'>, target: bigint, orderId: bigint | undefined, signal: AbortSignal) {
  const { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } = await import('@somnia-chain/markets-sdk');
  const bounded = AbortSignal.any([signal, AbortSignal.timeout(8_000)]);
  const exchange = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: config.indexerUrl, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, signal: bounded, indexerLimits: { maxAttempts: 1 } });
  let processed: number | null = null;
  try {
    // At most three watermark observations. A processed block is NOT proof of an order/fill.
    for (let poll = 0; poll < 3; poll++) {
      bounded.throwIfAborted();
      const sync = await exchange.client.getSyncStatus(config.chainId);
      processed = sync?.latestProcessedBlock ?? null;
      if (sync?.chainId !== config.chainId) throw new Error('Indexer chain binding unavailable.');
      if (processed !== null && BigInt(processed) >= target) {
        const { blockNumber } = await verifyDeployment(bounded);
        if (BigInt(processed) > blockNumber + 100n) throw new Error('Indexer ahead of verified chain.');
        const order = orderId === undefined ? null : await exchange.client.getOrder(reference.pool, orderId);
        const ownerMatches = order ? sameAddress(order.owner, reference.owner) : null;
        return { state: ownerMatches === false ? 'mismatch' as const : 'caught-up' as const, processed, target, polls: poll + 1,
          order: order && ownerMatches ? { owner: order.owner, status: order.status, placedAtBlock: order.placedAtBlock } : null, observedAt: Date.now() };
      }
      if (poll < 2) await new Promise<void>(resolve => setTimeout(resolve, 350));
    }
    return { state: 'delayed' as const, processed, target, polls: 3, order: null, observedAt: Date.now() };
  } catch { signal.throwIfAborted(); return { state: 'unavailable' as const, processed, target, polls: null, order: null, observedAt: Date.now() }; }
  finally { await exchange.close(); }
}
export type IndexerReconciliation = Awaited<ReturnType<typeof reconcileIndexer>>;

/** Verifies a mined replacement using the ORIGINAL transaction's node-observed nonce. */
export async function verifyReplacement(reference: ExecutionReference, candidateHash: Hash, signal: AbortSignal) {
  if (candidateHash.toLowerCase() === reference.hash.toLowerCase()) throw new Error('Enter a different replacement hash.');
  const { client } = await verifyDeployment(signal);
  const [original, candidate, receipt] = await Promise.all([client.getTransaction({ hash: reference.hash }), client.getTransaction({ hash: candidateHash }), client.getTransactionReceipt({ hash: candidateHash })]);
  if (!sameAddress(original.from, reference.owner) || !original.to || !sameAddress(original.to, reference.pool) || original.input !== reference.data || original.value !== 0n) throw new Error('Original transaction does not match the saved intent.');
  if (!sameAddress(candidate.from, original.from) || candidate.nonce !== original.nonce || candidate.chainId !== config.chainId) throw new Error('Replacement sender, nonce or chain differs from the original.');
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash || candidate.blockHash !== block.hash) throw new Error('Replacement is not canonically mined.');
  const sameIntent = candidate.to && sameAddress(candidate.to, reference.pool) && candidate.input === reference.data && candidate.value === 0n;
  const cancelled = candidate.to && sameAddress(candidate.to, reference.owner) && candidate.input === '0x' && candidate.value === 0n;
  return { hash: candidateHash, originalHash: reference.hash, nonce: candidate.nonce, kind: sameIntent ? 'repriced' as const : cancelled ? 'wallet-cancelled' as const : 'different-call' as const,
    receiptStatus: receipt.status, blockNumber: receipt.blockNumber.toString(), blockHash: receipt.blockHash, observedAt: Date.now() };
}
export type ReplacementEvidence = Awaited<ReturnType<typeof verifyReplacement>>;
