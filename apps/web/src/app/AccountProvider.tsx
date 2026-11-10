import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAddress, isAddress, type Address } from 'viem';
import { AccountContext, type WalletChoice, type WalletProvider } from './account-context';
import { PERPS_CONFIG } from '@pei/perps-adapter';
import { lastViewedKey, publicAddress, remember, remembered, rememberTrading, restorableSelection } from './account-selection';
import { useTradingAccounts } from './queries';

function firstAddress(value: unknown): Address | null {
  return Array.isArray(value) && typeof value[0] === 'string' && isAddress(value[0]) ? getAddress(value[0]) : null;
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [owner, setOwner] = useState<Address | null>(() => remembered(lastViewedKey));
  const [tradingOwner, setTradingOwner] = useState<Address | null>(null);
  const [viewOnly, setViewOnly] = useState(true);
  const [identityVersion, setIdentityVersion] = useState(0);
  const [storageWarning, setStorageWarning] = useState('');
  const [actor, setActor] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [choices, setChoices] = useState<WalletChoice[]>(() => {
    const injected = (window as Window & { ethereum?: WalletProvider }).ethereum;
    return injected?.request ? [{ id: 'injected', name: 'Browser wallet', provider: injected }] : [];
  });
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [selectionSource, setSelectionSource] = useState<'default' | 'manual' | 'restored' | 'automatic' | 'inspection'>('inspection');
  const selectionIntent = useRef(selectionSource);
  const connectedAt = useRef(0);
  const discovery = useTradingAccounts(actor);
  const generation = useRef(0);
  const connection = useRef<{ provider: WalletProvider; actor: Address; chainId: number | null } | null>(null);
  const session = useRef<{ provider: WalletProvider } | null>(null);
  const signingSession = useCallback(() => session.current, []);
  const cleanup = useRef<() => void>(() => {});
  const clearAccountData = useCallback(() => {
    session.current = null;
    setIdentityVersion(value => value + 1);
    for (const key of ['account', 'history', 'operation-account', 'owner-stops', 'stop-context', 'permissions', 'risk-scenario', 'known-stop', 'account-permission']) {
      void queryClient.cancelQueries({ queryKey: [key] });
      queryClient.removeQueries({ queryKey: [key] });
    }
  }, [queryClient]);
  const inspect = useCallback((address: Address | null) => {
    selectionIntent.current = 'inspection'; setSelectionSource('inspection');
    clearAccountData(); setViewOnly(true); setOwner(address);
    setStorageWarning(remember(lastViewedKey, address));
  }, [clearAccountData]);
  const applyTrading = useCallback((address: Address, source: 'default' | 'manual' | 'restored' | 'automatic' = 'manual') => {
    const valid = publicAddress(address); if (!valid) return;
    const linked = connection.current;
    const mayResume = source !== 'automatic' || !!session.current;
    selectionIntent.current = source; setSelectionSource(source);
    clearAccountData(); setTradingOwner(valid); setOwner(valid); setViewOnly(!linked);
    let warning = remember(lastViewedKey, valid);
    if (linked) {
      // A testnet address preference is not a permission grant. Persist it even
      // when the browser wallet currently points at a different network.
      if (source !== 'default') warning = rememberTrading(linked.actor, valid) || warning;
      if (linked.chainId === PERPS_CONFIG.chainId && mayResume) session.current = { provider: linked.provider };
    }
    setStorageWarning(warning);
  }, [clearAccountData]);
  const selectTrading = useCallback((address: Address) => applyTrading(address, 'manual'), [applyTrading]);
  useEffect(() => {
    if (discovery.isFetching || discovery.error || !discovery.data?.autoSelect || !actor || chainId !== PERPS_CONFIG.chainId) return;
    if (selectionIntent.current !== 'default' || connection.current?.actor !== actor || discovery.data.observedAt < connectedAt.current) return;
    applyTrading(discovery.data.autoSelect, 'automatic');
  }, [actor, chainId, discovery.data, discovery.error, discovery.isFetching, applyTrading]);
  const resumeTrading = useCallback(() => { if (tradingOwner) selectTrading(tradingOwner); }, [tradingOwner, selectTrading]);
  const forgetTrading = useCallback(() => {
    if (actor) setStorageWarning(rememberTrading(actor, null));
    setTradingOwner(null); inspect(null);
  }, [actor, inspect]);
  const disconnect = useCallback(() => {
    generation.current++; cleanup.current(); cleanup.current = () => {};
    connection.current = null; clearAccountData();
    setActor(null); setChainId(null); setTradingOwner(null); setViewOnly(true); setOwner(null); setConnecting(false); setWalletError('');
  }, [clearAccountData]);

  useEffect(() => {
    const announce = (event: Event) => {
      const detail = (event as CustomEvent<{ info?: { uuid?: string; name?: string }; provider?: WalletProvider }>).detail;
      if (!detail?.info?.uuid || !detail.info.name || typeof detail.provider?.request !== 'function') return;
      const choice = { id: detail.info.uuid, name: detail.info.name.slice(0, 70), provider: detail.provider };
      setChoices(current => current.some(item => item.provider === choice.provider || item.id === choice.id) ? current.map(item => item.provider === choice.provider ? { ...item, name: choice.name } : item) : [...current, choice]);
    };
    window.addEventListener('eip6963:announceProvider', announce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    const lifecycle = generation;
    const subscriptions = cleanup;
    return () => { window.removeEventListener('eip6963:announceProvider', announce); lifecycle.current++; subscriptions.current(); };
  }, []);

  async function connect(id: string) {
    const provider = choices.find(choice => choice.id === id)?.provider;
    if (!provider) { setWalletError('No supported browser wallet was detected. Public address lookup is still available.'); return; }
    if (!provider.on || !provider.removeListener) { setWalletError('This wallet cannot report account changes reliably. Use public address lookup instead.'); return; }
    disconnect();
    const attempt = ++generation.current;
    setConnecting(true);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const chain = await provider.request({ method: 'eth_chainId' });
      if (attempt !== generation.current) return;
      const address = firstAddress(accounts);
      if (!address) throw new Error('The wallet did not expose an account.');
      const network = typeof chain === 'string' && /^0x[\da-f]+$/i.test(chain) ? Number(chain) : null;
      connection.current = { provider, actor: address, chainId: network };
      connectedAt.current = Date.now();
      void queryClient.invalidateQueries({ queryKey: ['account-discovery', address] });
      const saved = restorableSelection(address);
      setActor(address); setChainId(network); applyTrading(saved ?? address, saved ? 'restored' : 'default');
      const accountsChanged = (value: unknown) => {
        const next = firstAddress(value); if (!next) { disconnect(); return; }
        connection.current = { provider, actor: next, chainId: connection.current?.chainId ?? null };
        connectedAt.current = Date.now();
        void queryClient.invalidateQueries({ queryKey: ['account-discovery', next] });
        const savedNext = restorableSelection(next);
        setActor(next); applyTrading(savedNext ?? next, savedNext ? 'restored' : 'default');
        session.current = null; // An account event invalidates signing until deliberate resume.
      };
      const chainChanged = (value: unknown) => {
        clearAccountData(); const next = typeof value === 'string' && /^0x[\da-f]+$/i.test(value) ? Number(value) : null;
        if (connection.current) connection.current = { ...connection.current, chainId: next };
        setChainId(next);
      };
      const lost = () => disconnect();
      provider.on?.('accountsChanged', accountsChanged); provider.on?.('chainChanged', chainChanged); provider.on?.('disconnect', lost);
      cleanup.current = () => { provider.removeListener?.('accountsChanged', accountsChanged); provider.removeListener?.('chainChanged', chainChanged); provider.removeListener?.('disconnect', lost); };
    } catch (error) { if (attempt === generation.current) setWalletError(error && typeof error === 'object' && 'code' in error && error.code === 4001 ? 'Wallet connection rejected. You can retry or inspect a public address; nothing was signed.' : error instanceof Error ? error.message.slice(0, 200) : 'Wallet access was rejected or unavailable.'); }
    finally { if (attempt === generation.current) setConnecting(false); }
  }
  async function switchNetwork() {
    const linked = connection.current; if (!linked) return;
    const attempt = generation.current; clearAccountData(); setWalletError('');
    try {
      await linked.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${PERPS_CONFIG.chainId.toString(16)}` }] });
      const value = await linked.provider.request({ method: 'eth_chainId' });
      const network = typeof value === 'string' && /^0x[\da-f]+$/i.test(value) ? Number(value) : null;
      if (attempt !== generation.current || connection.current?.actor !== linked.actor) return;
      connection.current = { ...linked, chainId: network }; setChainId(network);
      if (network !== PERPS_CONFIG.chainId) setWalletError('Wallet is still on a different network. Select chain 50383 in the wallet.');
    } catch { setWalletError('Network switch rejected or unavailable. Select Somnia testnet (50383) in your wallet.'); }
  }
  return <AccountContext.Provider value={{ owner, actor, chainId, tradingOwner, viewOnly, identityVersion, storageWarning, selectionSource, choices, connecting, walletError, inspect, connect, disconnect, signingSession, selectTrading, resumeTrading, forgetTrading, switchNetwork }}>{children}</AccountContext.Provider>;
}
