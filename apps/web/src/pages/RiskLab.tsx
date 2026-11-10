import { useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { isAddress, getAddress } from 'viem';
import { useSearchParams } from 'react-router';
import { amount, calculateRisk, readError, riskEvidence, shockBps, type AccountSnapshot } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useAccountSnapshot } from '../app/queries';
import { PageHeader } from '../components/PageHeader';
import { ReturnToCase } from '../components/ExecutionJourney';
import { DataStatus } from '../components/DataStatus';
import { EvidenceDownload } from '../components/EvidenceDownload';

function RiskAmount({ value, decimals }: { value?: bigint | null; decimals: number }) {
  const exact = amount(value ?? undefined, decimals);
  const [whole, fraction = ''] = exact.split('.');
  const visible = fraction.length > 6 ? `${whole}.${fraction.slice(0, 6)}…` : exact;
  return <span className="risk-number" title={exact} aria-label={exact}>{visible}</span>;
}

function FrozenScenario({ snapshot }: { snapshot: AccountSnapshot }) {
  const [params] = useSearchParams();
  const requestedPool = params.get('pool')?.toLowerCase() ?? '';
  const [focusEdit, setFocus] = useState<string | null>(null);
  const focus = focusEdit ?? (snapshot.positions.some(row => row.pool.toLowerCase() === requestedPool) ? requestedPool : snapshot.positions.length === 1 ? snapshot.positions[0]!.pool.toLowerCase() : '');
  const [uniform, setUniform] = useState('0');
  const [custom, setCustom] = useState<Record<string, string>>({});
  let invalid = '';
  try { shockBps(uniform); for (const value of Object.values(custom)) if (value !== '') shockBps(value); }
  catch (caught) { invalid = readError(caught); }
  const query = useQuery({ queryKey: ['risk-scenario', snapshot.owner, snapshot.blockNumber.toString(), snapshot.observedAt, uniform, custom], enabled: !invalid,
    queryFn: () => calculateRisk(snapshot, shockBps(uniform), Object.fromEntries(Object.entries(custom).filter(([, value]) => value !== '').map(([pool, value]) => [pool, shockBps(value)]))), placeholderData: keepPreviousData, retry: false, staleTime: Infinity, gcTime: 0 });
  const report = query.data;
  const current = !invalid && !query.error && !query.isPlaceholderData && !query.isFetching;
  const q = (value?: bigint | null) => <RiskAmount value={value} decimals={snapshot.decimals} />;
  return <>
    <section className="panel risk-controls"><h2>Frozen scenario</h2><p>Block {snapshot.blockNumber.toString()} · {new Date(snapshot.observedAt).toLocaleString()} · {snapshot.owner}</p>
      <label>Uniform price shock · %<input value={uniform} inputMode="decimal" onChange={event => setUniform(event.target.value)} /></label>
      <div className="input-actions">{[-20, -10, 0, 10, 20].map(value => <button key={value} className="button secondary" onClick={() => { setUniform(String(value)); setCustom({}); }}>{value > 0 ? '+' : ''}{value}%</button>)}</div>
      <p>Per-market overrides below replace the uniform shock for that market. Blank means use the uniform shock.</p>
      <label>Focus one market<select value={focus} onChange={event => setFocus(event.target.value)}><option value="">Choose an observed position</option>{snapshot.positions.map(row => <option key={row.pool} value={row.pool.toLowerCase()}>{row.metadata.ok ? row.metadata.value.baseSymbol : row.pool}</option>)}</select></label>
      <div className="input-actions">{[-10, -5, 0, 5, 10].map(value => <button key={value} className="button secondary" disabled={!focus} onClick={() => { setUniform('0'); setCustom({ [focus]: String(value) }); }}>Focused {value > 0 ? '+' : ''}{value}%</button>)}</div>
      <p>{!focus ? 'Select a position above to enable focused presets. ' : ''}Focused presets change only the selected market; uniform presets change all markets. Both replace previous overrides and keep the baseline frozen.</p>
      {invalid && <p role="alert">{invalid}</p>}{query.error && <p role="alert">{readError(query.error)}</p>}
    </section>
    {report && <>
      {!current && <p className="data-warnings">Values below are from the last valid calculation, not the current edits. Fix inputs or wait for calculation. Export is disabled.</p>}
      <div className={`data-status ${report.reconciled ? '' : 'warning'}`}><div><strong>{report.reconciled ? 'Baseline reconciled exactly with on-chain health' : report.roundingCompatible ? 'Scenario estimate · minor baseline discrepancy' : 'Portfolio totals withheld · incomplete or mismatched baseline'}</strong>
        {report.roundingCompatible ? <p>SDK equity differs by {amount(report.difference!.equity, snapshot.decimals)} {snapshot.symbol}. Your baseline uses the contract balance; scenarios are estimates. All margin requirements match. The original difference stays in your export.</p> : <p>{report.coverageComplete ? 'All position inputs available.' : 'Unknown or unpriced positions are retained below.'} {report.ready ? 'No baseline adjustment.' : 'Refresh account data, then choose Use latest snapshot & reset scenarios. If this persists, download the evidence and report the mismatch; do not interpret blank totals as zero risk.'}</p>}
        {report.difference && <details><summary>Exact baseline comparison</summary><p>SDK minus contract, raw quote units: equity {report.difference.equity.toString()}; IM {report.difference.initialMargin.toString()}; MM {report.difference.maintenanceMargin.toString()}; CM {report.difference.closeOutMargin.toString()}. Frozen equity adjustment {report.equityAdjustment.toString()}. Exact reconciliation: {report.reconciled ? 'yes' : 'no'}.</p>{report.roundingCompatible && <p>The difference fits negative-PnL rounding, but its cause is not confirmed. Scenarios add the SDK price-change delta to chain equity. Floor/truncation comparison envelope: ±{amount(report.roundingEnvelopeRaw, snapshot.decimals)} {snapshot.symbol}; not a guarantee about future contract results.</p>}</details>}
      </div></div>
      <div className="live-metrics"><article><h3>Equity · baseline → scenario</h3><strong>{q(report.baseline?.equity)} → {q(report.scenario?.equity)}</strong><p>{snapshot.symbol} · shared collateral counted once</p></article><article><h3>Maintenance headroom</h3><strong>{q(report.baseline?.maintenanceHeadroom)} → {q(report.scenario?.maintenanceHeadroom)}</strong><p>{snapshot.symbol} · equity less maintenance requirement</p></article><article><h3>Gross / net notional · scenario</h3><strong>{q(report.scenario?.grossNotional)} / {q(report.scenario?.netNotional)}</strong><p>{snapshot.symbol} · signed net exposure</p></article><article><h3>Gross leverage · scenario</h3><strong>{report.scenario?.grossLeverageBps === null || report.scenario?.grossLeverageBps === undefined ? 'Undefined' : `${amount(report.scenario.grossLeverageBps, 4)}×`}</strong><p>Undefined for non-positive equity or incomplete coverage</p></article></div>
      <p className="coverage-note">Equity is modeled account value including open-position PnL and frozen funding. Maintenance headroom is the amount above the modeled maintenance requirement; it is not spendable cash. Concentration is each position’s share of gross notional, not a predicted loss. {report.rows.length === 0 ? 'This snapshot has no non-flat positions: price shocks have no open-position effect. Future fills of pending orders are not modeled.' : 'Compare positive and negative shocks to see which exposures drive account risk.'}</p>
      {report.scenario && report.scenario.maintenanceHeadroom < 0n && <p className="data-warnings">Scenario equity falls below its modeled maintenance requirement. This is a scenario result, not a forecast of liquidation timing or price.</p>}
      <section className="panel"><div className="table-scroll"><table className="risk-table"><thead><tr><th>Market / override</th><th>Position</th><th>Mark → shocked mark</th><th>Price PnL → scenario</th><th>Frozen accrued funding</th><th>MM → scenario</th><th>Gross concentration</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.pool}><td><strong>{row.symbol}</strong><code className="address-line">{row.pool}</code><label className="sr-only" htmlFor={`shock-${row.pool}`}>Shock for {row.symbol} · {row.pool}</label><input id={`shock-${row.pool}`} aria-label={`Shock for ${row.symbol}`} value={custom[row.pool.toLowerCase()] ?? ''} placeholder="Uniform %" onChange={event => setCustom(current => ({ ...current, [row.pool.toLowerCase()]: event.target.value }))} /></td>
        {row.known ? <><td>{amount(row.baseline.size, row.baseDecimals)}</td><td>{q(row.basePrice)} → {q(row.scenarioPrice)}</td><td>{q(row.baseline.unrealizedPnl)} → {q(row.scenario.unrealizedPnl)}</td><td>{q(row.baseline.accruedFunding)}</td><td>{q(row.baseline.maintenanceMarginRequirement)} → {q(row.scenario.maintenanceMarginRequirement)}</td><td>{row.concentrationBps === null ? 'Unavailable' : `${amount(row.concentrationBps, 2)}%`}</td></> : <td colSpan={6}>{row.reason} No zero value is substituted.</td>}</tr>)}{!report.rows.length && <tr><td colSpan={7}>No non-flat positions in this snapshot. Margin balances and coverage are still checked.</td></tr>}</tbody></table></div></section>
      <details className="panel risk-assumptions technical-details"><summary>Scenario assumptions and coverage</summary><p>{report.orderCount} pending identifiers observed; order coverage {report.orderCoverageComplete ? 'complete within the account reader bounds' : 'partial'}. Orders remain frozen and unfilled in every scenario. An override never places a trade.</p><ul>{report.assumptions.map(item => <li key={item}>{item}</li>)}</ul></details>
      {current && <EvidenceDownload value={riskEvidence(report)} name="risk-scenario" />}
    </>}
  </>;
}
export function RiskLab() {
  const account = useAccount();
  const snapshot = useAccountSnapshot(account.owner);
  const [input, setInput] = useState(''), [error, setError] = useState('');
  const [frozen, setFrozen] = useState<AccountSnapshot | null>(null);
  const [version, setVersion] = useState(0);
  function lookup(event: FormEvent) { event.preventDefault(); if (!isAddress(input)) { setError('Enter a valid account address.'); return; } setError(''); setFrozen(null); account.inspect(getAddress(input)); }
  const selected = frozen?.owner.toLowerCase() === account.owner?.toLowerCase() ? frozen : null;
  // Capture once per selected account; background reads never move the active baseline.
  if (!selected && snapshot.data && !snapshot.error && snapshot.data.owner.toLowerCase() === account.owner?.toLowerCase()) setFrozen(snapshot.data);
  return <><PageHeader eyebrow="RISK LAB" title="Explore the what-ifs." description="Compare hypothetical prices against one verified account snapshot. No wallet or signature required." />
    <ReturnToCase />
    <form className="panel account-access" onSubmit={lookup}><label htmlFor="risk-owner">Account to analyze</label><div className="input-actions"><input id="risk-owner" value={input} onChange={event => setInput(event.target.value)} placeholder={account.owner ?? '0x… account address'} /><button className="button secondary">Inspect risk account</button></div>{error && <p role="alert">{error}</p>}</form>
    {account.owner ? <><DataStatus observedAt={snapshot.data?.observedAt} blockNumber={snapshot.data?.blockNumber} error={snapshot.error} fetching={snapshot.isFetching} refresh={() => void snapshot.refetch()} threshold={60000} />
      <button className="button secondary" disabled={!snapshot.data || !!snapshot.error || snapshot.isFetching} onClick={() => { setFrozen(snapshot.data!); setVersion(value => value + 1); }}>{selected ? 'Use latest snapshot & reset scenarios' : 'Freeze snapshot & analyze'}</button>
      {selected ? <><p className="coverage-note">Baseline prepared automatically and frozen for this account. Refresh then reset to use a newer snapshot. Higher prices improve a long's price PnL and worsen a short's; lower prices do the reverse, with other inputs frozen. No trade is placed. {snapshot.error ? 'Live refresh failed; this baseline remains a previous observation.' : ''}</p><FrozenScenario key={`${selected.owner}:${selected.blockNumber}:${version}`} snapshot={selected} /></> : <p className="coverage-note">Loading the selected account to prepare its baseline. Missing or failed data is not zero exposure.</p>}</> : <section className="panel feature-empty"><h2>Select an account snapshot</h2><p>Enter a public trading address above or select one in Positions. Missing data is never treated as a zero balance.</p></section>}
  </>;
}
