import { Link } from 'react-router';
import { sameAddress } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useAttempts } from '../app/execution-store';
import { useOperations } from '../app/operation-store';

export function EvidenceCheckpoints() {
  const { owner } = useAccount();
  const attempts = useAttempts(), operations = useOperations();
  const rows = [
    ...attempts.records.filter(row => owner && sameAddress(row.owner, owner) && row.hash).map(row => ({ id: row.id, hash: row.hash!, at: row.createdAt, status: row.status, kind: row.kind, path: `/executions/${row.id}` })),
    ...operations.rows.filter(row => owner && sameAddress(row.owner, owner) && row.hash && row.kind.startsWith('delegate-') && ['delegate-place', 'delegate-cancel', 'delegate-reduce'].includes(row.kind)).map(row => ({ id: row.id, hash: row.hash!, at: row.createdAt, status: row.status, kind: row.kind, path: `/positions/manage#operation-${row.id}` })),
  ].sort((a, b) => b.at - a.at);
  return <section className="panel evidence-checkpoints" aria-label="Real-order evidence checkpoints"><h2>Check existing evidence before another order</h2>
    <p>Journal entries are local records, not independently verified execution proof. Review U10 notes and verify each candidate's actual receipt. An order created in another application must not be described as PEI-created.</p>
    {attempts.error || operations.error ? <p role="alert">A trading journal could not be read. Recover unresolved attempts before placing another order.</p> : !owner ? <p>Select the trading account to find its existing journal hashes.</p> : rows.length ? rows.slice(0, 3).map(row => <Link className="evidence-candidate" key={row.id} to={row.path}>{row.kind} · {row.status} · {new Date(row.at).toLocaleString()}<br />{row.hash}<br />Open recorded attempt and verify receipt</Link>) : <p>No trading hash is recorded here for this account. Check your exported U10 notes and the browser where you traded before creating a new order.</p>}
    <ol><li>Export your guided test notes, then review any existing hash and its originating attempt.</li><li>If a new test is needed, run U08 with current tick/lot rules, account permissions and a deliberately chosen test size. You review and sign each transaction.</li><li>Record whether it rested, filled, reverted or remains unresolved. Save the receipt and later order/position observations separately.</li><li>Run U11 only when a remainder exists. Cancelling it does not close an already-filled position.</li><li>Keep Arena funds and separate bounty-grant accounts separate. The extension is shown; confirm the exact revised cutoff and your DoraHacks email whitelist before submission.</li></ol>
    <p>No transaction, feedback report, X post or bounty submission is sent by this checklist.</p>
  </section>;
}
