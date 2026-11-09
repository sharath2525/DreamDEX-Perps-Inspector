import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { isAddress, type Address } from 'viem';
import { amount, type MarketSnapshot, type ReadResult } from '@pei/perps-adapter';
import { useMarkets, useMarket } from '../app/queries';
import { PageHeader } from '../components/PageHeader';
import { DataStatus, Warnings } from '../components/DataStatus';

function Book({ title, levels, snapshot }: { title: string; levels: MarketSnapshot['bids']; snapshot: MarketSnapshot }) {
  return <section className="panel"><div className="panel-heading"><h2>{title}</h2><span className="subtle-badge">UP TO 10 LEVELS</span></div>
    {!levels.ok ? <p className="panel-message">Unavailable: {levels.error}</p> : !levels.value.length ? <p className="panel-message">No resting levels returned at this block.</p> : <div className="table-scroll"><table className="compact-table"><thead><tr><th>Price ({snapshot.symbol})</th><th>Quantity ({snapshot.metadata.baseSymbol})</th></tr></thead><tbody>{levels.value.map((level, index) => <tr key={index}><td>{amount(level.price, snapshot.decimals)}</td><td>{amount(level.quantity, snapshot.metadata.baseDecimals)}</td></tr>)}</tbody></table></div>}
  </section>;
}
function value<T>(item: ReadResult<T>, format: (value: T) => string): string { return item.ok ? format(item.value) : 'Unavailable'; }
function MarketDetails({ pool }: { pool: Address }) {
  const query = useMarket(pool);
  const data = query.data;
  const warnings = data ? [
    ...(data.restricted ? ['This pool is restricted; position increases may be unavailable.'] : []),
    ...(!data.mark.ok || !data.mark.value[0] || data.mark.value[1] <= 0n ? ['The mark is unavailable or unpriceable. No substitute price is shown.'] : []),
    ...(!data.index.ok ? [`Index price unavailable: ${data.index.error}`] : []),
    ...(!data.funding.ok ? [`Funding unavailable: ${data.funding.error}`] : []),
  ] : [];
  const indexAge = data?.index.ok ? data.blockTimestamp - data.index.value[1] : null;
  const indexFresh = data?.index.ok && data.index.value[0] > 0n && data.parameters.ok && indexAge !== null && indexAge >= 0n && indexAge <= data.parameters.value.maxOracleStalenessSec;
  return <div className="market-detail" id="selected-market">
    <div className="detail-title"><h2>{data?.metadata.baseSymbol ?? 'Selected market'} / {data?.symbol ?? 'collateral'}</h2><code>{pool}</code></div>
    <DataStatus observedAt={data?.observedAt} blockNumber={data?.blockNumber} error={query.error} fetching={query.isFetching} refresh={() => void query.refetch()} threshold={30000} />
    <Warnings items={warnings} />
    {data && <>
      <div className="live-metrics">
        <article><h3>Mark price · {data.symbol}</h3><strong>{data.mark.ok && data.mark.value[0] && data.mark.value[1] > 0n ? amount(data.mark.value[1], data.decimals) : 'Unpriceable'}</strong><p>Contract liveness flag checked</p></article>
        <article><h3>Index price · {data.symbol}</h3><strong>{indexFresh && data.index.ok ? amount(data.index.value[0], data.decimals) : 'Unavailable / stale'}</strong><p>{indexAge !== null ? `Oracle age at snapshot: ${indexAge}s` : 'Oracle read unavailable'}</p></article>
        <article><h3>Funding per window</h3><strong>{value(data.funding, rate => `${amount(rate, 16)}%`)}</strong><p>{value(data.parameters, params => `${params.fundingCalculationWindowSec}s window / ${params.fundingSettlementIntervalSec}s settlement`)}</p></article>
        <article><h3>Open interest · {data.metadata.baseSymbol}</h3><strong>{value(data.interest, interest => amount(interest, data.metadata.baseDecimals))}</strong><p>Observed at the snapshot block</p></article>
      </div>
      <div className="book-grid"><Book title="Resting bids" levels={data.bids} snapshot={data} /><Book title="Resting asks" levels={data.asks} snapshot={data} /></div>
      <p className="info-line">Resting liquidity is indicative. Orders can expire, fill or change before any transaction.</p>
      <section className="panel market-rules"><div className="panel-heading"><h2>Verified market rules</h2></div><dl className="rules-grid">
        <div><dt>Price tick</dt><dd>{amount(data.metadata.tickSize, data.decimals)} {data.symbol}</dd></div>
        <div><dt>Lot size</dt><dd>{amount(data.metadata.lotSize, data.metadata.baseDecimals)} {data.metadata.baseSymbol}</dd></div>
        <div><dt>Minimum quantity</dt><dd>{amount(data.metadata.minQuantity, data.metadata.baseDecimals)} {data.metadata.baseSymbol}</dd></div>
        <div><dt>Base / quote decimals</dt><dd>{data.metadata.baseDecimals} / {data.decimals}</dd></div>
        <div><dt>Base initial margin</dt><dd>{amount(data.metadata.initialMarginBps, 2)}% · effective margin may be higher</dd></div>
        <div><dt>Maintenance / close-out</dt><dd>{amount(data.metadata.maintenanceMarginBps, 2)}% / {amount(data.metadata.closeOutMarginBps, 2)}%</dd></div>
        <div><dt>Maker / taker fee</dt><dd>{amount(data.metadata.makerFeeBpsTimes1k, 5)}% / {amount(data.metadata.takerFeeBpsTimes1k, 5)}%</dd></div>
        <div><dt>Max position / open interest</dt><dd>{amount(data.metadata.maxPositionSize, data.metadata.baseDecimals)} / {amount(data.metadata.maxOpenInterest, data.metadata.baseDecimals)} {data.metadata.baseSymbol}</dd></div>
      </dl></section><Link className="button secondary" to={`/trade/${pool}`}>Compose an order</Link>
    </>}
  </div>;
}
export function Markets() {
  const query = useMarkets();
  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const poolParam = params.get('pool');
  const selected = poolParam && isAddress(poolParam) ? poolParam : null;
  const data = query.data;
  const rows = data?.rows.filter(row => `${row.metadata.ok ? row.metadata.value.baseSymbol : ''} ${row.pool}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  return <>
    <PageHeader eyebrow="MARKETS" title="Find your market." description="Factory-verified markets and block-pinned HTTP snapshots. No wallet needed." />
    <DataStatus observedAt={data?.observedAt} blockNumber={data?.blockNumber} error={query.error} fetching={query.isFetching} refresh={() => void query.refetch()} threshold={90000} />
    {data && <><div className="connection-grid"><div><strong>{data.rows.length} factory pools</strong><p>{data.rows.filter(row => row.metadata.ok).length} with verified metadata · others retained as unavailable</p></div><div><strong>Indexer lag: {data.lagBlocks?.toString() ?? 'unknown'} blocks</strong><p>{data.lagSeconds === null ? 'Time lag unavailable' : `${data.lagSeconds}s behind independent RPC head`}</p></div><div><strong>HTTP snapshots · polling</strong><p>{data.websocket.ok ? data.websocket.value : data.websocket.error}</p></div></div><Warnings items={data.warnings} /></>}
    <div className="filter-row"><label htmlFor="market-search">Find by symbol or pool</label><input id="market-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search available markets" /></div>
    <section className="panel"><div className="table-scroll"><table className="market-table"><thead><tr><th>Market</th><th>Registration & rules</th><th>Indexer</th><th>Inspect</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.pool}><td><strong>{row.metadata.ok ? `${row.metadata.value.baseSymbol} / ${data?.symbol}` : 'Metadata unavailable'}</strong><code className="address-line">{row.pool}</code></td><td>{row.metadata.ok ? row.restricted ? 'Verified · restricted' : 'Verified · unrestricted' : row.metadata.error}</td><td>{row.indexed ? 'Listed' : 'Not listed · chain discovery'}</td><td><button className="button secondary" aria-pressed={selected === row.pool} onClick={() => navigate({ pathname: '/markets', search: '?pool=' + row.pool, hash: '#selected-market' })}>Inspect<span className="sr-only"> {row.metadata.ok ? row.metadata.value.baseSymbol : row.pool}</span></button></td></tr>)}
      {!rows.length && <tr><td colSpan={4}>{data ? search ? 'No markets match this search.' : 'The factory returned no pools at this block.' : query.isError ? 'Market data is unavailable. Use Refresh to retry.' : 'Checking the testnet deployment…'}</td></tr>}
    </tbody></table></div></section>
    {selected ? <MarketDetails key={selected} pool={selected} /> : <p className="info-line">Choose a market to read its current mark, funding, liquidity and trading rules.</p>}
  </>;
}
