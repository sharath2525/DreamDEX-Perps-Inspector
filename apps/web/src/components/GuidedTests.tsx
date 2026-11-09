import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PERPS_CONFIG, type AccountSnapshot } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { EvidenceDownload } from './EvidenceDownload';
import { issueKinds, parseTestImport, sameNote, testStatuses, type TestNote, type TestNotes, type TestStatus } from '../app/manual-test-store';
import { useTestNotes } from '../app/use-test-notes';

const guidedScenarios = [
  { id: 'U01', title: 'Select the funded account', path: '/positions', steps: ['Connect your signing wallet above.', 'Expand Set up or change account. Choose a candidate, or paste the dreamDEX app wallet address once.', 'Click Use trading account. Compare the two full addresses.', 'Expand linked permissions and choose your market.'], expected: 'Signer pays gas; trading account holds margin and positions. Discovery and saved addresses do not grant permission.' },
  { id: 'U02', title: 'Navigation and reload', path: '/', steps: ['Complete U01.', 'Visit Overview, Positions, Risk Lab, Trade, Account operations and History.', 'Check the selected account on every page.', 'Reload, then reconnect the same wallet.'], expected: 'The saved selection returns. Reload starts read-only until connection. No automatic signing or resend.' },
  { id: 'U03', title: 'Balances, positions and orders', path: '/positions', steps: ['Select your funded account and refresh Positions.', 'Record block, unlocked collateral, equity and voucher floor separately.', 'Record direction and size from Current positions.', 'Record Pending orders separately and compare Overview at its block.'], expected: 'Actual position rows appear in both views. Gas is not collateral. No pending orders does not mean no positions.' },
  { id: 'U04', title: 'Risk baseline and shocks', path: '/positions/risk', steps: ['Open Risk Lab and wait for automatic baseline reconciliation.', 'Select 0% and compare baseline with scenario.', 'Leave overrides blank. Select +10%, then -10%, then 0%.', 'Download evidence at the same frozen block.'], expected: 'For a lone short, higher prices worsen price PnL and lower prices improve it. Long exposure reverses this. No orders are placed.' },
  { id: 'U05', title: 'Invalid risk input and reset', path: '/positions/risk', steps: ['Enter non-numeric text in Uniform price shock.', 'Check validation and disabled export.', 'Restore 0 and wait for the result.', 'Refresh the snapshot, then click Use latest snapshot & reset scenarios.'], expected: 'Invalid edits cannot export stale values as current. Only explicit reset replaces the frozen baseline.' },
  { id: 'U06', title: 'Public lookup and safe return', path: '/positions', steps: ['Connect and select a trading account.', 'Use Account to inspect for a different public address.', 'Open Trade and read why execution is blocked.', 'Click Return to trading account.'], expected: 'Wallet stays connected. Inspection is read-only. Returning invalidates old reviews and restores the trading account.' },
  { id: 'U07', title: 'Network and signer changes', path: '/trade', steps: ['Prepare a checked order without signing.', 'Change wallet network and read the blocked reason.', 'Return to 50383 and resume the trading account.', 'Change wallet account and inspect the selection and old review.'], expected: 'Old reviews cannot be signed. Exact network/account reasons appear. No automatic transactions.' },
  { id: 'U08', title: 'Check an order without signing', path: '/trade', steps: ['Select the correct account and market.', 'Read current tick, lot and minimum rules. Enter a small valid quantity.', 'Inspect current book. For post-only, choose a tick-aligned non-crossing limit; set expiry and gas budget.', 'Run the no-signature check and review the exact account, call and costs.', 'Edit quantity and confirm the review becomes invalid.'], expected: 'Checks do not sign. Invalid precision, permission, margin and gas produce actionable errors. Simulation is not fill proof.' },
  { id: 'U09', title: 'Reject a wallet request', path: '/trade', signing: true, steps: ['Create a fresh valid U08 review.', 'Authorize the displayed operation and open the wallet.', 'Reject in the wallet.', 'Inspect local activity.'], expected: 'Rejected status; no fabricated hash or on-chain failure. No automatic retry.' },
  { id: 'U10', title: 'One real testnet order', path: '/trade', signing: true, steps: ['Create a fresh valid U08 review and deliberately accept the test size.', 'Review the exact wallet transaction and confirm.', 'Save the returned hash; do not resend an uncertain outcome.', 'Verify the receipt in Execution Inspector or the linked operation journal.', 'Record order ID and fills; refresh orders and positions.'], expected: 'Submitted, mined, resting and filled remain distinct. Post-only can fill later. Evidence agrees with actual chain state.' },
  { id: 'U11', title: 'Cancel a resting remainder', path: '/positions/manage', signing: true, steps: ['Find an actual remaining order; skip if none exists.', 'Use operator cancellation for a linked account or direct cancellation in its execution record.', 'Select the actual pool/order ID and run a fresh check.', 'Review and confirm cancellation, then verify its receipt.', 'Refresh orders and positions separately.'], expected: 'Cancellation removes the remainder, not an already-filled position. Report fill/cancel races from evidence.' },
  { id: 'U12', title: 'Recovery, history and diagnostics', path: '/history', steps: ['Save hashes and export execution evidence.', 'Reload and select the same account.', 'Compare local activity with indexed history; recover a known hash if necessary.', 'Run the read-only suite in Developer Test Lab.', 'Record errors, blocks and screenshots in your report.'], expected: 'Journals survive. External trades are not labeled PEI attempts. RPC/indexer failures stay explicit.' },
] as const;

