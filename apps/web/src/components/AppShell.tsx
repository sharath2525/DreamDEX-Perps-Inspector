import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router';
import { ArrowUpRight, BookOpen, ChevronRight, CircleHelp, Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { OFFICIAL_LINKS, PERPS_CONFIG } from '@pei/perps-adapter';
import { navigation } from '../app/navigation';
import { WalletConnect } from './WalletConnect';
import { AccountWorkspace } from './AccountWorkspace';
import { useAccount } from '../app/account-context';

function area(path: string) {
  if (path === '/markets' || path === '/guide' || path.startsWith('/trade')) return '/trade';
  if (path === '/history' || path.startsWith('/executions')) return '/executions';
  if (path === '/positions' || path === '/positions/risk') return '/positions';
  return path;
}

function WorkspaceTabs() {
  const { pathname } = useLocation();
  const tabs = area(pathname) === '/trade' ? [['/trade', 'Order'], ['/markets', 'Markets']]
    : area(pathname) === '/executions' ? [['/executions', 'Inspector'], ['/history', 'History']]
    : area(pathname) === '/positions' ? [['/positions', 'Positions'], ['/positions/risk', 'Risk Lab']] : [];
  if (!tabs.length) return null;
  return <nav className="workspace-tabs" aria-label="Workspace tabs">{tabs.map(([path, label]) => <NavLink key={path} to={path!} end={path === '/positions'}>{label}</NavLink>)}</nav>;
}

function Brand() {
  return <NavLink to="/" className="brand" aria-label="Perps Execution Inspector overview">
    <span className="brand-mark" aria-hidden="true"><ScanMark /></span>
    <span><strong>perps<span className="brand-light"> inspector</span></strong><small>BUILT FOR dreamDEX</small></span>
  </NavLink>;
}

function ScanMark() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M3 12h18M8 9v6M12 7v10M16 9v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const primary = ['/', '/trade', '/executions', '/positions'];
  const utilities = ['/positions/manage', '/test-lab', '/settings'];
  const item = ({ path, label, icon: Icon }: typeof navigation[number]) => <NavLink key={path} to={path} onClick={onNavigate} className={`nav-item ${area(pathname) === path ? 'active' : ''}`}><Icon size={18} aria-hidden="true" /><span>{label}</span></NavLink>;
  return <nav aria-label="Workspace navigation" className="nav-list">
    <div className="nav-label">WORKSPACE</div>
    {navigation.filter(row => primary.includes(row.path)).map(item)}
    <div className="nav-label">TOOLS</div>
    {navigation.filter(row => utilities.includes(row.path)).map(item)}
  </nav>;
}

function SidebarFoot() {
  return <div className="sidebar-foot">
    <div className="network-note"><ShieldCheck size={18} aria-hidden="true" /><div><strong>A testnet workspace</strong><p>Inspect first. Sign deliberately.</p></div></div>
    <a href={OFFICIAL_LINKS.developers} target="_blank" rel="noreferrer" className="sidebar-docs"><BookOpen size={16} aria-hidden="true" />dreamDEX documentation<ArrowUpRight size={14} aria-hidden="true" /></a>
    <div className="sidebar-version"><span>PEI / v0.1.0</span><span>TESTNET</span></div>
  </div>;
}

