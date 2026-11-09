import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { isAddress, type Address } from 'viem';
import { amount, exactUnits, PERPS_CONFIG, PREFLIGHT_TTL_MS, prepareOrder, readError, sameAddress, validateGrid, type OrderDraft, type OrderMode, type PreparedOrder } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useMarket, useMarkets } from '../app/queries';
import { sendReviewed } from '../app/send-order';
import type { Attempt } from '../app/execution-store';
import { diagnoseFailure, rejectionEvidence, type DiagnosticCode } from '@pei/perps-adapter';
import { EvidenceDownload } from '../components/EvidenceDownload';
import { PageHeader } from '../components/PageHeader';
import { Operations } from './Operations';
import { ExecutionJourney } from '../components/ExecutionJourney';
import { DiagnosticCard } from '../components/DiagnosticCard';

export function Trade() {
  const account = useAccount();
  const { pool } = useParams();
  return account.actor && account.owner && !sameAddress(account.actor, account.owner) ? <Operations key={pool ?? 'linked'} initialPool={pool} /> : <DirectTrade />;
}
function DirectTrade() {
  const { pool: routePool } = useParams();
  const account = useAccount();
  const markets = useMarkets();
  const [selected, setSelected] = useState('');
  const poolText = routePool ?? selected;
  const pool = isAddress(poolText) ? poolText as Address : null;
  const market = useMarket(pool);
  const [price, setPrice] = useState(''), [quantity, setQuantity] = useState('');
  const [isBid, setIsBid] = useState(true), [mode, setMode] = useState<OrderMode>('limit');
  const [expiryMinutes, setExpiry] = useState('10'), [gasBudget, setGasBudget] = useState('0.01');
  const [prepared, setPrepared] = useState<{ value: PreparedOrder; key: string } | null>(null);
  const [busy, setBusy] = useState(false), [issue, setIssue] = useState<{ key: string; message: string; stage: 'preflight' | 'submission'; code: DiagnosticCode; at: number } | null>(null), [confirmed, setConfirmed] = useState('');
  const [attemptRecord, setAttemptRecord] = useState<{ key: string; row: Attempt } | null>(null);
  const [failure, setFailure] = useState<{ code: DiagnosticCode; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false), request = useRef<AbortController | null>(null);
  const current = useRef('');
  const session = account.signingSession();
  const key = JSON.stringify([pool, price, quantity, isBid, mode, expiryMinutes, gasBudget, account.owner, account.actor, account.chainId, account.identityVersion, !!session]);
  useEffect(() => { current.current = key; request.current?.abort(); }, [key]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => { clearInterval(timer); request.current?.abort(); current.current = ''; }; }, []);
  const error = issue?.key === key ? issue.message : '';
  const attempt = attemptRecord?.key === key ? attemptRecord.row : null;
  const review = prepared?.key === key ? prepared.value : null;
  const ready = !!review && now - review.checkedAt < PREFLIGHT_TTL_MS;
  const identityReady = !!account.owner && !!account.actor && sameAddress(account.owner, account.actor) && account.chainId === PERPS_CONFIG.chainId && !!session;
  let validation = '';
  if (market.data && price && quantity) {
    try { validateGrid(exactUnits(price, market.data.decimals), exactUnits(quantity, market.data.metadata.baseDecimals), market.data.metadata.tickSize, market.data.metadata.lotSize, market.data.metadata.minQuantity); }
    catch (caught) { validation = readError(caught); }
  }
  async function check() {
    if (inFlight.current || !pool || !account.owner || !identityReady) return;
    inFlight.current = true; setBusy(true); setIssue(null); setPrepared(null); setConfirmed(''); setFailure(null);
    const controller = new AbortController(); request.current = controller;
    const draft: OrderDraft = { pool, owner: account.owner, isBid, price, quantity, mode, expiryMinutes, gasBudget };
    try {
      const value = await prepareOrder(draft, AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]));
      if (current.current === key && account.signingSession() === session) setPrepared({ value, key });
    } catch (caught) { if (!controller.signal.aborted) { if (current.current === key) { setIssue({ key, message: readError(caught), stage: 'preflight', code: diagnoseFailure(caught).code, at: Date.now() }); setFailure({ code: diagnoseFailure(caught).code, at: Date.now() }); } } }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function send() {
    if (inFlight.current || !review || !session || !ready || confirmed !== `${key}:${review.checkedAt}`) return;
    inFlight.current = true; setBusy(true); setIssue(null);
    try { await sendReviewed(review, session.provider, () => current.current === key && account.signingSession() === session, row => setAttemptRecord({ key, row })); }
    catch (caught) { if (current.current === key) setIssue({ key, message: readError(caught), stage: 'submission', code: diagnoseFailure(caught).code, at: Date.now() }); }
    finally { inFlight.current = false; setBusy(false); setPrepared(null); setConfirmed(''); }
  }
  return <>
    <PageHeader eyebrow="ORDER WORKSPACE" title="Start with a checked intent." description="Compose a real testnet order, review its costs, then confirm in your wallet." />
    <ExecutionJourney active={!identityReady ? 0 : review && ready ? 2 : attempt && account.owner && sameAddress(attempt.owner, account.owner) ? 3 : 1} detail={!identityReady ? 'Select a signing wallet and trading account on chain 50383.' : review && ready ? 'Unsigned checks passed. Review the terms below; a simulation does not prove a fill.' : attempt && account.owner && sameAddress(attempt.owner, account.owner) ? 'A wallet attempt is recorded. Use its original journal to verify the outcome before any retry.' : 'Enter your order terms, then run preflight without a signature.'} />
    <p className="coverage-note">Direct account · the signer and trading account are the same. To trade for an app wallet, select its address in account setup.</p>
    <div className="trade-grid"><section className="panel trade-form" onChange={() => { setPrepared(null); setConfirmed(''); }}><h2>Order intent</h2>
      <label>Market<select aria-label="Market" value={poolText} disabled={!!routePool || busy} onChange={event => setSelected(event.target.value)}><option value="">Select a verified market</option>{routePool && !markets.data?.rows.some(row => sameAddress(row.pool, routePool)) && <option value={routePool}>{routePool}</option>}{markets.data?.rows.map(row => <option key={row.pool} value={row.pool}>{row.metadata.ok ? row.metadata.value.baseSymbol : row.pool} / {markets.data.symbol}</option>)}</select></label>
      {routePool && <Link to="/trade">Choose another market</Link>}
      {routePool && !pool && <p role="alert">Invalid pool address. Select a verified market.</p>}
      {(markets.error || market.error) && <p role="alert">{readError(market.error ?? markets.error)}</p>}
      <label>Side<select value={isBid ? 'buy' : 'sell'} disabled={busy} onChange={event => setIsBid(event.target.value === 'buy')}><option value="buy">Buy / long</option><option value="sell">Sell / short</option></select></label>
      <label>Order type<select value={mode} disabled={busy} onChange={event => setMode(event.target.value as OrderMode)}><option value="limit">Limit · rest until expiry</option><option value="ioc">Bounded market · immediate or cancel</option><option value="fok">Fill or kill</option><option value="post">Post only</option></select></label>
      <label>{isBid ? 'Maximum buy price' : 'Minimum sell price'}{market.data ? ` · ${market.data.symbol}` : ''}<input aria-label="Price" inputMode="decimal" value={price} disabled={busy} onChange={event => setPrice(event.target.value)} placeholder="Enter your price bound" /></label>
      <label>Quantity{market.data ? ` · ${market.data.metadata.baseSymbol}` : ''}<input aria-label="Quantity" inputMode="decimal" value={quantity} disabled={busy} onChange={event => setQuantity(event.target.value)} placeholder="Enter base quantity" /></label>
      <label>Expiry in minutes<input inputMode="numeric" value={expiryMinutes} disabled={busy} onChange={event => setExpiry(event.target.value)} /></label>
      <label>Maximum gas budget · STT<input inputMode="decimal" value={gasBudget} disabled={busy} onChange={event => setGasBudget(event.target.value)} /></label>
      {market.data && <p>Tick {amount(market.data.metadata.tickSize, market.data.decimals)} · lot {amount(market.data.metadata.lotSize, market.data.metadata.baseDecimals)} · minimum {amount(market.data.metadata.minQuantity, market.data.metadata.baseDecimals)}. Quotes are observations; liquidity can change.</p>}
      {validation && <><p role="alert">{validation}</p><DiagnosticCard code="precision" stage="validation" at={now} /></>}
      {!identityReady && <p>A matching owner wallet on chain 50383 is required. Reconnect after account or network changes.</p>}
      <button className="button secondary" disabled={busy || !identityReady || !pool || !price || !quantity || !!validation || !market.data || !!market.error} onClick={() => void check()}>{busy ? 'Checking / waiting…' : 'Run preflight · no signature'}</button>
    </section><section className="panel trade-review"><h2>Review before signing</h2>
      {!review && <p>Preflight verifies the deployment, precision, account capacity, funding and simulated transaction. It never signs.</p>}
      {review && <><span className="subtle-badge">{ready ? 'PREFLIGHT PASSED' : 'REVIEW EXPIRED · RUN AGAIN'}</span><dl className="rules-grid">
        <div><dt>Owner and signer</dt><dd>{review.intent.owner}</dd></div><div><dt>Pool · chain 50383</dt><dd>{review.intent.pool}</dd></div>
        <div><dt>Order</dt><dd>{isBid ? 'Buy' : 'Sell'} {quantity} {review.market.metadata.baseSymbol} at bound {price} {review.market.symbol} · {mode}</dd></div>
        <div><dt>Notional at price bound · rounded up</dt><dd>{amount((review.intent.price * review.intent.quantity + 10n ** BigInt(review.market.metadata.baseDecimals) - 1n) / 10n ** BigInt(review.market.metadata.baseDecimals), review.market.decimals)} {review.market.symbol}</dd></div>
        <div><dt>Expires</dt><dd>{new Date(Number(review.intent.expireTimestampNs / 1_000_000n)).toLocaleString()}</dd></div>
        <div><dt>Maximum capacity · {review.maximum.limitedBy}</dt><dd>{amount(review.maximum.maxQuantity, review.market.metadata.baseDecimals)}</dd></div>
        <div><dt>Margin lock / fee headroom</dt><dd>{amount(review.margin.lockAmount, review.market.decimals)} / {amount(review.margin.feeHeadroom, review.market.decimals)} {review.market.symbol}</dd></div>
        <div><dt>Potential wallet pull / bank allowance</dt><dd>{amount(review.margin.ownWalletPull, review.market.decimals)} / {amount(review.margin.wallet?.allowance, review.market.decimals)} {review.market.symbol}</dd></div>
        <div><dt>Gas ceiling with buffers</dt><dd>{amount(review.maximumGasCost, 18)} STT · {review.gasLimit.toString()} gas</dd></div>
        <div><dt>Visible book quantity within bound</dt><dd>{review.estimate ? amount(review.estimate.visibleQuantity, review.market.metadata.baseDecimals) : 'Unavailable'} · up to 10 levels; no fill guarantee</dd></div>
        <div><dt>Source blocks</dt><dd>Market {review.market.blockNumber.toString()} · size {review.maximum.asOfBlock.toString()} · margin {review.margin.asOfBlock.toString()} · simulation {review.blockNumber.toString()}</dd></div>
      </dl><details><summary>Normalized unsigned call</summary><pre>{JSON.stringify(review.call, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2)}</pre></details>
      <label className="confirm-line"><input type="checkbox" checked={confirmed === `${key}:${review.checkedAt}`} disabled={busy || !ready} onChange={event => setConfirmed(event.target.checked ? `${key}:${review.checkedAt}` : '')} /><span>I authorize this testnet order and gas ceiling. Existing MarginBank allowances may fund a shortfall; the funding preview is not a hard spending cap. This order can increase or flip my position.</span></label>
      <button className="button" disabled={busy || !ready || confirmed !== `${key}:${review.checkedAt}`} onClick={() => void send()}>Confirm & open wallet</button></>}
      {error && issue && <><DiagnosticCard code={issue.code} stage={issue.stage} at={issue.at} /><details open className="technical-details"><summary>Technical error details</summary><p role="alert">{error}</p></details></>}
      {failure && issue?.key === key && issue.stage === 'preflight' && <><p>Preflight stopped before any wallet request. This is not a mined failure.</p><EvidenceDownload name="preflight-diagnostic" value={rejectionEvidence(failure.code, failure.at)} /></>}
      {attempt && <div role="status"><p>Attempt: {attempt.status}</p>{attempt.hash && <code className="address-line">{attempt.hash}</code>}<Link className="text-link" to={`/executions/${attempt.id}`}>Inspect this attempt</Link></div>}
      <p>No ordinary reduce-only guarantee. A successful preflight is a simulation, not a fill. The wallet may let you edit fees; verify its final transaction before signing.</p>
    </section></div>
  </>;
}
