import { ArrowDownLeft, ArrowUpRight, Layers3, ShieldCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { Amount } from '../components/Amount';
import { useAccount } from '../app/account-context';
import { useAccountSnapshot } from '../app/queries';
import { DataStatus } from '../components/DataStatus';
import { LocalActivity } from '../components/LocalActivity';
import { amount } from '@pei/perps-adapter';

const metrics = [
  { label: 'Account equity', detail: 'An account has not been connected', icon: Wallet, unit: 'USDso' },
  { label: 'Unlocked collateral', detail: 'Perps margin has not been loaded', icon: Layers3, unit: 'USDso' },
  { label: 'Maintenance headroom', detail: 'Requires a verified account snapshot', icon: ShieldCheck, unit: 'USDso' },
];

export function Overview() {
  const { owner } = useAccount();
  const query = useAccountSnapshot(owner);
  const snapshot = query.data;
  const health = snapshot?.health.ok ? snapshot.health.value : undefined;
  const values = [health?.[0], snapshot?.state.unlockedCollateralBalance, health ? health[0] - health[2] : undefined];
  return <>
    <PageHeader eyebrow="YOUR WORKSPACE" title="Account overview" description="Check an order before signing. After it lands, trace the receipt, fills and changes to your position." action={<Link to={owner ? '/trade' : '/markets'} className="button primary">{owner ? 'Review an order' : 'Explore markets'}<ArrowUpRight size={16} aria-hidden="true" /></Link>} />
    {owner && <DataStatus observedAt={snapshot?.observedAt} blockNumber={snapshot?.blockNumber} error={query.error} fetching={query.isFetching} refresh={() => void query.refetch()} threshold={60000} />}
    <section className="metric-grid" aria-label="Account summary">
      {metrics.map(({ label, detail, icon: Icon, unit }, index) => <article className="metric-card" key={label}>
        <div className="metric-top"><h2>{label}</h2><Icon size={17} aria-hidden="true" /></div>
        <div className="metric-value"><span aria-label={values[index] === undefined ? 'Not available' : undefined}><Amount value={values[index]} decimals={snapshot?.decimals} /></span><span>{snapshot?.symbol ?? unit}</span></div>
        <p><span className="status-dot" />{owner ? snapshot ? `Inspected ${owner.slice(0, 6)}…${owner.slice(-4)} · block ${snapshot.blockNumber}` : query.isFetching ? 'Loading account snapshot' : 'Account snapshot unavailable — refresh to retry' : detail}</p>
      </article>)}
    </section>
    {snapshot && <p className="coverage-note">{snapshot.orderCount} pending order identifiers · position coverage {snapshot.positionCoverageComplete ? 'complete' : 'partial'} · order coverage {snapshot.orderCoverageComplete ? 'complete within scan bounds' : 'partial'}. Unlocked collateral is bank margin, not wallet gas or necessarily withdrawable funds. {query.error ? 'Values are a previous observation; refresh failed.' : ''} <Link to="/positions/risk">Analyze this account in Risk Lab</Link>.</p>}
    <div className="overview-grid">
      <section className="panel execution-panel" aria-labelledby="execution-heading">
        <div className="panel-heading"><div><span className="section-number">01</span><h2 id="execution-heading">Execution activity</h2></div><span className="subtle-badge">LOCAL JOURNAL</span></div>
        <LocalActivity limit={5} />
      </section>
      <section className="panel workflow-panel" aria-labelledby="workflow-heading"><div className="panel-heading"><h2 id="workflow-heading">Quick actions</h2></div>
        <nav className="quick-actions" aria-label="Trading shortcuts">
          <Link to="/trade"><strong>Review an order</strong><span>Check price, size, margin and permissions.</span></Link>
          <Link to="/executions"><strong>Inspect execution</strong><span>Verify a transaction and export its evidence.</span></Link>
          <Link to="/positions/risk"><strong>Explore account risk</strong><span>Compare price scenarios against your positions.</span></Link>
        </nav>
      </section>
    </div>
    <section className="panel positions-preview" aria-labelledby="positions-heading"><div className="panel-heading"><div><span className="section-number">02</span><h2 id="positions-heading">Positions at a glance</h2></div><Link to="/positions" className="text-link">View positions<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <div className="table-scroll"><table><thead><tr><th>Market</th><th>Direction</th><th>Size</th><th>Entry price</th><th>Unrealized PnL</th><th>Pricing status</th></tr></thead><tbody>{snapshot?.positions.map(row => <tr key={row.pool}>
<td><Link to="/positions">{row.metadata.ok ? row.metadata.value.baseSymbol : 'Unknown market'}</Link></td>
<td>{row.position.ok ? row.position.value.size < 0n ? 'Short' : row.position.value.size > 0n ? 'Long' : 'Flat' : 'Unavailable'}</td>
<td>{row.position.ok ? row.metadata.ok ? amount(row.position.value.size < 0n ? -row.position.value.size : row.position.value.size, row.metadata.value.baseDecimals) : row.position.value.size.toString() + ' raw' : '—'}</td>
<td><Amount value={row.position.ok ? row.position.value.avgEntryPrice : undefined} decimals={snapshot.decimals} /></td>
<td><Amount value={row.analytics.ok ? row.analytics.value.metrics.unrealizedPnl : undefined} decimals={snapshot.decimals} /></td>
<td>{row.analytics.ok ? 'Priceable' : 'Unpriced / partial'}</td></tr>)}
{!snapshot?.positions.length && <tr><td colSpan={6}><div className="table-empty"><ArrowDownLeft size={20} aria-hidden="true" /><div><strong>{snapshot ? snapshot.positionCoverageComplete ? 'No non-flat positions observed for this account.' : 'Position coverage incomplete; exposure is unknown.' : owner ? query.isFetching ? 'Loading positions for this account…' : 'Position data unavailable — exposure is unknown.' : 'Select your trading account above'}</strong><p>Resting orders are separate from filled positions. <Link to="/positions">Inspect positions and pending orders</Link>.</p></div></div></td></tr>}</tbody></table></div>
    </section>
  </>;
}
