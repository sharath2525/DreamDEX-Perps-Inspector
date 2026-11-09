import { PERPS_CONFIG } from './config';
import type { ExecutionInspection } from './execution';
import type { IndexerReconciliation, ReplacementEvidence, DiagnosticCode } from './diagnostics';
import { diagnostic } from './diagnostics';

export const timelineStages = ['preflight-passed', 'review-confirmed', 'wallet-requested', 'hash-returned', 'wallet-rejected', 'outcome-unknown', 'receipt-verified', 'hash-recovered', 'replacement-verified'] as const;
export type TimelineStage = typeof timelineStages[number];
export interface TimelineEvent { stage: TimelineStage; at: number; hash?: string; block?: string }
export interface PreflightEvidence { at: number; block: string; gasBudget: string; maximumGasCost: string; marginLock?: string; ownWalletPull?: string; maximumQuantity?: string }
export interface EvidenceAttempt {
  id: string; createdAt: number; kind: string; status: string; owner: string; pool: string; data: string; hash?: string;
  positionBefore: string; gasLimit: string; gasPrice: string; quantity?: string; price?: string; baseDecimals?: number; quoteDecimals?: number;
  preflight?: PreflightEvidence; timeline?: TimelineEvent[]; replacement?: ReplacementEvidence;
}
function position(value: ExecutionInspection['before']) {
  return value.ok ? { state: 'observed', size: value.value.size.toString(), avgEntryPrice: value.value.avgEntryPrice.toString(), entryFundingIndex: value.value.entryFundingIndex.toString() } : { state: 'unavailable' };
}
function account(value: ExecutionInspection['accountBefore']) {
  return value.ok ? { state: 'observed', unlocked: value.value.unlockedCollateralBalance.toString(), locked: value.value.lockedCollateral.toString(), activePools: [...value.value.activePerpPools] } : { state: 'unavailable' };
}
export function executionEvidence(attempt: EvidenceAttempt, inspection?: ExecutionInspection, indexed?: IndexerReconciliation) {
  // Deliberately build an allowlist. Never spread a wallet, request error, receipt or SDK object into an export.
  return {
    schema: 'pei.execution-evidence.v1', exportedAt: new Date().toISOString(), chainId: PERPS_CONFIG.chainId, genesis: PERPS_CONFIG.genesisHash,
    sdkVersion: PERPS_CONFIG.sdkVersion, source: { rpc: PERPS_CONFIG.rpcUrl, indexer: PERPS_CONFIG.indexerUrl },
    scope: 'Local journal plus freshly verified chain observations. Not complete account history or a bounty claim.',
    attempt: { id: attempt.id, createdAt: attempt.createdAt, kind: attempt.kind, status: attempt.status, owner: attempt.owner, pool: attempt.pool, data: attempt.data, hash: attempt.hash ?? null,
      positionBefore: attempt.positionBefore, gasLimit: attempt.gasLimit, gasPrice: attempt.gasPrice, quantity: attempt.quantity ?? null, price: attempt.price ?? null, baseDecimals: attempt.baseDecimals ?? null, quoteDecimals: attempt.quoteDecimals ?? null },
    preflight: attempt.preflight ? { at: attempt.preflight.at, block: attempt.preflight.block, gasBudget: attempt.preflight.gasBudget, maximumGasCost: attempt.preflight.maximumGasCost, marginLock: attempt.preflight.marginLock, ownWalletPull: attempt.preflight.ownWalletPull, maximumQuantity: attempt.preflight.maximumQuantity } : null,
    timeline: (attempt.timeline ?? []).map(event => ({ stage: event.stage, at: event.at, hash: event.hash, block: event.block })),
    replacement: attempt.replacement ? { hash: attempt.replacement.hash, originalHash: attempt.replacement.originalHash, nonce: attempt.replacement.nonce, kind: attempt.replacement.kind, receiptStatus: attempt.replacement.receiptStatus, blockNumber: attempt.replacement.blockNumber, blockHash: attempt.replacement.blockHash, observedAt: attempt.replacement.observedAt } : null,
    chain: inspection ? { observedAt: inspection.observedAt, hash: inspection.receipt.transactionHash, block: inspection.receipt.blockNumber.toString(), blockHash: inspection.receipt.blockHash,
      transactionStatus: inspection.receipt.status, businessOutcome: inspection.outcome, nonce: inspection.transaction.nonce, gasUsed: inspection.receipt.gasUsed.toString(), gasCostWei: inspection.gasCost.toString(),
      orderId: inspection.orderId?.toString() ?? null, filledQuantity: inspection.filledQuantity.toString(),
      fills: inspection.fills.map(fill => ({ takerOrderId: fill.takerOrderId.toString(), makerOrderId: fill.makerOrderId.toString(), quantityFilled: fill.quantityFilled.toString(), price: fill.fillPrice.toString(), takerRemaining: fill.takerRemainingQuantity.toString(), makerRemaining: fill.makerRemainingQuantity.toString() })),
      positionBeforeBlock: position(inspection.before), positionAtReceiptBlock: position(inspection.after), currentPosition: position(inspection.current),
      accountBeforeBlock: account(inspection.accountBefore), accountAtReceiptBlock: account(inspection.accountAfter), currentBlock: inspection.currentBlock.toString(),
      resting: inspection.resting?.ok ? { state: 'observed', remaining: inspection.restingOrder?.quantityRemaining.toString() ?? '0' } : { state: 'unknown' },
    } : null,
    indexer: indexed ? { state: indexed.state, processed: indexed.processed, target: indexed.target.toString(), polls: indexed.polls, observedAt: indexed.observedAt,
      order: indexed.order ? { owner: indexed.order.owner, status: indexed.order.status, placedAtBlock: indexed.order.placedAtBlock } : null } : null,
    limitations: ['A journal is editable local data; chain receipt provenance is independently checkable.', 'Before/after positions and margin are block-level and may include other transactions.', 'A processed indexer block does not prove an order or a fill.', 'No credentials, wallet sessions, signatures or raw signed transactions are included.'],
  };
}
export function rejectionEvidence(code: DiagnosticCode, at: number) { return { schema: 'pei.preflight-diagnostic.v1', observedAt: at, network: PERPS_CONFIG.chainId, stage: 'preflight', broadcast: false, diagnostic: diagnostic(code), limitation: 'Local validation or read/simulation failure; not a mined revert, security finding or submitted report.' }; }
export function evidenceJson(value: unknown) { return JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2); }
export function evidenceMarkdown(value: unknown) {
  // Escape delimiters so even hostile on-chain strings cannot terminate the code block or inject markup.
  const safe = evidenceJson(value).replace(/`/g, '\\u0060').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `# Perps Execution Inspector evidence\n\nRecorded observations; review scope and limitations before sharing. All raw integer amounts are decimal strings.\n\n\`\`\`json\n${safe}\n\`\`\`\n`;
}
