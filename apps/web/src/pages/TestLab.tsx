import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { runReadDiagnostics, type CheckStatus } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { AccountLookup } from '../components/AccountLookup';
import { PageHeader } from '../components/PageHeader';
import { EvidenceDownload } from '../components/EvidenceDownload';
import { GuidedTests } from '../components/GuidedTests';
import { EvidenceCheckpoints } from '../components/EvidenceCheckpoints';
export function TestLab() {
  const { owner } = useAccount(); const controller = useRef<AbortController | null>(null);
  const [report, setReport] = useState<Awaited<ReturnType<typeof runReadDiagnostics>> | null>(null);
  const [runState, setRunState] = useState({ owner, running: false, message: '' });
  const running = runState.owner === owner && runState.running;
  const message = runState.owner === owner ? runState.message : '';
  const [optIn, setOptIn] = useState(false);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, [owner]);
  async function run() { const request = new AbortController(); controller.current?.abort(); controller.current = request; setRunState({ owner, running: true, message: '' }); setReport(null);
    try { const result = await runReadDiagnostics(owner, AbortSignal.any([request.signal, AbortSignal.timeout(120_000)])); if (!request.signal.aborted) setReport(result); }
    catch { if (controller.current === request) setRunState({ owner, running: false, message: 'Run cancelled or timed out. No success is inferred; rerun explicitly.' }); }
    finally { if (controller.current === request) setRunState(current => ({ ...current, running: false })); }
  }
  const selected = report?.owner === owner ? report : null;
  return <><PageHeader eyebrow="DEVELOPER TEST LAB" title="Verify the integration." description="Run bounded read-only checks and export reproducible observations. A failed check is not automatically a protocol bug." /><AccountLookup />
    <section className="panel risk-controls"><h2>Read-only suite</h2><p>Checks deployment identity, account reconstruction and one page from each history source. Maximum duration: two minutes. No wallet access, signing or retries of trades.</p><div className="input-actions"><button className="button primary" disabled={running} onClick={() => void run()}>Run read-only diagnostics</button><button className="button secondary" disabled={!running} onClick={() => controller.current?.abort()}>Cancel run</button></div>{running && <p role="status">Checks running…</p>}{message && <p role="status">{message}</p>}</section>
    {selected && <><section className="panel"><h2>Run observations</h2><p>{new Date(selected.startedAt).toLocaleString()} · SDK {selected.sdkVersion} · chain {selected.chainId}</p><div className="table-scroll"><table><thead><tr><th>Check / status</th><th>Expected</th><th>Actual / source</th></tr></thead><tbody>{selected.checks.map(check => <tr key={check.name}><td><strong>{check.name}</strong><p>{check.status satisfies CheckStatus}</p></td><td>{check.expected}</td><td>{check.actual}<p>{check.source}</p></td></tr>)}</tbody></table></div></section><EvidenceDownload value={selected} name="diagnostic-run" /></>}
    <section className="panel risk-controls"><h2>Controlled transaction cases</h2><p>Each case uses your own funded testnet account and the Trade page's exact notional, price, expiry and gas review. Nothing runs as a batch. A mined receipt does not imply that every requested business action succeeded.</p><label className="confirm-check"><input type="checkbox" checked={optIn} onChange={event => setOptIn(event.target.checked)} /> Show manual cases that require separate wallet confirmations</label>
      {optIn && <ol><li><strong>Expected preflight rejection:</strong> enter an invalid tick/lot amount. Expected: validation rejects before any wallet request. Record it as unbroadcast.</li><li><strong>Small resting order:</strong> review a permitted market, exact size and gas budget. Expected: inspect the actual receipt and any resting remainder; a fill is possible and must be recorded.</li><li><strong>Cancel remainder:</strong> select an owned resting order in Execution Inspector. Expected: explicit review, separate signature, actual cancellation receipt and final open-order state.</li><li><strong>Exposure check:</strong> refresh Positions and export execution evidence. Cancellation does not close an existing position.</li></ol>}
      {optIn && <div className="input-actions"><Link className="button secondary" to="/trade">Open controlled order composer</Link><Link className="button secondary" to="/executions">Inspect actual attempts</Link><Link className="button secondary" to="/positions">Check residual exposure</Link></div>}
      <p>Security-sensitive findings stay private. Expected voucher, isolation, liquidity or permission restrictions are not vulnerabilities. Reports need reproduction and organizer acceptance before any bounty claim.</p>
    </section>
    <EvidenceCheckpoints />
    <GuidedTests />
  </>;
}
