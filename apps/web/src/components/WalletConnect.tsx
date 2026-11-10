import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, X } from 'lucide-react';
import { amount, OFFICIAL_LINKS, PERPS_CONFIG, readPermissions, readSignerGas, sameAddress } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useMarkets } from '../app/queries';
import { CopyAddress } from './CopyAddress';
import { TradingAccountChoices } from './TradingAccountChoices';

function WalletAccountDetails() {
  const account = useAccount();
  const [market, setMarket] = useState('');
  const linked = !!account.actor && !!account.owner && !sameAddress(account.actor, account.owner);
  const markets = useMarkets(linked);
  const pool = markets.data?.rows.find(row => row.pool === market)?.pool ?? markets.data?.rows[0]?.pool;
  const gas = useQuery({ queryKey: ['signer-gas', account.actor], enabled: !!account.actor, queryFn: ({ signal }) => readSignerGas(account.actor!, signal), retry: false, staleTime: 15000, refetchOnWindowFocus: false });
  const permission = useQuery({ queryKey: ['account-permission', account.actor, account.owner, pool, account.identityVersion], enabled: linked && !!pool && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId, queryFn: ({ signal }) => readPermissions(account.owner!, account.actor!, pool!, signal), retry: false, staleTime: 15000, refetchOnWindowFocus: false });
  const next = account.chainId !== PERPS_CONFIG.chainId ? 'Switch to chain 50383, then return to your trading account.'
    : account.viewOnly || !account.signingSession() ? 'Return to your trading account before preparing a new order.'
    : gas.error ? 'Gas could not be read. Retry before preparing an order.'
    : gas.data?.value === 0n ? 'The signing wallet needs testnet STT for gas. Its gas is separate from the trading account’s margin.'
    : linked ? permission.isFetching ? 'Checking current trading permission…' : permission.error || markets.error ? 'Permission data is unavailable. Retry the check; no permission is inferred.' : permission.data ? permission.data.place ? 'Placement permission observed for this market. Trade still checks terms, margin and gas before every signature.' : 'Placement is not allowed for this market. Review Link a bot in the official dreamDEX app.' : 'Choose a market and wait for its permission check.'
    : 'Using the signing wallet itself. If your margin is in a dreamDEX app wallet, choose that account with Manage trading account.';
  return <>
    <dl className="wallet-identities"><dt>Signing wallet · pays gas</dt><dd>{account.actor}<CopyAddress address={account.actor!} label="signing wallet address" /></dd><dt>{account.viewOnly ? 'Viewing account · read-only' : 'Selected account · positions and margin'}</dt><dd>{account.owner ?? 'Choose a trading account'}{account.owner && <CopyAddress address={account.owner} label="trading account address" />}</dd><dt>Wallet network</dt><dd>{account.chainId === PERPS_CONFIG.chainId ? 'Somnia testnet · 50383' : `Wrong network · ${account.chainId ?? 'unknown'}`}</dd><dt>Signer gas on testnet</dt><dd>{gas.error ? 'Unavailable — no zero assumed' : gas.data ? `${amount(gas.data.value, 18)} STT · block ${gas.data.block}` : 'Reading gas…'}</dd></dl>
    {linked && <label className="wallet-permission-market">Check permission for market<select value={pool ?? ''} onChange={event => setMarket(event.target.value)}>{!markets.data?.rows.length && <option value="">{markets.isFetching ? 'Loading markets…' : 'Markets unavailable'}</option>}{markets.data?.rows.map(row => <option key={row.pool} value={row.pool}>{row.metadata.ok ? row.metadata.value.baseSymbol : row.pool}</option>)}</select></label>}
    {linked && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId && permission.data && !permission.error && !permission.isFetching && <p>Place {permission.data.place ? 'allowed' : 'not allowed'} · Cancel {permission.data.cancel ? 'allowed' : 'not allowed'} · Reduce {permission.data.reduce ? 'allowed' : 'not allowed'} at block {permission.data.blockNumber.toString()}. These permissions do not authorize withdrawals or owner stops.</p>}
    <p className="wallet-next-step" role="status">{next}</p>
    {linked && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId && !permission.isFetching && !permission.error && permission.data && !permission.data.place && <p><a href={OFFICIAL_LINKS.botLinking} target="_blank" rel="noreferrer">Grant trading permission in dreamDEX</a> using “Link a bot”. You do not need to build or run a bot.</p>}
    {(gas.error || permission.error || markets.error) && <button className="button secondary" onClick={() => { void gas.refetch(); if (linked) void markets.refetch(); if (linked && pool && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId) void permission.refetch(); }}>Retry wallet checks</button>}
  </>;
}

export function WalletConnect({ openSetup }: { openSetup(): void }) {
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  function showSetup() {
    dialog.current?.close();
    openSetup();
  }
  return <>
    <button type="button" className="header-wallet" aria-haspopup="dialog" aria-controls="wallet-dialog" title={account.actor ? `Signing wallet ${account.actor}${account.chainId !== PERPS_CONFIG.chainId ? ' · wrong network' : ''}` : 'Connect a browser wallet'} onClick={() => { setOpen(true); dialog.current?.showModal(); }}>
      <Wallet size={15} aria-hidden="true" />{account.actor ? `${account.actor.slice(0, 6)}…${account.actor.slice(-4)}` : 'Connect wallet'}
    </button>
    <dialog id="wallet-dialog" ref={dialog} className="wallet-dialog" aria-labelledby="wallet-title" onClose={() => setOpen(false)} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])')].filter(item => item.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className="wallet-sheet"><header><h2 id="wallet-title">{account.actor ? 'Your wallet' : 'Connect a wallet'}</h2><button type="button" className="icon-button" aria-label="Close wallet dialog" onClick={() => dialog.current?.close()}><X size={18} /></button></header>
        {account.actor ? <>
          {open && <WalletAccountDetails />}
          {open && <TradingAccountChoices />}
          {account.chainId !== PERPS_CONFIG.chainId && <button className="button secondary" onClick={() => void account.switchNetwork()}>Switch wallet to Somnia testnet</button>}
          {account.chainId === PERPS_CONFIG.chainId && account.tradingOwner && (account.viewOnly || !account.signingSession()) && <button className="button secondary" onClick={account.resumeTrading}>Resume selected trading account</button>}
          <button className="button primary" onClick={showSetup}>Manage trading account</button><button className="button secondary" onClick={() => { account.disconnect(); dialog.current?.close(); }}>Disconnect wallet</button>
        </> : <>
          <p>Choose the browser wallet that will pay testnet gas. Connecting requests access to its public address.</p>
          {account.choices.map(choice => <button key={choice.id} className="wallet-choice" disabled={account.connecting} onClick={() => void account.connect(choice.id)}><Wallet size={18} aria-hidden="true" /><span>{choice.name}</span><span>{account.connecting ? 'Waiting…' : 'Connect'}</span></button>)}
          {!account.choices.length && <p role="status">No browser wallet detected. Open this site in the browser where your wallet extension is enabled, or inspect a public trading address.</p>}
          {account.connecting && <button className="button secondary" onClick={account.disconnect}>Cancel connection request</button>}
          <button className="button secondary" onClick={showSetup}>Use a public address</button>
        </>}
        {account.walletError && <p role="alert">{account.walletError}</p>}
      </div>
    </dialog>
  </>;
}
