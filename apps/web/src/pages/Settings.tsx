import { useState } from 'react';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { FOUNDATION_CAPABILITIES, OFFICIAL_LINKS, PERPS_CONFIG } from '@pei/perps-adapter';
import { PageHeader } from '../components/PageHeader';

function ConfigurationRow({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  const [message, setMessage] = useState('');
  async function copyValue() {
    try { await navigator.clipboard.writeText(value); setMessage(`${label} copied`); }
    catch { setMessage('Clipboard unavailable. Select and copy the value manually.'); }
  }
  return <div className="config-row"><dt>{label}</dt><dd><code>{value}</code>{copy && <button type="button" className="icon-button" onClick={() => void copyValue()} aria-label={`Copy ${label}`}>{message.endsWith('copied') ? <Check size={15} /> : <Copy size={15} />}</button>}<span className="copy-status" role="status">{message}</span></dd></div>;
}

export function Settings() {
  return <>
    <PageHeader eyebrow="SETTINGS" title="Settings" description="Testnet configuration, capabilities and local storage." />
    <section className="panel"><div className="panel-heading"><h2>Network configuration</h2><span className="subtle-badge">EXPECTED DEPLOYMENT</span></div><p className="panel-description">Markets and account reads check chain ID, genesis, contract code and system wiring against these settings. See each data page for the latest verification result and snapshot time.</p><dl className="config-list">
      <ConfigurationRow label="Network" value={`${PERPS_CONFIG.chainName} · ${PERPS_CONFIG.region} region`} />
      <ConfigurationRow label="Chain ID" value={String(PERPS_CONFIG.chainId)} />
      <ConfigurationRow label="Gas asset" value={PERPS_CONFIG.nativeSymbol} />
      <ConfigurationRow label="RPC" value={PERPS_CONFIG.rpcUrl} copy />
      <ConfigurationRow label="WebSocket" value={PERPS_CONFIG.wsUrl} copy />
      <ConfigurationRow label="Indexer" value={PERPS_CONFIG.indexerUrl} copy />
      <ConfigurationRow label="Genesis hash" value={PERPS_CONFIG.genesisHash} copy />
    </dl></section>
    <div className="settings-grid"><section className="panel"><div className="panel-heading"><h2>Perps contracts</h2></div><dl className="config-list"><ConfigurationRow label="MarginBank" value={PERPS_CONFIG.marginBank} copy /><ConfigurationRow label="USDso collateral" value={PERPS_CONFIG.collateral} copy /><ConfigurationRow label="Pool factory" value={PERPS_CONFIG.factory} copy /></dl><p className="panel-description bottom-description">Expected addresses. Live verification errors block the affected reads; these labels alone do not prove connectivity.</p></section><section className="panel"><div className="panel-heading"><h2>Workspace capabilities</h2></div><dl className="capability-status"><div><dt>Market / account data</dt><dd>HTTP snapshots</dd></div><div><dt>Wallet access</dt><dd>Optional · explicit signing</dd></div><div><dt>Signing & trading</dt><dd>{FOUNDATION_CAPABILITIES.trading ? 'Available' : 'Unavailable'}</dd></div><div><dt>Markets SDK</dt><dd>{PERPS_CONFIG.sdkVersion} · pinned</dd></div></dl><div className="settings-note"><ShieldCheck size={18} aria-hidden="true" /><p>Wallet access requires Connect. Public account selections, execution journals, test notes and theme preferences are saved in this browser. Live account queries are cleared on identity changes. No keys or signatures are stored. Keep browser data while a transaction is unresolved.</p></div></section></div>
    <a className="text-link" href={OFFICIAL_LINKS.developers} target="_blank" rel="noreferrer">View official deployment documentation<ExternalLink size={14} aria-hidden="true" /></a>
  </>;
}
