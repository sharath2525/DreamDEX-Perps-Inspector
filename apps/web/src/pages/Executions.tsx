import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { amount, exactUnits, inspectExecution, PERPS_CONFIG, PREFLIGHT_TTL_MS, prepareCancellation, readError, sameAddress, type PreparedCancellation } from '@pei/perps-adapter';
import type { Hash } from 'viem';
import { useAccount } from '../app/account-context';
import { saveAttempt, useAttempts, type Attempt } from '../app/execution-store';
import { sendReviewed } from '../app/send-order';
import { PageHeader } from '../components/PageHeader';
import { ExecutionDiagnostics } from '../components/ExecutionDiagnostics';
import { LocalActivity } from '../components/LocalActivity';
import { PublicTransactionInspector, TransactionReport } from '../components/TransactionReport';

function InspectAttempt({ attempt }: { attempt: Attempt }) {
  const account = useAccount();
  const [recoveryHash, setRecoveryHash] = useState(''), [error, setError] = useState('');
  const [budget, setBudget] = useState('0.01'), [cancel, setCancel] = useState<PreparedCancellation | null>(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [sent, setSent] = useState<Attempt | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelIdentity, setCancelIdentity] = useState(-1);
  const guard = useRef(false);
  const activeHash = attempt.replacement?.kind === 'repriced' ? attempt.replacement.hash : attempt.hash;
  const query = useQuery({ queryKey: ['execution', attempt.id, activeHash], enabled: !!activeHash && (!attempt.replacement || attempt.replacement.kind === 'repriced'), retry: false,
    queryFn: ({ signal }) => inspectExecution({ ...attempt, hash: activeHash! }, signal), refetchInterval: 10_000, refetchIntervalInBackground: false });
  const data = query.error ? undefined : query.data;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!query.data || query.error) return;
    const status = query.data.receipt.status === 'success' ? 'confirmed' : 'reverted';
    if (attempt.status !== status && !attempt.replacement) void saveAttempt({ ...attempt, status, timeline: [...(attempt.timeline ?? []), { stage: 'receipt-verified', at: query.data.observedAt, hash: query.data.receipt.transactionHash, block: query.data.receipt.blockNumber.toString() }] }).catch(() => { /* Receipt remains visible even when persistence is unavailable. */ });
  }, [query.data, query.error, attempt]);
  const session = account.signingSession();
  const canCancel = !!data?.restingOrder && !!session && account.chainId === PERPS_CONFIG.chainId && !!account.actor && !!account.owner && sameAddress(account.actor, attempt.owner) && sameAddress(account.owner, attempt.owner);
  const cancelReady = canCancel && cancelIdentity === account.identityVersion && cancel && now - cancel.checkedAt < PREFLIGHT_TTL_MS && cancel.gasBudget.toString() === (() => { try { return exactUnits(budget, 18).toString(); } catch { return ''; } })();
  async function recover() {
    if (guard.current || !/^0x[\da-f]{64}$/i.test(recoveryHash)) { setError('Enter the full transaction hash from wallet activity.'); return; }
    guard.current = true; setBusy(true); setError('');
    try {
      const verified = await inspectExecution({ ...attempt, hash: recoveryHash as Hash }, AbortSignal.timeout(35_000));
      await saveAttempt({ ...attempt, hash: recoveryHash as Hash, status: verified.receipt.status === 'success' ? 'confirmed' : 'reverted', timeline: [...(attempt.timeline ?? []), { stage: 'hash-recovered', at: Date.now(), hash: recoveryHash }, { stage: 'receipt-verified', at: verified.observedAt, hash: recoveryHash, block: verified.receipt.blockNumber.toString() }] });
    } catch (caught) { setError(`Hash not verified: ${readError(caught)}. The attempt remains unresolved.`); }
    finally { guard.current = false; setBusy(false); }
  }
  async function checkCancel() {
    if (guard.current || !data?.restingOrder || !canCancel) return;
    guard.current = true; setBusy(true); setError(''); setCancel(null); setConfirmed(false);
    try { setCancel(await prepareCancellation(attempt.owner, attempt.pool, data.restingOrder.orderId, exactUnits(budget, 18), AbortSignal.timeout(35_000))); setCancelIdentity(account.identityVersion); }
    catch (caught) { setError(readError(caught)); }
    finally { guard.current = false; setBusy(false); }
  }
  async function sendCancel() {
    if (guard.current || !cancel || !session || !cancelReady || !confirmed) return;
    guard.current = true; setBusy(true); setError('');
    try { await sendReviewed(cancel, session.provider, () => account.signingSession() === session, setSent); }
    catch (caught) { setError(readError(caught)); }
    finally { guard.current = false; setBusy(false); setCancel(null); setConfirmed(false); }
  }
  return <section className="panel execution-detail">
    <h2>{attempt.kind === 'place' ? 'Order attempt' : 'Cancellation attempt'}</h2><p>{new Date(attempt.createdAt).toLocaleString()} · journal status: {attempt.status}</p>
    <dl className="rules-grid"><div><dt>Owner / signer</dt><dd>{attempt.owner}</dd></div><div><dt>Pool</dt><dd>{attempt.pool}</dd></div><div><dt>Transaction hash</dt><dd>{attempt.hash ?? 'Not returned by wallet'}</dd></div><div><dt>Network</dt><dd>Hideki testnet · 50383 · SDK {PERPS_CONFIG.sdkVersion}</dd></div></dl>
    {attempt.error && <p className="data-warnings">{attempt.error}</p>}
    {!attempt.hash && ['unknown', 'awaiting-wallet'].includes(attempt.status) && <div className="data-warnings"><strong>Outcome unknown · another send is blocked</strong><p>The wallet may still be waiting, or may have broadcast before this page closed. Inspect wallet activity. Reloading does not authorize a retry.</p><label>Recover using a mined transaction hash<input aria-label="Recovery transaction hash" value={recoveryHash} onChange={event => setRecoveryHash(event.target.value)} /></label><button className="button secondary" disabled={busy} onClick={() => void recover()}>Verify recovered hash</button></div>}
    {attempt.hash && <><button className="button secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Inspecting chain…' : 'Refresh receipt & state'}</button>{query.error && <p role="alert">Receipt/state not verified: {readError(query.error)}. This may be pending, replaced, unavailable or mismatched; it is not proof of failure.</p>}</>}
    {data && activeHash && <TransactionReport hash={activeHash} localReference />}
    {data && <><details className="technical-details"><summary>Journal details and raw observations</summary><div className="data-status"><div><strong>{data.outcome}</strong><p>Original journal observations · receipt block {data.receipt.blockNumber.toString()} · current state block {data.currentBlock.toString()} · observed {new Date(data.observedAt).toLocaleTimeString()}</p></div></div>
      <dl className="rules-grid"><div><dt>Transaction status / gas paid</dt><dd>{data.receipt.status} / {amount(data.gasCost, 18)} STT</dd></div><div><dt>Order ID</dt><dd>{data.orderId?.toString() ?? 'Not evidenced'}</dd></div><div><dt>Receipt fills · raw base units</dt><dd>{data.filledQuantity.toString()} across {data.fills.length} events</dd></div><div><dt>Current resting remainder · raw base units</dt><dd>{data.restingOrder?.quantityRemaining.toString() ?? (data.resting && !data.resting.ok ? 'Read unavailable' : 'No owned resting remainder observed')}</dd></div>
      <div><dt>Position at parent / receipt block · raw base units</dt><dd>{data.before.ok ? data.before.value.size.toString() : 'Unavailable'} / {data.after.ok ? data.after.value.size.toString() : 'Unavailable'}</dd></div><div><dt>Current position · raw base units</dt><dd>{data.current.ok ? data.current.value.size.toString() : 'Unavailable'}</dd></div></dl>
      <p>Block-to-block position changes can include other transactions. Receipt fill events prove fills in this transaction; current state also includes later activity. Cancellation does not close a filled position.</p>
      {!!data.fills.length && <details open><summary>Verified fill events · raw units</summary><pre>{JSON.stringify(data.fills, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2)}</pre></details>}
      </details>
      {data.restingOrder && <div className="cancel-review"><h3>Cancel the resting remainder</h3><p>Order {data.restingOrder.orderId.toString()} is currently owned by {attempt.owner}. Cancellation requires a new wallet confirmation and may race with fills.</p>
        <label>Cancellation gas budget · STT<input value={budget} disabled={busy} onChange={event => { setBudget(event.target.value); setConfirmed(false); }} /></label>
        {!canCancel && <p>Connect the owning EOA on Hideki to enable cancellation.</p>}
        <button className="button secondary" disabled={!canCancel || busy} onClick={() => void checkCancel()}>Check cancellation · no signature</button>
        {cancel && <><p>Gas ceiling {amount(cancel.maximumGasCost, 18)} STT. {cancelReady ? 'Review valid for 30 seconds.' : 'Review expired or account changed.'}</p><label className="confirm-line"><input type="checkbox" checked={confirmed} disabled={busy || !cancelReady} onChange={event => setConfirmed(event.target.checked)} /><span>I authorize cancellation of this resting order and its gas cost.</span></label><button className="button" disabled={busy || !cancelReady || !confirmed} onClick={() => void sendCancel()}>Confirm cancellation & open wallet</button></>}
      </div>}</>}
    {error && <p role="alert">{error}</p>}{sent && <div role="status"><p>Cancellation attempt: {sent.status}</p><code className="address-line">{sent.hash}</code><Link to={`/executions/${sent.id}`}>Inspect cancellation</Link></div>}
    <Link className="text-link" to="/positions">Refresh full account exposure</Link>
    <ExecutionDiagnostics attempt={attempt} inspection={data} />
  </section>;
}

