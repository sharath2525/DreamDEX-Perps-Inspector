import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { readError } from '@pei/perps-adapter';

export function DataStatus({ observedAt, blockNumber, error, fetching, refresh, threshold = 45000 }: {
  observedAt?: number; blockNumber?: bigint; error: unknown; fetching: boolean; refresh(): void; threshold?: number;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const stale = observedAt !== undefined && now - observedAt > threshold;
  return <div className={`data-status ${error || stale ? 'warning' : ''}`} role="status">
    <div><strong>{error ? 'Read failed' : fetching ? 'Reading testnet…' : stale ? 'Stale snapshot' : observedAt ? 'Chain snapshot' : 'Not loaded'}</strong>
      <p>{error ? readError(error) : observedAt ? `Block ${blockNumber?.toString()} · ${new Date(observedAt).toLocaleTimeString()} · ${Math.max(0, Math.floor((now - observedAt) / 1000))}s ago · HTTP` : 'Verifying network identity and deployment before reading data.'}</p>
      {!!error && observedAt !== undefined && <p>Previous snapshot retained from block {blockNumber?.toString()}; it is not current.</p>}
    </div><button className="button secondary" disabled={fetching} onClick={refresh}><RefreshCw size={14} />{fetching ? 'Reading…' : 'Refresh'}</button>
  </div>;
}
export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <details className="data-warnings"><summary>{items.length} data limitation{items.length === 1 ? '' : 's'}</summary><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></details>;
}
