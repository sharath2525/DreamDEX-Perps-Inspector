import { amount, sameAddress, type TradingAccountCandidate } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useAccountSnapshot, useTradingAccounts } from '../app/queries';

function Candidate({ candidate, workspace }: { candidate: TradingAccountCandidate; workspace: boolean }) {
  const account = useAccount();
  const selected = !!account.owner && sameAddress(account.owner, candidate.address);
  const snapshot = useAccountSnapshot(selected ? candidate.address : null);
  const status = candidate.verification === 'linked' ? 'Linked permission observed' : candidate.verification === 'not-authorized' ? 'No permission in checked markets' : candidate.verification === 'unavailable' ? 'Permission unavailable' : 'Indexed account · permission unverified';
  return <article className={`account-choice-card${selected ? ' selected' : ''}`}>
    <span className="account-choice-status">{status}</span>
    <button type="button" className="button secondary address-line choose-account" aria-pressed={selected && !account.viewOnly} onClick={() => account.selectTrading(candidate.address)}>
      {workspace ? `Use ${candidate.address}` : <><span>{candidate.address}</span><small>{selected && !account.viewOnly ? 'Selected' : 'Use account'}</small></>}
    </button>
    <dl className="account-choice-metrics"><div><dt>Unlocked margin</dt><dd>{candidate.margin ? `${amount(candidate.margin.unlocked, candidate.margin.decimals)} USDso` : 'Unavailable'}</dd></div><div><dt>Locked margin</dt><dd>{candidate.margin ? `${amount(candidate.margin.locked, candidate.margin.decimals)} USDso` : 'Unavailable'}</dd></div></dl>
    {selected && <p>{snapshot.error ? 'Position and order reads unavailable.' : !snapshot.data ? 'Reading current exposure…' : `${snapshot.data.positions.filter(row => row.position.ok && row.position.value.size !== 0n).length} observed positions · ${snapshot.data.orderCount} observed order IDs. Check Positions for coverage and details.`}</p>}
    {candidate.permissionPool && <p>Permission observed in at least one market. The selected market is checked separately before trading.</p>}
    {candidate.warning && <p role="status">{candidate.warning}</p>}
    <small>{candidate.sources.join(' + ')} · block {candidate.block?.toString() ?? 'unknown'}</small>
    <button type="button" className="text-button" onClick={() => account.inspect(candidate.address)}>Inspect only</button>
  </article>;
}

/** Indexed accounts are suggestions, never proof of permission to trade. */
export function TradingAccountChoices({ workspace = false }: { workspace?: boolean }) {
  const account = useAccount();
  const discovery = useTradingAccounts(account.actor);
  if (!account.actor) return null;
  return <section className="trading-account-choices" aria-label="Discovered trading accounts">
    <h3>Your trading accounts</h3>
    <p role="status">{discovery.isFetching ? 'Looking for owned and linked accounts…' : discovery.error ? 'Account discovery unavailable. Retry or enter an address manually.' : discovery.data?.candidates.length ? 'Accounts found. Choose the account you intend to use; no order is sent.' : 'No indexed accounts returned. This does not prove that no trading account exists.'}</p>
    {!discovery.isFetching && !discovery.error && <div className="account-candidate-list">{discovery.data?.candidates.map(candidate => <Candidate key={candidate.address} candidate={candidate} workspace={workspace} />)}</div>}
    <p className="coverage-note">Finds owned, derived and indexed linked accounts. Missing accounts can still be entered once and remembered in this browser.</p>
    {!!discovery.data?.warnings.length && <details><summary>Discovery is incomplete</summary>{discovery.data.warnings.map(warning => <p key={warning}>{warning}</p>)}</details>}
    {discovery.data?.truncated && <p>Discovery reached its limit. Additional accounts may exist.</p>}
    <button type="button" className="button secondary" disabled={discovery.isFetching} onClick={() => void discovery.refetch()}>Refresh accounts</button>
  </section>;
}
