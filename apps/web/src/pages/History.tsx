import { useState } from 'react';
import { Link } from 'react-router';
import type { Hash } from 'viem';
import { useInfiniteQuery } from '@tanstack/react-query';
import { HISTORY_MAX_PAGES, readHistoryPage, mergeHistory, historyCsv, historyEvidence, readError, reportPath, type HistoryKind } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { PageHeader } from '../components/PageHeader';
import { AccountLookup } from '../components/AccountLookup';
import { EvidenceDownload } from '../components/EvidenceDownload';
import { LocalActivity } from '../components/LocalActivity';

export function History() {
  const { owner } = useAccount(); const [kind, setKind] = useState<HistoryKind>('orders');
  const [pool, setPool] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [revision, setRevision] = useState(0);
  const query = useInfiniteQuery({ queryKey: ['history', owner, kind, revision], enabled: !!owner, initialPageParam: { page: 0, cursor: null as string | null },
    queryFn: ({ pageParam, signal }) => readHistoryPage({ owner: owner!, kind }, pageParam.page, pageParam.cursor, signal),
    getNextPageParam: last => last.hasMore && last.page + 1 < HISTORY_MAX_PAGES ? { page: last.page + 1, cursor: last.nextCursor } : undefined,
    retry: false, staleTime: Infinity, gcTime: 0 });
  const pages = query.data?.pages ?? [];
  let rows = [] as ReturnType<typeof mergeHistory>, conflict = '';
  try { rows = mergeHistory(pages); } catch (error) { conflict = readError(error); }
  const invalidDates = !!from && !!to && from > to;
  const visible = invalidDates ? [] : rows.filter(row => (!pool || row.pool?.includes(pool.toLowerCase())) && (!from || Number(row.timestamp) >= Date.parse(`${from}T00:00:00Z`) / 1000) && (!to || Number(row.timestamp) < Date.parse(`${to}T00:00:00Z`) / 1000 + 86400));
  function csv() { const url = URL.createObjectURL(new Blob([historyCsv(visible)], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `pei-${kind}-loaded-records.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <><PageHeader eyebrow="HISTORY" title="Follow your trading record." description="Inspect bounded indexed activity. Records retain exact raw units and their public transaction provenance." /><AccountLookup />
    <section className="panel"><LocalActivity /></section>
    <section className="panel risk-controls"><h2>Indexed chain history · includes activity outside PEI</h2><label>Record type<select value={kind} onChange={event => setKind(event.target.value as HistoryKind)}>{(['orders', 'fills', 'funding', 'margin'] as const).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <div className="history-filters"><label>Pool filter · loaded records<input value={pool} placeholder="0x…" onChange={event => setPool(event.target.value)} /></label><label>From · UTC<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Through · UTC<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div>
      <button className="button secondary" disabled={!owner || query.isFetching} onClick={() => setRevision(value => value + 1)}>Restart from newest</button>
      <p>{visible.length} visible / {rows.length} unique loaded · {pages.length} of at most {HISTORY_MAX_PAGES} pages. Filters apply only to loaded records. Load older pages to widen coverage. No lifetime PnL is inferred.</p>
      <p>Funding: positive means paid, negative means received. Amount is raw base quantity for fills, cumulative filled base quantity for orders, and raw collateral for funding/margin. Order hashes identify placement, not the terminal event.</p>
      {invalidDates && <p role="alert">From date must not be later than Through date.</p>}{query.error && <p role="alert">{readError(query.error)} Loaded data, if any, remains a prior observation.</p>}{conflict && <p role="alert">{conflict}</p>}
    </section>
    {!owner ? <p>Select a public account to load history.</p> : query.isPending ? <p role="status">Loading verified history…</p> : !conflict && <>
      <section className="panel"><p className="coverage-note">Indexer observations; not receipt-verified executions. {pages.at(-1) && `Observed ${new Date(pages.at(-1)!.observedAt).toLocaleString()}; processed block ${pages.at(-1)!.processed ?? 'unknown'}, RPC head ${pages.at(-1)!.head}.`} Offset pagination can skip records while the dataset changes; refresh starts a new view.</p><div className="table-scroll"><table><thead><tr><th>Outcome / ID</th><th>Time · UTC</th><th>Pool</th><th>Raw amount / price</th><th>Transaction</th></tr></thead><tbody>{visible.map(row => <tr key={`${row.kind}:${row.id}`}><td>{row.label}<code className="address-line">{row.id}</code>{row.orderId && <span>Order {row.orderId}</span>}</td><td>{new Date(Number(row.timestamp) * 1000).toISOString()}</td><td><code className="address-line">{row.pool ?? 'Account scope'}</code></td><td>{row.amount}{row.price !== null && <p>Price {row.price}</p>}</td><td><details><summary>Inspect record</summary><code className="address-line">{row.txHash}</code><Link to={reportPath(row.txHash as Hash)}>Verify transaction independently</Link><p>Block {row.blockNumber ?? 'not supplied by this endpoint'}</p></details></td></tr>)}</tbody></table></div>{!visible.length && !query.error && <p>No matching records in the loaded pages. This does not prove an empty lifetime history.</p>}</section>
      <button className="button secondary" disabled={!query.hasNextPage || query.isFetching || !!query.error} onClick={() => void query.fetchNextPage()}>{query.isFetching ? 'Loading…' : 'Load older records'}</button>
      {pages.length === HISTORY_MAX_PAGES && pages.at(-1)?.hasMore && <p className="data-warnings">500-row bound reached. Older records are omitted.</p>}
      {!!pages.length && !invalidDates && <><button className="button secondary" onClick={csv}>Download visible CSV</button><EvidenceDownload value={historyEvidence(pages, visible, { pool, from, to })} name="history" /></>}
    </>}
  </>;
}
