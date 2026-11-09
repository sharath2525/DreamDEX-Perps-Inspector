import { sameAddress } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useTradingAccounts } from '../app/queries';

/** Indexed accounts are suggestions, never proof of permission to trade. */
export function TradingAccountChoices() {
  const account = useAccount();
  const discovery = useTradingAccounts(account.actor);
  if (!account.actor) return null;
  return <section className="trading-account-choices" aria-label="Discovered trading accounts">
    <h3>Your trading accounts</h3>
    <p role="status">{discovery.isFetching ? 'Looking for indexed accounts…' : discovery.error ? 'Account discovery unavailable. Retry or enter an address manually.' : discovery.data?.candidates.length ? 'Choose an indexed account. Trading permissions are checked separately.' : 'No indexed accounts returned. A linked bot account may still exist.'}</p>
    <div className="account-candidate-list">{discovery.data?.candidates.map(candidate => <button type="button" className="button secondary address-line" key={candidate.address} aria-pressed={!!account.owner && !account.viewOnly && sameAddress(account.owner, candidate.address)} onClick={() => account.selectTrading(candidate.address)}>
      <span>{candidate.address}</span><small>{!!account.owner && !account.viewOnly && sameAddress(account.owner, candidate.address) ? 'Selected' : 'Use account'}</small>
    </button>)}</div>
    <p className="coverage-note">Owner and derived accounts are discovered automatically. Missing bot-linked accounts need their public address once; your selection is remembered on this browser.</p>
    {!!discovery.data?.warnings.length && <p role="status">Discovery is incomplete; some account sources could not be read.</p>}
    {discovery.data?.truncated && <p>Showing 50 accounts. Enter another address manually.</p>}
    <button type="button" className="button secondary" disabled={discovery.isFetching} onClick={() => void discovery.refetch()}>Refresh accounts</button>
  </section>;
}
