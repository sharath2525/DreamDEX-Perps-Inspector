import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import type { Hash } from 'viem';
import { amount, evidenceJson, inspectTransaction, PERPS_CONFIG, readError, reportPath, type TransactionReport as Report } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { EvidenceDownload } from './EvidenceDownload';
import { CaseOutcome } from './CaseOutcome';
import { ExecutionJourney } from './ExecutionJourney';

function MinedReport({ report }: { report: Extract<Report, { state: 'mined' }> }) {
  const account = useAccount();
  const [copied, setCopied] = useState('');
  const base = (value: bigint | null | undefined) => value == null ? 'Unavailable' : `${amount(value, report.baseDecimals)} ${report.baseSymbol}`;
  const quote = (value: bigint | undefined) => value === undefined ? 'Unavailable' : `${amount(value, report.quoteDecimals)} ${report.quoteSymbol}`;
  async function copy() { try { await navigator.clipboard.writeText(new URL(reportPath(report.hash), window.location.origin).href); setCopied('Report link copied. Site access permissions still apply.'); } catch { setCopied('Clipboard unavailable. Copy the report link below.'); } }
  const current = report.current.ok ? report.current.value.size : undefined;
  return <>
    <CaseOutcome report={report} />
    <div className="data-status"><div><strong>Execution outcome: {report.outcome}</strong><p>Transaction: {report.transactionStatus} · {report.intent.delegated ? 'Linked operator' : 'Direct account'} {report.intent.kind} · block {report.block.toString()}</p></div></div>
    <dl className="rules-grid report-facts">
      <div><dt>Signing actor / gas payer</dt><dd>{report.actor}</dd></div><div><dt>Receiving trading account</dt><dd>{report.owner}</dd></div>
      <div><dt>Registered market pool</dt><dd>{report.baseSymbol} · {report.pool}</dd></div><div><dt>Order ID</dt><dd>{report.orderId?.toString() ?? 'Not evidenced'}</dd></div>
      <div><dt>Submitted quantity / requested remainder</dt><dd>{base(report.intent.kind === 'reduce' ? report.intent.newRemaining : report.intent.quantity)}</dd></div>
      <div><dt>Fills in this receipt</dt><dd>{report.conflicting ? 'Withheld — conflicting event attribution' : `${base(report.filled)} · ${report.fills.length} matching events`}</dd></div>
      <div><dt>Latest owned remainder</dt><dd>{report.currentOrder ? base(report.currentOrder.quantityRemaining) : report.orderRead && !report.orderRead.ok ? 'Read unavailable' : 'No matching owned order observed'}</dd></div>
      <div><dt>Actual gas paid</dt><dd>{amount(report.gasPaid, 18)} STT</dd></div>
      <div><dt>Position before / after receipt block</dt><dd>{base(report.before.ok ? report.before.value.size : undefined)} → {base(report.after.ok ? report.after.value.size : undefined)}</dd></div>
      <div><dt>Current exposure</dt><dd>{current === undefined ? 'Unavailable' : current === 0n ? 'Flat' : `${current > 0n ? 'Long' : 'Short'} · ${base(current < 0n ? -current : current)}`}</dd></div>
      <div><dt>Unlocked margin before / after block</dt><dd>{quote(report.accountBefore.ok ? report.accountBefore.value.unlockedCollateralBalance : undefined)} → {quote(report.accountAfter.ok ? report.accountAfter.value.unlockedCollateralBalance : undefined)}</dd></div>
      <div><dt>Locked margin before / after block</dt><dd>{quote(report.accountBefore.ok ? report.accountBefore.value.lockedCollateral : undefined)} → {quote(report.accountAfter.ok ? report.accountAfter.value.lockedCollateral : undefined)}</dd></div>
    </dl>
    <p>Receipt time: {new Date(Number(report.blockTimestamp) * 1000).toLocaleString()}. Current observations: block {report.currentBlock.toString()}, read {new Date(report.observedAt).toLocaleString()}. Block-level changes can include other transactions.</p>
    <div className="input-actions"><Link className="button secondary" to={`/positions?case=${report.hash}`} onClick={() => account.inspect(report.owner)}>Inspect resulting positions</Link><Link className="button secondary" to={`/positions/risk?pool=${report.pool}&case=${report.hash}`} onClick={() => account.inspect(report.owner)}>Explore this market’s risk</Link><a className="button secondary" href={report.explorer} target="_blank" rel="noreferrer">Open transaction explorer</a><button className="button secondary" onClick={() => void copy()}>Copy independent report link</button></div>
    <p className="address-line"><Link to={reportPath(report.hash)}>{new URL(reportPath(report.hash), window.location.origin).href}</Link></p><p role="status">{copied}</p>
    <p>Positions and risk links switch to public read-only inspection. They do not authorize trading. To cancel or reduce, return to the original trading workspace and run a fresh review.</p>
    <details><summary>Evidence coverage, network and raw units</summary><p>Chain {report.chainId} · SDK {report.sdkVersion} · genesis {report.genesis}</p><ul>{report.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul><pre>{evidenceJson(report)}</pre></details>
    <EvidenceDownload value={report} name={`report-${report.hash}`} label="report" />
  </>;
}
export function TransactionReport({ hash, chain = PERPS_CONFIG.chainId, localReference = false }: { hash: Hash; chain?: number; localReference?: boolean }) {
  const query = useQuery({ queryKey: ['public-execution-report', chain, hash], queryFn: ({ signal }) => inspectTransaction(hash, chain, signal), retry: false, staleTime: 15000, refetchOnWindowFocus: false });
  const data = query.error ? undefined : query.data;
  const phase = data?.state === 'mined' && data.transactionStatus === 'success' && !data.conflicting ? 4 : 3;
  return <section className="panel execution-report" aria-label="Independent execution report"><h2>Execution report</h2><p>{localReference ? 'Linked from a local journal record. Local records are editable; the chain report below is independently checked.' : 'Independent transaction inspection. No claim that this transaction originated in PEI.'}</p><code className="address-line">{hash}</code>
    <ExecutionJourney active={phase} detail={phase === 4 ? 'Receipt inspected. Review the outcome and unknowns below, then check exposure and save evidence.' : 'Verify this hash. Pending, unsupported or unavailable evidence never becomes a successful trade.'} />
    <button className="button secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Verifying transaction…' : 'Refresh independent report'}</button>
    {query.error && <p role="alert">Report unresolved: {readError(query.error)} No fill or failure is inferred. Retry the read; do not resend an uncertain transaction.</p>}
    {data?.state === 'mined' ? <MinedReport report={data} /> : data && <div className="data-warnings"><strong>{data.state === 'pending' ? 'Pending / receipt unavailable' : data.state === 'not-found' ? 'Transaction not found' : 'Unsupported transaction'}</strong><p>{data.explanation}</p><EvidenceDownload value={data} name="unresolved-report" /></div>}
  </section>;
}
export function PublicTransactionInspector() {
  const [params, setParams] = useSearchParams();
  const hash = params.get('tx') ?? '', chainText = params.get('chain') ?? String(PERPS_CONFIG.chainId);
  const [draft, setDraft] = useState({ context: hash, value: hash, error: '' });
  const input = draft.context === hash ? draft.value : hash;
  const error = draft.context === hash ? draft.error : '';
  const valid = /^0x[\da-f]{64}$/i.test(hash), correctChain = chainText === String(PERPS_CONFIG.chainId);
  function inspect(event: FormEvent) { event.preventDefault(); if (!/^0x[\da-f]{64}$/i.test(input.trim())) { setDraft({ context: hash, value: input, error: 'Paste the full 66-character transaction hash.' }); return; } const next = input.trim().toLowerCase(); setDraft({ context: next, value: next, error: '' }); setParams({ chain: String(PERPS_CONFIG.chainId), tx: next }); }
  return <><form className="panel account-access" onSubmit={inspect}><h2>Inspect a transaction without connecting a wallet</h2><label htmlFor="public-tx">Testnet transaction hash</label><div className="input-actions"><input id="public-tx" value={input} onChange={event => setDraft({ context: hash, value: event.target.value, error: '' })} placeholder="0x… transaction hash" /><button className="button secondary">Inspect transaction</button></div><p>Read-only · chain 50383. Share links contain only chain and hash, never your local notes. The hosted site’s access restrictions still apply.</p>{error && <p role="alert">{error}</p>}</form>
    {hash && (!valid || !correctChain) && <p role="alert">Invalid report link: use a full transaction hash and chain 50383.</p>}
    {valid && correctChain && <TransactionReport key={hash} hash={hash as Hash} />}
  </>;
}
