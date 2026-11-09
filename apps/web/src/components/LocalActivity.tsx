import { Link } from 'react-router';
import { sameAddress, reportPath } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useAttempts } from '../app/execution-store';
import { useOperations } from '../app/operation-store';

export function LocalActivity({ limit = 20 }: { limit?: number }) {
  const { owner } = useAccount(), attempts = useAttempts(), operations = useOperations();
  const rows = [...attempts.records.map(row => ({ ...row, source: 'Direct order', href: `/executions/${row.id}` })),
    ...operations.rows.map(row => ({ ...row, source: row.kind.startsWith('delegate-') ? 'Linked operation' : 'Account operation', href: `/positions/manage#operation-${row.id}` }))]
    .filter(row => !owner || sameAddress(row.owner, owner)).sort((a, b) => b.createdAt - a.createdAt);
  return <section className="local-activity" aria-label="Combined local activity">
    <p>Local PEI activity · {owner ? 'selected account only' : 'all accounts on this device'} · {rows.length} records. Confirmed means receipt confirmed, not necessarily filled.</p>
    {(attempts.error || operations.error) && <p role="alert">{attempts.error || operations.error} Activity may be incomplete.</p>}
    {!rows.length && !attempts.error && !operations.error && <p>No local attempts for this selection. Trades made in dreamDEX can still appear in Positions and indexed History.</p>}
    <ul>{rows.slice(0, limit).map(row => <li key={`${row.source}:${row.id}`}><Link to={row.href}><strong>{row.source} · {row.kind} · {row.status}</strong><span>{new Date(row.createdAt).toLocaleString()}</span><code className="address-line">{row.hash ?? 'No transaction hash returned'}</code></Link>{row.hash && <Link className="text-link" to={reportPath(row.hash)}>Independent transaction report</Link>}</li>)}</ul>
    {rows.length > limit && <p>Showing newest {limit} of {rows.length}. Full journals remain in Execution Inspector and Account operations.</p>}
  </section>;
}
