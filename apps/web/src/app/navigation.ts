import { Activity, ArrowLeftRight, ChartNoAxesCombined, FlaskConical, History, LayoutDashboard, ScanLine, Settings2, WalletCards } from 'lucide-react';

export const navigation = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/guide', label: 'Guided execution', icon: ScanLine },
  { path: '/markets', label: 'Markets', icon: ChartNoAxesCombined },
  { path: '/trade', label: 'Trade', icon: ArrowLeftRight },
  { path: '/executions', label: 'Execution Inspector', icon: ScanLine },
  { path: '/positions', label: 'Positions', icon: WalletCards },
  { path: '/positions/risk', label: 'Risk Lab', icon: Activity },
  { path: '/positions/manage', label: 'Account operations', icon: WalletCards },
  { path: '/history', label: 'History', icon: History },
  { path: '/test-lab', label: 'Developer Test Lab', icon: FlaskConical },
  { path: '/settings', label: 'Settings', icon: Settings2 },
] as const;
