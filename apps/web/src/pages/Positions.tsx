import { useState, type FormEvent } from 'react';
import { getAddress, isAddress } from 'viem';
import { amount, type AccountSnapshot } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useAccountSnapshot } from '../app/queries';
import { PageHeader } from '../components/PageHeader';
import { ReturnToCase } from '../components/ExecutionJourney';
import { DataStatus, Warnings } from '../components/DataStatus';
import { Amount } from '../components/Amount';

function AccountDetails({ data }: { data: AccountSnapshot }) {
  const q = (value: bigint | undefined) => <Amount value={value} decimals={data.decimals} />;
  const health = data.health.ok ? data.health.value : undefined;
  return <>
    <div className="live-metrics">
      <article><h3>Equity · {data.symbol}</h3><strong>{q(health?.[0])}</strong><p>Account-wide; shared collateral counted once</p></article>
      <article><h3>Unlocked / locked · {data.symbol}</h3><strong>{q(data.state.unlockedCollateralBalance)} / {q(data.state.lockedCollateral)}</strong><p>Perps MarginBank balances</p></article>
      <article><h3>Maintenance headroom · {data.symbol}</h3><strong>{q(health ? health[0] - health[2] : undefined)}</strong><p>{data.status.ok ? ['Healthy', 'Margin call', 'Partial liquidation', 'Close out'][data.status.value] ?? 'Unknown status' : 'Health status unavailable'}</p></article>
      <article><h3>Withdrawable · {data.symbol}</h3><strong>{q(data.withdrawable.ok ? data.withdrawable.value : undefined)}</strong><p>Read-only observation; no withdrawal action</p></article>
    </div>
    <details className="panel technical-details"><summary>Wallet funds, voucher and margin details</summary><dl className="rules-grid">
      <div><dt>Selected account native balance</dt><dd>{amount(data.nativeBalance.ok ? data.nativeBalance.value : undefined, 18)} STT. A linked signing wallet pays its own gas separately.</dd></div>
      <div><dt>Wallet token balance</dt><dd>{q(data.tokenBalance.ok ? data.tokenBalance.value : undefined)} {data.symbol}</dd></div>
      <div><dt>Non-withdrawable voucher floor</dt><dd>{q(data.floor.ok ? data.floor.value : undefined)} {data.symbol}</dd></div>
      <div><dt>Voucher</dt><dd>{!data.voucher.ok ? 'Unavailable' : data.voucher.value === null ? 'Programme inactive' : `${data.voucher.value.claimed ? 'Claimed' : 'Not claimed'} · expiry ${data.voucher.value.expiresAt === 0n ? 'none active' : new Date(Number(data.voucher.value.expiresAt) * 1000).toLocaleString()}`}</dd></div>
      <div><dt>Margin mode</dt><dd>{data.isolated.ok ? data.isolated.value ? 'Isolated' : 'Cross margin' : 'Unavailable'}</dd></div>
      <div><dt>Account code</dt><dd>{data.code.ok ? data.code.value && data.code.value !== '0x' ? 'Contract code present; ownership not inferred' : 'No deployed code observed; ownership not inferred' : 'Unavailable'}</dd></div>
      <div><dt>Initial / maintenance / close-out requirement</dt><dd>{q(health?.[1])} / {q(health?.[2])} / {q(health?.[3])} {data.symbol}</dd></div>
    </dl><p className="panel-message">Wallet tokens, bank margin and voucher credit are different balances. The voucher floor cannot be withdrawn. Unlocked collateral can still be constrained by margin requirements and the voucher floor; use the observed withdrawable value.</p></details>
    <div className="coverage-note">Position reads: {data.positionCoverageComplete ? 'all bank-active pools read' : 'partial'} · Pricing: {data.analyticsComplete ? 'available for returned positions' : 'partial / unavailable'} · Orders: {data.orderCoverageComplete ? 'complete for enumerated pools' : 'partial'} · {data.scannedPools} pools scanned. Indexed active rows: {data.indexedPositionCount ?? 'unavailable'}.</div>
    <Warnings items={[...data.warnings, ...(!data.health.ok ? [`Account health unavailable: ${data.health.error}`] : []), ...(!data.withdrawable.ok ? [`Withdrawable balance unavailable: ${data.withdrawable.error}`] : [])]} />
    <section className="panel"><div className="panel-heading"><h2>Current positions</h2><span className="subtle-badge">CHAIN STATE · RAW VALUES RETAINED WHEN METADATA FAILS</span></div><div className="table-scroll"><table className="positions-table"><thead><tr><th>Market</th><th>Direction / size</th><th>Entry / mark</th><th>Price PnL</th><th>Accrued funding</th><th>Read status</th></tr></thead><tbody>
      {data.positions.map(row => <tr key={row.pool}><td><strong>{row.metadata.ok ? row.metadata.value.baseSymbol : 'Unknown market'}</strong><code className="address-line">{row.pool}</code></td><td>{row.position.ok ? <>{row.position.value.size < 0n ? 'Short' : row.position.value.size > 0n ? 'Long' : 'Flat'}<br />{row.metadata.ok ? amount(row.position.value.size, row.metadata.value.baseDecimals) : `${row.position.value.size} raw units`}</> : 'Unavailable'}</td><td>{q(row.position.ok ? row.position.value.avgEntryPrice : undefined)} / {q(row.analytics.ok ? row.analytics.value.markPrice : undefined)}</td><td>{q(row.analytics.ok ? row.analytics.value.metrics.unrealizedPnl : undefined)}</td><td>{q(row.analytics.ok ? row.analytics.value.metrics.accruedFunding : undefined)}</td><td>{!row.position.ok ? row.position.error : !row.analytics.ok ? row.analytics.error : !row.metadata.ok ? row.metadata.error : 'Priceable'}</td></tr>)}
      {!data.positions.length && <tr><td colSpan={6}>{data.positionCoverageComplete ? 'No non-flat positions observed in bank-active and indexed pools at this block.' : 'Position coverage is incomplete; an empty list does not establish a flat account.'}</td></tr>}
    </tbody></table></div><p className="panel-message">PnL and funding are in {data.symbol}. Positive accrued funding is a cost; negative funding is a credit. Fees and realized history are separate.</p></section>
    <section className="panel order-panel"><div className="panel-heading"><h2>Pending orders</h2><span className="subtle-badge">{data.orderCount} IDENTIFIERS OBSERVED</span></div><div className="table-scroll"><table><thead><tr><th>Pool / ID</th><th>Side</th><th>Price · {data.symbol}</th><th>Remaining quantity</th><th>Status at snapshot</th></tr></thead><tbody>{data.orders.map(row => <tr key={`${row.pool}-${row.orderId}`}><td><strong>{row.metadata.ok ? row.metadata.value.baseSymbol : 'Unknown market'}</strong><code className="address-line">{row.pool}</code><span>#{row.orderId.toString()}</span></td><td>{row.detail.ok ? row.detail.value.isBid ? 'Bid' : 'Ask' : '—'}</td><td>{q(row.detail.ok ? row.detail.value.price : undefined)}</td><td>{row.detail.ok ? row.metadata.ok ? <><Amount value={row.detail.value.quantityRemaining} decimals={row.metadata.value.baseDecimals} /> {row.metadata.value.baseSymbol}</> : `${row.detail.value.quantityRemaining} raw units` : '—'}</td><td>{row.detail.ok ? row.detail.value.expireTimestampNs > 0n && row.detail.value.expireTimestampNs <= data.blockTimestamp * 1_000_000_000n ? 'Expired, still on book' : 'Resting' : row.detail.error}</td></tr>)}{!data.orders.length && <tr><td colSpan={5}>{data.orderCoverageComplete ? 'No pending orders observed across the enumerated pools.' : 'No order details available; coverage is incomplete.'}</td></tr>}</tbody></table></div></section>
  </>;
}
export function Positions() {
  const account = useAccount();
  const [input, setInput] = useState('');
  const [validation, setValidation] = useState('');
  const [choice, setChoice] = useState('');
  const query = useAccountSnapshot(account.owner);
  function lookup(event: FormEvent) {
    event.preventDefault();
    if (!isAddress(input.trim())) { setValidation('Enter a valid 0x address, with a valid checksum if mixed-case.'); return; }
    setValidation(''); account.inspect(getAddress(input.trim()));
  }
  return <>
    <PageHeader eyebrow="POSITIONS" title="Understand your exposure." description="Positions and pending orders for your selected trading account." />
    <ReturnToCase />
    <details className="panel account-access technical-details"><summary>Inspect another address or manage wallet connection</summary><form onSubmit={lookup}><label htmlFor="account-address">Account to inspect</label><div className="input-actions"><input id="account-address" value={input} onChange={event => setInput(event.target.value)} placeholder="0x… account address" autoComplete="off" spellCheck={false} aria-describedby="account-help" /><button className="button primary" type="submit">Inspect address</button>{account.owner && <button className="button secondary" type="button" onClick={() => account.inspect(null)}>Clear lookup</button>}</div><p id="account-help">Use the actual dreamDEX trading account address. A login wallet and its app smart account can be different.</p>{validation && <p role="alert">{validation}</p>}</form>
      <div className="wallet-access"><label htmlFor="wallet-choice">Optional browser wallet</label><div className="input-actions"><select id="wallet-choice" value={choice || account.choices[0]?.id || ''} onChange={event => setChoice(event.target.value)}>{!account.choices.length && <option value="">No wallet detected</option>}{account.choices.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select><button className="button secondary" disabled={account.connecting || !account.choices.length} onClick={() => void account.connect(choice || account.choices[0]?.id || '')}>{account.connecting ? 'Waiting for wallet…' : 'Connect browser wallet'}</button>{(account.actor || account.connecting) && <button className="button secondary" onClick={account.disconnect}>Disconnect</button>}</div><p>Connection requests account access only. No signatures, transactions or network changes. Disconnect clears this app’s account data; revoke site permissions in your wallet if needed.</p>{account.walletError && <p role="alert">{account.walletError}</p>}</div>
    </details>
    {account.owner ? <><DataStatus observedAt={query.data?.observedAt} blockNumber={query.data?.blockNumber} error={query.error} fetching={query.isFetching} refresh={() => void query.refetch()} threshold={60000} />{query.data && <AccountDetails data={query.data} />}</> : <section className="panel feature-empty"><h2>No account selected</h2><p>Account data has not been requested. Enter an address above; this does not imply you have no positions.</p></section>}
  </>;
}