export function GuidedTests() {
  const account = useAccount();
  return <GuidedTestRun key={`${account.owner}:${account.actor}`} />;
}
function GuidedTestRun() {
  const account = useAccount();
  const scope = { owner: account.owner, signer: account.actor };
  const store = useTestNotes(scope);
  const { results } = store;
  const queryClient = useQueryClient();
  const [incoming, setIncoming] = useState<TestNotes | null>(store.migrationPending ? store.initial.legacy : null);
  const [choices, setChoices] = useState<Record<string, 'keep' | 'import'>>({});
  const [importError, setImportError] = useState('');
  const [clearConfirmed, setClearConfirmed] = useState(false);
  const reading = useRef(0);
  const [filter, setFilter] = useState('all');
  const marked = guidedScenarios.filter(test => results[test.id] && results[test.id]?.status !== 'NOT RUN').length;
  const needsAttention = (id: string) => ['FAIL', 'BLOCKED'].includes(results[id]?.status ?? '');
  const attention = guidedScenarios.filter(test => needsAttention(test.id)).length;
  const visibleCases = guidedScenarios.filter(test => filter === 'all' || (filter === 'attention' ? needsAttention(test.id) : !!results[test.id]?.notes));
  function update(id: string, patch: Partial<TestNote>) {
    store.setResults(current => ({ ...current, [id]: { status: 'NOT RUN', notes: '', ...current[id], ...patch, updatedAt: Date.now() } }));
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    const request = ++reading.current;
    setImportError('');
    try {
      if (file.size > 250000) throw new Error('Report exceeds the 250 KB import limit.');
      const parsed = parseTestImport(await file.text(), scope);
      if (request !== reading.current) return;
      setIncoming(parsed); setChoices({});
    } catch (error) { if (request === reading.current) setImportError(error instanceof Error ? error.message : 'Unable to read this report.'); }
  }
  function applyMerge() {
    if (!incoming) return;
    const next = { ...results };
    for (const [id, row] of Object.entries(incoming)) if (!results[id] || choices[id] === 'import') next[id] = row;
    store.merge(next); setIncoming(null); setChoices({});
  }
  function capture(id: string) {
    const snapshot = queryClient.getQueriesData<AccountSnapshot>({ queryKey: ['account'] }).map(([, value]) => value).find(value => value?.owner.toLowerCase() === account.owner?.toLowerCase());
    update(id, { environment: { capturedAt: new Date().toISOString(), sdkVersion: PERPS_CONFIG.sdkVersion, chainId: PERPS_CONFIG.chainId, walletChainId: account.chainId, browser: navigator.userAgent.slice(0, 300), route: location.pathname.slice(0, 200), ...(snapshot ? { block: snapshot.blockNumber.toString(), observedAt: snapshot.observedAt } : {}) } });
  }
  return <section className="panel guided-tests" id="guided-tests"><h2>Guided tests · one scenario at a time</h2><p>Start with U01–U05. Existing positions are enough for read-only tests. U09–U11 involve wallet interaction. Results are manual observations, not certified passes. Notes are saved for this signer and account on this browser/device; export before changing browsers or clearing site data. Never enter secrets.</p>
    <p className="note-save-status" role={store.blocked ? 'alert' : 'status'}>{store.message}</p>
    <div className="report-tools"><label>Import guided-tests JSON<input type="file" accept="application/json,.json" disabled={store.migrationPending} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} /></label><p>Imports are previewed before merging. Current notes win conflicts unless you choose the incoming version. Old tab notes and all trading journals remain untouched during migration.</p></div>
    {importError && <p role="alert">{importError}</p>}
    {incoming && <section className="merge-preview" aria-label="Review note merge"><h3>{store.migrationPending ? 'Review earlier tab notes' : 'Review imported report'}</h3><p>Review each difference. Applying this merge does not verify a test or a transaction.</p>
      {Object.entries(incoming).map(([id, row]) => <div className="merge-row" key={id}><strong>{id}</strong>{results[id] && !sameNote(results[id]!, row) ? <><div className="merge-versions"><p>Current · {results[id]!.status}<br />{results[id]!.notes || 'No notes'}<br />{results[id]!.category ?? 'Unclassified'} · {results[id]!.environment?.capturedAt ?? 'No captured environment'}</p><p>Incoming · {row.status}<br />{row.notes || 'No notes'}<br />{row.category ?? 'Unclassified'} · {row.environment?.capturedAt ?? 'No captured environment'}</p></div><label>Resolution for {id}<select value={choices[id] ?? 'keep'} onChange={event => setChoices(current => ({ ...current, [id]: event.target.value as 'keep' | 'import' }))}><option value="keep">Keep current note</option><option value="import">Use incoming note</option></select></label></> : <p>{results[id] ? 'Same observation — retained.' : `${row.status} — added to this account's notes.`}</p>}</div>)}
      <div className="input-actions"><button className="button primary" onClick={applyMerge}>Apply reviewed merge</button>{!store.migrationPending && <button className="button secondary" onClick={() => setIncoming(null)}>Cancel import</button>}</div>
    </section>}
    <div className="test-progress"><output>{marked} of {guidedScenarios.length} marked · {attention} failed or blocked</output><label>Show scenarios<select aria-label="Show scenarios" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All scenarios</option><option value="attention">Failed or blocked</option><option value="notes">With notes</option></select></label></div>
    {!visibleCases.length && <p>No scenarios match this filter for the selected account.</p>}
    {visibleCases.map(test => <details key={test.id}><summary>{test.id} · {test.title}{'signing' in test ? ' · wallet interaction' : ''}{results[test.id]?.status && results[test.id]?.status !== 'NOT RUN' && <span className="test-case-status" data-status={results[test.id]?.status}>{results[test.id]?.status}</span>}</summary>
      <p><strong>Before you start:</strong> {test.id === 'U01' ? 'Have your public signing and trading addresses ready. No funds or signature are needed to inspect.' : test.id === 'U11' ? 'An actual resting remainder is required. Skip this case if none exists.' : 'signing' in test ? 'Complete U08 with fresh valid terms. Check U10 notes and existing journal hashes before creating another order. You alone approve wallet requests.' : 'Select the intended account in U01. Read-only scenarios need no new trade.'}</p>
      <ol>{test.steps.map(step => <li key={step}>{step}</li>)}</ol><p><strong>Expected:</strong> {test.expected}</p><p><strong>Save as evidence:</strong> Exact inputs, expected versus actual, error text, screenshot filename, account and block. For a broadcast transaction include its real hash and receipt export; otherwise write “no transaction”. Captured environment describes the capture time, not proof of when the test ran.</p><Link className="text-link" to={test.path}>Open this workspace</Link>
      <label>Result for {test.id}<select aria-label={`Result for ${test.id}`} value={results[test.id]?.status ?? 'NOT RUN'} onChange={event => update(test.id, { status: event.target.value as TestStatus })}>{testStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
      <label>Issue category for {test.id}<select value={results[test.id]?.category ?? 'Unclassified'} onChange={event => update(test.id, { category: event.target.value as typeof issueKinds[number] })}>{issueKinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>
      <label>Observations for {test.id}<textarea value={results[test.id]?.notes ?? ''} placeholder="Exact inputs; expected vs actual; block; error; hash or none; screenshot filenames. No secrets." maxLength={5000} onChange={event => update(test.id, { notes: event.target.value })} /></label>
      <button className="button secondary" onClick={() => capture(test.id)}>Capture environment for {test.id}</button>{results[test.id]?.environment && <p>Captured {results[test.id]!.environment!.capturedAt} · SDK {results[test.id]!.environment!.sdkVersion} · wallet chain {results[test.id]!.environment!.walletChainId ?? 'not connected'} · snapshot block {results[test.id]!.environment!.block ?? 'not cached; no block claimed'}.</p>}
    </details>)}
    <EvidenceDownload name="manual-test-results" value={{ schema: 'pei-manual-tests-v1', chainId: PERPS_CONFIG.chainId, owner: account.owner, signer: account.actor, sdkVersion: PERPS_CONFIG.sdkVersion, evidenceType: 'user-recorded observations; not independently verified', exportedAt: new Date().toISOString(), cases: guidedScenarios.map(test => { const row = results[test.id]; return { id: test.id, title: test.title, status: row?.status ?? 'NOT RUN', observations: row?.notes ?? '', ...(row?.category ? { category: row.category } : {}), ...(row?.updatedAt ? { updatedAt: row.updatedAt } : {}), ...(row?.environment ? { environment: row.environment } : {}) }; }) }} />
    <div className="clear-test-notes"><label><input type="checkbox" checked={clearConfirmed} onChange={event => setClearConfirmed(event.target.checked)} /> I have exported any notes I need. Clear only this signer/account's test notes.</label><button className="button secondary" disabled={!clearConfirmed} onClick={() => { setClearConfirmed(false); void store.clear().then(cleared => { if (cleared) setIncoming(null); }); }}>Clear these test notes</button><p>Execution journals, operation journals, saved account selections and other accounts' notes are preserved.</p></div>
  </section>;
}
