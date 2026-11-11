import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from '../components/AppShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { History } from '../pages/History';
import { TestLab } from '../pages/TestLab';
import { NotFound } from '../pages/NotFound';
import { Overview } from '../pages/Overview';
import { Settings } from '../pages/Settings';
import { Providers } from './providers';
import { Markets } from '../pages/Markets';
import { Positions } from '../pages/Positions';
import { Trade } from '../pages/Trade';
import { Executions } from '../pages/Executions';
import { RiskLab } from '../pages/RiskLab';
import { Operations } from '../pages/Operations';
import '../features.css';

export function App() {
  return <ErrorBoundary><Providers><BrowserRouter><Routes><Route element={<AppShell />}>
    <Route index element={<Overview />} />
    <Route path="guide" element={<Navigate to="/trade" replace />} />
    <Route path="markets" element={<Markets />} />
    <Route path="trade" element={<Trade />} />
    <Route path="trade/:pool" element={<Trade />} />
    <Route path="executions" element={<Executions />} />
    <Route path="executions/:attemptId" element={<Executions />} />
    <Route path="positions" element={<Positions />} />
    <Route path="positions/risk" element={<RiskLab />} />
    <Route path="positions/manage" element={<Operations />} />
    <Route path="history" element={<History />} />
    <Route path="test-lab" element={<TestLab />} />
    <Route path="settings" element={<Settings />} />
    <Route path="*" element={<NotFound />} />
  </Route></Routes></BrowserRouter></Providers></ErrorBoundary>;
}
