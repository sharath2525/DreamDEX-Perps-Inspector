import { useState, type FormEvent, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { amount, OFFICIAL_LINKS, PERPS_CONFIG, readError, readPermissions, readSignerGas, sameAddress } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { publicAddress } from '../app/account-selection';
import { useMarkets, useTradingAccounts } from '../app/queries';
import { CopyAddress } from './CopyAddress';
import { TradingAccountChoices } from './TradingAccountChoices';

export function AccountWorkspace({ setupRef }: { setupRef: RefObject<HTMLDetailsElement | null> }) {
  const { pathname } = useLocation();
  const account = useAccount();
  const [input, setInput] = useState(''), [error, setError] = useState(''), [wallet, setWallet] = useState(''), [market, setMarket] = useState('');
  const markets = useMarkets(!!account.actor && !!account.owner && !sameAddress(account.actor, account.owner) && !account.viewOnly);
  const pool = markets.data?.rows.find(row => row.pool === market)?.pool ?? markets.data?.rows[0]?.pool;
  const discovery = useTradingAccounts(account.actor);
  const gas = useQuery({ queryKey: ['signer-gas', account.actor], enabled: !!account.actor,
    queryFn: ({ signal }) => readSignerGas(account.actor!, signal), retry: false, staleTime: 15000, refetchInterval: 30000, refetchOnWindowFocus: false });
  const delegated = !!account.actor && !!account.owner && !sameAddress(account.actor, account.owner);
  const permission = useQuery({ queryKey: ['account-permission', account.actor, account.owner, pool, account.identityVersion],
    enabled: delegated && !!pool && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId,
    queryFn: ({ signal }) => readPermissions(account.owner!, account.actor!, pool!, signal), retry: false, staleTime: 15000, refetchInterval: 30000, refetchOnWindowFocus: false });
  const status = !account.actor ? account.owner ? 'Public account · read-only.' : 'Connect a signing wallet, or inspect a public address below.'
    : account.viewOnly ? 'Read-only inspection. Wallet stays connected; sending is disabled until you return to the trading account.'
    : account.chainId !== PERPS_CONFIG.chainId ? `Wrong wallet network (${account.chainId ?? 'unknown'}). Switch to Somnia testnet 50383.`
    : !account.signingSession() ? 'Wallet identity or network changed. Resume the trading account to prepare a new review.'
    : !account.owner ? 'Select a trading account.'
    : delegated ? 'Linked account · permissions checked per market.'
    : 'Signer account selected. If your funds are in a dreamDEX app wallet, select that trading address below.';
  function select(event: FormEvent) {
    event.preventDefault(); const address = publicAddress(input.trim());
    if (!address) { setError('Enter a valid nonzero trading account address.'); return; }
    setError(''); account.selectTrading(address); setInput('');
  }
  return <section className={`panel account-workspace${!account.actor && !account.owner ? ' no-selection' : ''}`} aria-label="Shared account setup">
    <div className="account-strip"><div><span>Signing wallet · gas payer</span><strong className="address-line">{account.actor ?? 'Not connected'}</strong>{account.actor && <small>{gas.error ? 'Gas balance unavailable' : gas.isPending ? 'Reading gas…' : `${amount(gas.data?.value, 18)} STT · block ${gas.data?.block}`} {gas.data && gas.error ? '(previous observation withheld)' : ''}</small>}</div>
      <div><span>{account.viewOnly ? 'Viewing account · read-only' : 'Trading account · receives positions'}</span><strong className="address-line" data-testid="selected-account">{account.owner ?? 'Not selected'}</strong><small>{account.viewOnly ? 'Public inspection does not authorize trades' : 'Perps collateral and positions are read for this address'}</small></div></div>
    <p role="status">{status}</p>
    {account.actor && !account.viewOnly && <p className="account-selection-note" role="status">{account.selectionSource === 'automatic' ? 'Linked trading account found automatically. Current balances and positions load for this address.' : account.selectionSource === 'restored' ? 'Your saved trading account was restored. Permissions are checked again before each order.' : account.selectionSource === 'default' && discovery.isFetching ? 'Looking for your trading account. The signing wallet is displayed while discovery runs.' : account.selectionSource === 'default' ? 'Select a discovered account, use this wallet directly, or enter an address once.' : 'Account selection is remembered for this signing wallet in this browser.'}</p>}
    {account.actor && !account.viewOnly && gas.data?.value === 0n && !gas.error && <p className="data-warnings">The signing wallet has no testnet STT for gas. Trading margin belongs to the selected account and cannot substitute for signer gas.</p>}
    {account.actor && account.chainId !== PERPS_CONFIG.chainId && <button className="button secondary" onClick={() => void account.switchNetwork()}>Switch wallet to testnet</button>}
    {account.actor && account.tradingOwner && (account.viewOnly || !account.signingSession()) && account.chainId === PERPS_CONFIG.chainId && <button className="button secondary" onClick={account.resumeTrading}>Return to trading account</button>}
    <details key={account.owner ?? 'setup'} ref={setupRef} open={(pathname === '/positions' && !account.owner) || (account.selectionSource === 'default' && (discovery.data?.candidates.length ?? 0) > 1)}><summary>Set up or change account</summary>
      <div className="account-paths"><div><strong>Inspect an account</strong><p>Public reads only. No trading permission or bot link needed.</p></div><div><strong>Trade from this wallet</strong><p>Use the signing wallet’s own margin.</p></div><div><strong>Trade a linked account</strong><p>Use another dreamDEX account’s margin with trading permission. No automated bot is required.</p></div></div>
      <div className="input-actions">{account.actor && <CopyAddress address={account.actor} label="connected signer" />}{account.owner && <CopyAddress address={account.owner} label="selected account" />}</div>
      <div className="input-actions"><label>Signing wallet provider<select value={wallet || account.choices[0]?.id || ''} onChange={event => setWallet(event.target.value)}>{!account.choices.length && <option value="">No wallet detected</option>}{account.choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</select></label><button className="button secondary" disabled={account.connecting || !account.choices.length} onClick={() => void account.connect(wallet || account.choices[0]?.id || '')}>{account.connecting ? 'Waiting for connection…' : 'Connect signing wallet'}</button>{account.actor && <button className="button secondary" onClick={account.disconnect}>Disconnect signing wallet</button>}</div>
      <form onSubmit={select}><label htmlFor="shared-trading-account">Trading account address · saved for this signer</label><div className="input-actions"><input id="shared-trading-account" placeholder="Paste your dreamDEX app wallet address once" value={input} onChange={event => setInput(event.target.value)} autoComplete="off" spellCheck={false} /><button className="button primary" type="submit">Use trading account</button></div></form>
      {error && <p role="alert">{error}</p>}
      {account.actor && <><TradingAccountChoices workspace />
        <div className="input-actions"><button className="button secondary" disabled={discovery.isFetching} onClick={() => void discovery.refetch()}>Retry account discovery</button><button className="button secondary" onClick={() => account.selectTrading(account.actor!)}>Use signing wallet itself</button><button className="button secondary" onClick={account.forgetTrading}>Forget saved selection</button></div></>}
    </details>
    {delegated && !account.viewOnly && <details><summary>Check linked trading permissions</summary><label>Permission market<select value={pool ?? ''} onChange={event => setMarket(event.target.value)}>{!markets.data?.rows.length && <option value="">{markets.isFetching ? 'Loading markets…' : 'Markets unavailable'}</option>}{markets.data?.rows.map(row => <option value={row.pool} key={row.pool}>{row.metadata.ok ? row.metadata.value.baseSymbol : row.pool}</option>)}</select></label>
      {account.chainId !== PERPS_CONFIG.chainId ? <p>Switch the wallet network before checking trading readiness.</p> : permission.isFetching ? <p>Checking current pool permissions…</p> : permission.error ? <p>Permission unavailable: {readError(permission.error)}</p> : permission.data ? <p>Place: {permission.data.place ? 'allowed' : 'not allowed'} · Cancel: {permission.data.cancel ? 'allowed' : 'not allowed'} · Reduce: {permission.data.reduce ? 'allowed' : 'not allowed'} · block {permission.data.blockNumber.toString()}. Every order checks again before signing.</p> : <p>Select a verified market to check.</p>}
      <button className="button secondary" disabled={!pool || permission.isFetching || account.chainId !== PERPS_CONFIG.chainId} onClick={() => void permission.refetch()}>Refresh linked permissions</button><Link className="text-link" to="/positions/manage?mode=delegate-place">Open linked order workspace</Link></details>}
    {delegated && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId && permission.data && !permission.error && !permission.isFetching && !permission.data.place && <p className="data-warnings">Placement permission is missing for the selected market. In dreamDEX, open this trading account and grant your signing address access using <a href={OFFICIAL_LINKS.botLinking} target="_blank" rel="noreferrer">Link a bot</a>. This grants trading permission; it does not create an automated bot.</p>}
    {account.storageWarning && <p role="alert">{account.storageWarning}</p>}{account.walletError && <p role="alert">{account.walletError}</p>}
  </section>;
}
