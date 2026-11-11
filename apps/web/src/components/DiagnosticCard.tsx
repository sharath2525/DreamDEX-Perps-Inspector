import { Link } from 'react-router';
import { diagnostic, type DiagnosticCode } from '@pei/perps-adapter';
import { EvidenceDownload } from './EvidenceDownload';

export function DiagnosticCard({ code, stage, at, pool }: { code: DiagnosticCode; stage: 'validation' | 'preflight' | 'submission'; at: number; pool?: string | null }) {
  const explanation = diagnostic(code);
  const next = stage === 'submission' ? { href: '/executions', label: 'Inspect existing attempts' }
    : code === 'liquidity' || code === 'precision' ? { href: pool ? `/markets?pool=${encodeURIComponent(pool)}#selected-market` : '/markets', label: 'Inspect market rules & book' }
    : code === 'collateral' || code === 'identity' || code === 'gas' ? { href: '/positions', label: 'Review account & funds' }
    : { href: '/settings', label: 'Check connection settings' };
  const evidence = { schema: 'pei.diagnostic-case.v1', stage, observedAt: at,
    observed: stage === 'validation' ? 'The entered values failed local validation. Preflight and wallet submission are blocked.' : stage === 'preflight' ? 'Unsigned preflight did not complete. No wallet send was requested by this check.' : 'Submission did not complete normally. Consult the saved attempt and wallet activity for its outcome.',
    confidence: 'possible-explanation', category: code, explanation: explanation.title,
    nextCheck: stage === 'submission' ? 'Do not resend an uncertain transaction. Inspect the original journal and recover its hash if necessary.' : explanation.nextCheck,
    limitation: 'Category inferred from error wording; it is not a proven root cause, receipt or protocol defect. Raw provider errors, keys, signatures and private notes are excluded.' };
  return <section className="diagnostic-card" aria-label="Execution diagnosis">
    <div className="case-eyebrow">{stage !== 'submission' ? 'CHECK STOPPED' : 'REVIEW WALLET OUTCOME'}</div>
    <h3>{stage !== 'submission' ? 'Resolve this before signing' : 'Verify before trying again'}</h3>
    <dl><div><dt>Observed</dt><dd>{evidence.observed}</dd></div><div><dt>Possible explanation</dt><dd>{explanation.title}. This category is inferred from error wording.</dd></div><div><dt>Next check</dt><dd>{evidence.nextCheck}</dd></div></dl>
    <Link className="text-link" to={next.href}>{next.label}</Link>
    {stage === 'preflight' && code === 'identity' && <a className="text-link" href="https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot" target="_blank" rel="noreferrer">Official account-linking guide</a>}
    <details className="diagnostic-export"><summary>Export this diagnostic</summary><EvidenceDownload value={evidence} name="diagnostic-case" label="diagnostic" /></details>
  </section>;
}
