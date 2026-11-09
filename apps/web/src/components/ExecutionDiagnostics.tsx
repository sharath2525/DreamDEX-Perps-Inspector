import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { diagnostic, executionEvidence, reconcileIndexer, replayFailure, verifyReplacement, readError, type ExecutionInspection } from '@pei/perps-adapter';
import type { Hash } from 'viem';
import { saveAttempt, type Attempt } from '../app/execution-store';
import { EvidenceDownload } from './EvidenceDownload';

export function ExecutionDiagnostics({ attempt, inspection }: { attempt: Attempt; inspection?: ExecutionInspection }) {
  const [candidate, setCandidate] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const reference = { ...attempt, hash: inspection?.receipt.transactionHash ?? attempt.hash! };
  const indexer = useQuery({ queryKey: ['execution-indexer', attempt.id, reference.hash, inspection?.receipt.blockNumber.toString()], enabled: !!inspection,
    queryFn: ({ signal }) => reconcileIndexer(reference, inspection!.receipt.blockNumber, inspection!.orderId, signal), retry: false, staleTime: Infinity, refetchOnWindowFocus: false });
  const replay = useQuery({ queryKey: ['execution-replay', reference.hash], enabled: false, retry: false,
    queryFn: ({ signal }) => replayFailure(inspection!.transaction, inspection!.receipt, signal) });
  const explanation = diagnostic(attempt.status === 'rejected' ? 'rejected' : 'unresolved');
  async function recoverReplacement() {
    if (busy || !attempt.hash || !/^0x[\da-f]{64}$/i.test(candidate)) { setError('Enter a full replacement hash from wallet activity.'); return; }
    setBusy(true); setError('');
    try {
      const evidence = await verifyReplacement({ ...attempt, hash: attempt.hash }, candidate as Hash, AbortSignal.timeout(25_000));
      await saveAttempt({ ...attempt, status: 'replaced', replacement: evidence, timeline: [...(attempt.timeline ?? []), { stage: 'replacement-verified', at: evidence.observedAt, hash: evidence.hash, block: evidence.blockNumber }] });
    } catch (caught) { setError(`Replacement not verified: ${readError(caught)}. No retry has been enabled.`); }
    finally { setBusy(false); }
  }
  return <section className="diagnostic-section"><h3>Timeline & diagnostics</h3>
    {attempt.timeline?.length ? <ol className="attempt-timeline">{attempt.timeline.map((event, index) => <li key={`${event.stage}-${index}`}><strong>{event.stage.replaceAll('-', ' ')}</strong><span>{new Date(event.at).toLocaleString()}{event.block ? ` · block ${event.block}` : ''}</span></li>)}</ol> : <p>Legacy journal entry: detailed preflight timeline was not recorded. No missing timestamps are inferred.</p>}
    {!inspection && <p>{explanation.title}. {explanation.nextCheck}</p>}
    {inspection && <><h3>Indexer reconciliation</h3><p>{indexer.isFetching ? 'Checking up to three indexer observations…' : indexer.data ? `Indexer: ${indexer.data.state} · target block ${indexer.data.target} · processed ${indexer.data.processed ?? 'unknown'}.` : 'Indexer observation unavailable.'}</p>
      {indexer.data?.state === 'caught-up' && <p>{indexer.data.order ? `Matching owner row observed with indexed status ${indexer.data.order.status}.` : 'Block processed, but no matching order row observed. Receipt evidence remains separate.'}</p>}
      <p>Receipt events are execution evidence. Indexer delay, missing rows or a processed block do not change a receipt into a fill.</p><button className="button secondary" disabled={indexer.isFetching} onClick={() => void indexer.refetch()}>Recheck indexer</button>
      {inspection.receipt.status === 'reverted' && <><h3>Mined failure analysis</h3><p>The receipt proves a revert, but does not contain its reason. A parent-block replay is approximate and can differ from the original transaction state.</p><button className="button secondary" disabled={replay.isFetching} onClick={() => void replay.refetch()}>Replay read-only at parent block</button>{replay.data && <p>Replay: {replay.data.state} at block {replay.data.atBlock.toString()}. {replay.data.explanation.title}. {replay.data.explanation.nextCheck}</p>}{replay.error && <p>Replay unavailable; no revert reason is claimed.</p>}</>}
      <h3>Margin before / after receipt block</h3><p>Unlocked: {inspection.accountBefore.ok ? inspection.accountBefore.value.unlockedCollateralBalance.toString() : 'unknown'} / {inspection.accountAfter.ok ? inspection.accountAfter.value.unlockedCollateralBalance.toString() : 'unknown'} raw quote units. Locked: {inspection.accountBefore.ok ? inspection.accountBefore.value.lockedCollateral.toString() : 'unknown'} / {inspection.accountAfter.ok ? inspection.accountAfter.value.lockedCollateral.toString() : 'unknown'}. These are whole-block observations.</p>
    </>}
    {attempt.replacement && <div className="data-warnings"><strong>Verified replacement: {attempt.replacement.kind}</strong><p>Hash {attempt.replacement.hash} consumed nonce {attempt.replacement.nonce} in block {attempt.replacement.blockNumber}. Receipt status: {attempt.replacement.receiptStatus}. {attempt.replacement.kind === 'repriced' ? 'The inspector reads the replacement receipt for the same intent.' : 'The original order intent was replaced; this does not prove an order fill or close existing positions.'}</p></div>}
    {attempt.hash && !attempt.replacement && ['submitted', 'unknown'].includes(attempt.status) && <details><summary>Wallet sped up, cancelled or replaced this transaction?</summary><p>Enter the mined replacement hash. Verification requires the original transaction to remain available from the RPC and checks sender, nonce, chain and canonical receipt. If the original is unavailable, this tool leaves the outcome unresolved.</p><label>Replacement transaction hash<input value={candidate} onChange={event => setCandidate(event.target.value)} /></label><button className="button secondary" disabled={busy} onClick={() => void recoverReplacement()}>Verify replacement</button>{error && <p role="alert">{error}</p>}</details>}
    <EvidenceDownload value={executionEvidence(attempt, inspection, indexer.error ? undefined : indexer.data)} name={`execution-${attempt.id}`} />
  </section>;
}
