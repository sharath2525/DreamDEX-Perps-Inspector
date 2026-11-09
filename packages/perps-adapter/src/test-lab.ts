import type { Address } from 'viem';
import { PERPS_CONFIG as config } from './config';
import { verifyDeployment, readAccount } from './read';
import { readHistoryPage } from './history';
import { calculateRisk } from './risk';
export type CheckStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT RUN' | 'INCONCLUSIVE';
export interface LabCheck { name: string; status: CheckStatus; expected: string; actual: string; source: string }
export async function runReadDiagnostics(owner: Address | null, signal: AbortSignal) {
  const checks: LabCheck[] = [];
  const startedAt = Date.now();
  let head: string | null = null;
  try { const deployment = await verifyDeployment(signal); head = deployment.blockNumber.toString(); checks.push({ name: 'Deployment', status: 'PASS', expected: 'Configured chain/genesis and fully wired contracts', actual: `Verified block ${head}`, source: 'HTTP chain, genesis, bytecode and getSystemConfig' }); }
  catch { signal.throwIfAborted(); checks.push({ name: 'Deployment', status: 'INCONCLUSIVE', expected: 'Configured chain/genesis and fully wired contracts', actual: 'Verification did not complete. Inspect connection/configuration; this is not a confirmed protocol bug.', source: 'HTTP RPC' }); }
  if (owner && head) {
    try { const snapshot = await readAccount(owner, signal); const risk = await calculateRisk(snapshot, 0n);
      checks.push({ name: 'Account baseline', status: risk.ready ? 'PASS' : risk.coverageComplete && risk.difference ? 'FAIL' : 'INCONCLUSIVE', expected: 'Complete inputs; zero difference for equity, IM, MM and CM', actual: risk.ready ? `Exact match at ${snapshot.blockNumber}` : 'Incomplete inputs or baseline mismatch; reproduce before classifying as an issue.', source: 'MarginBank account/health + SDK perpPositionAnalytics' }); }
    catch { signal.throwIfAborted(); checks.push({ name: 'Account baseline', status: 'INCONCLUSIVE', expected: 'Account snapshot and analytics', actual: 'Read unavailable; no zero balance substituted.', source: 'HTTP RPC' }); }
    for (const kind of ['orders', 'fills', 'funding', 'margin'] as const) {
      try { const page = await readHistoryPage({ owner, kind }, 0, null, signal); checks.push({ name: `${kind} history`, status: 'PASS', expected: 'One bounded account-scoped page', actual: `${page.rows.length} indexed records; processed ${page.processed ?? 'unknown'}; read shape only, not complete chain reconciliation`, source: 'SDK indexer page' }); }
      catch { signal.throwIfAborted(); checks.push({ name: `${kind} history`, status: 'INCONCLUSIVE', expected: 'One bounded account-scoped page', actual: 'Indexed read unavailable. No empty history inferred.', source: 'SDK indexer page' }); }
    }
  } else checks.push({ name: 'Account checks', status: 'BLOCKED', expected: 'Selected public owner and verified deployment', actual: 'Select an account and establish the connection.', source: 'Local prerequisites' });
  checks.push({ name: 'Signed lifecycle', status: 'NOT RUN', expected: 'Explicit wallet confirmation, actual order receipt, remainder cancellation and final exposure', actual: 'Read-only suite does not sign or certify a trading run.', source: 'Trade → Execution Inspector → Positions' });
  return { schema: 'pei-diagnostics-v1', mode: 'READ_ONLY', chainId: config.chainId, genesis: config.genesisHash, sdkVersion: config.sdkVersion, owner, head, startedAt, finishedAt: Date.now(), checks };
}
