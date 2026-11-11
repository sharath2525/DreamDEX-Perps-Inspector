import { PERPS_CONFIG } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';

/** Opens existing setup only; never changes identity or authorizes a transaction. */
function openAccountSetup() {
  const drawer = document.querySelector<HTMLDetailsElement>('.account-drawer');
  if (drawer) drawer.open = true;
  const input = document.getElementById('shared-trading-account');
  const setup = input?.closest('details');
  if (setup) setup.open = true;
  input?.focus();
}

export function AccountRecovery() {
  const account = useAccount();
  if (!account.actor) return <div className="account-recovery"><p>Connect a signing wallet to check and place an order. Public market reads remain available.</p><button type="button" className="button secondary" onClick={() => document.querySelector<HTMLButtonElement>('.header-wallet')?.click()}>Choose signing wallet</button></div>;
  if (account.chainId !== PERPS_CONFIG.chainId) return <div className="account-recovery"><p>Wrong wallet network. This workspace trades on testnet chain 50383.</p><button type="button" className="button secondary" onClick={() => void account.switchNetwork()}>Switch network to 50383</button>{account.walletError && <p role="alert">{account.walletError}</p>}</div>;
  if (account.tradingOwner && (account.viewOnly || !account.signingSession())) return <div className="account-recovery"><p>This account is read-only. Resume trading to prepare a fresh review.</p><button type="button" className="button secondary" onClick={account.resumeTrading}>Resume selected trading account</button></div>;
  return <div className="account-recovery"><p>Check the selected account and its signing authority before continuing.</p><button type="button" className="button secondary" onClick={openAccountSetup}>Choose trading account</button></div>;
}