function initialTheme(): 'dark' | 'light' {
  try { return localStorage.getItem('pei-theme') === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function AppShell() {
  const account = useAccount();
  const navType = useNavigationType();
  const location = useLocation();
  const [theme, setTheme] = useState(initialTheme);
  const dialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const previousKey = useRef(location.key);
  const scrollPositions = useRef(new Map<string, number>());
  const setup = useRef<HTMLDetailsElement>(null);
  const accountPanel = useRef<HTMLDetailsElement>(null);
  const current = navigation.find(item => item.path === location.pathname)?.label
    ?? navigation.find(item => item.path !== '/' && location.pathname.startsWith(item.path + '/'))?.label
    ?? 'Workspace';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('pei-theme', theme); } catch { /* Theme still works for this session. */ }
  }, [theme]);

  useLayoutEffect(() => {
    document.title = current + ' · Perps Execution Inspector';
    const pane = main.current;
    if (!pane) return;
    const changed = previousKey.current !== location.key;
    previousKey.current = location.key;
    if (changed) {
      dialog.current?.close();
      pane.focus({ preventScroll: true });
    }
    const saved = navType === 'POP' ? scrollPositions.current.get(location.key) : undefined;
    const anchor = location.hash.slice(1);
    function restore() {
      if (saved !== undefined) pane!.scrollTo({ top: saved, left: 0 });
      else {
        const target = anchor ? document.getElementById(anchor) : null;
        if (target && pane!.contains(target)) target.scrollIntoView({ block: 'start' });
        else if (changed) pane!.scrollTo({ top: 0, left: 0 });
      }
    }
    restore();
    // Async tables can change height after navigation. Restore briefly until the
    // user interacts; never keep pulling the page away from deliberate scrolling.
    const content = pane.firstElementChild;
    const resize = new ResizeObserver(restore);
    const mutation = new MutationObserver(restore);
    if ((saved !== undefined || anchor) && content) { resize.observe(content); mutation.observe(content, { childList: true, subtree: true }); }
    const stop = () => { resize.disconnect(); mutation.disconnect(); };
    const stopOnKey = (event: KeyboardEvent) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Tab'].includes(event.key)) stop(); };
    const timer = window.setTimeout(stop, 8000);
    pane.addEventListener('wheel', stop, { passive: true }); pane.addEventListener('touchstart', stop, { passive: true }); pane.addEventListener('pointerdown', stop); pane.addEventListener('keydown', stopOnKey);
    const positions = scrollPositions.current;
    const record = () => positions.set(location.key, pane.scrollTop);
    pane.addEventListener('scroll', record, { passive: true });
    return () => { stop(); window.clearTimeout(timer); pane.removeEventListener('scroll', record); pane.removeEventListener('wheel', stop); pane.removeEventListener('touchstart', stop); pane.removeEventListener('pointerdown', stop); pane.removeEventListener('keydown', stopOnKey); };
  }, [location.key, location.hash, current, navType]);

  function openSetup() {
    if (accountPanel.current) accountPanel.current.open = true;
    if (setup.current) setup.current.open = true;
    const input = document.getElementById('shared-trading-account');
    input?.focus({ preventScroll: true });
    setup.current?.scrollIntoView({ block: 'nearest' });
  }

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="desktop-sidebar"><Brand /><Navigation /><SidebarFoot /></aside>
    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><button type="button" className="icon-button menu-button" aria-label="Open navigation" aria-haspopup="dialog" aria-controls="mobile-navigation" onClick={() => dialog.current?.showModal()}><Menu size={20} /></button><span className="breadcrumb-root">Workspace</span><ChevronRight size={14} className="breadcrumb-root" aria-hidden="true" /><span>{current}</span></div>
        <div className="topbar-actions"><span className="network-badge"><span className="network-dot" />{PERPS_CONFIG.chainName.replace(' Testnet', '')}<span className="testnet-label">TESTNET</span></span><span className="topbar-divider" /><button type="button" className="icon-button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><WalletConnect openSetup={openSetup} /></div>
      </header>
      <main id="main-content" className="main-content" ref={main} tabIndex={-1}>
        <div className="workspace-page">
        <details key={location.pathname} className="account-drawer" ref={accountPanel} open={location.pathname === '/positions'}>
          <summary><span>{account.viewOnly ? 'Viewing account' : 'Trading account'} <strong>{account.owner ? `${account.owner.slice(0, 6)}…${account.owner.slice(-4)}` : 'Not selected'}</strong></span><span>{account.actor && account.chainId !== PERPS_CONFIG.chainId ? 'Wrong network · manage' : account.viewOnly && account.actor ? 'Read-only · manage' : 'Manage account'}</span></summary>
          <AccountWorkspace setupRef={setup} />
        </details>
        <WorkspaceTabs />
        <Outlet />
        <footer className="content-footer"><span>Perps Execution Inspector<span className="footer-dot">·</span>dreamDEX on Somnia</span><span><CircleHelp size={14} aria-hidden="true" />Testnet only. Every send requires confirmation.</span></footer>
        </div>
      </main>
    </div>
    <dialog id="mobile-navigation" className="mobile-dialog" ref={dialog} aria-label="Workspace menu" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const items = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="mobile-dialog-heading"><Brand /><button type="button" className="icon-button" aria-label="Close navigation" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      <Navigation onNavigate={() => dialog.current?.close()} /><SidebarFoot />
    </dialog>
  </div>;
}