export function Executions() {
  const { attemptId } = useParams();
  const { records, error } = useAttempts();
  const selected = records.find(row => row.id === attemptId);
  return <><PageHeader eyebrow="EXECUTION INSPECTOR" title="See what really happened." description="Local attempts matched to chain transactions, receipts and current positions." />
    <p className="coverage-note">This device’s journal is not complete trading history. It stores public transaction metadata locally, without keys or signatures. A hash or successful receipt alone is not proof of a fill.</p>
    <PublicTransactionInspector />
    {error && <p role="alert" className="data-warnings">{error} Sending is blocked until reliable storage is available.</p>}
    {attemptId && !selected && <section className="panel panel-message">Execution record not found on this device. <Link to="/executions">View local attempts</Link>.</section>}
    {selected && <InspectAttempt key={selected.id} attempt={selected} />}
    {!attemptId && <section className="panel"><LocalActivity /></section>}
    {!records.length && !error && <section className="panel feature-empty"><h2>No local execution attempts</h2><p>No order has been submitted from this browser journal.</p><Link className="button secondary" to="/trade">Open order workspace</Link></section>}
    {!!records.length && <section className="panel attempt-list"><h2>Local attempts</h2>{records.map(row => <Link key={row.id} to={`/executions/${row.id}`}><span>{row.kind === 'place' ? 'Order' : 'Cancel'} · {row.status}</span><small>{new Date(row.createdAt).toLocaleString()} · {row.hash ?? row.id}</small></Link>)}</section>}
  </>;
}
