import type { TransactionReport } from '@pei/perps-adapter';
import { caseOutcome } from '../app/case-outcome';
import { EvidenceDownload } from './EvidenceDownload';

export function CaseOutcome({ report }: { report: Extract<TransactionReport, { state: 'mined' }> }) {
  const explanation = caseOutcome(report);
  const summary = { schema: 'pei.execution-case.v1', chainId: report.chainId, sdkVersion: report.sdkVersion,
    hash: report.hash, actor: report.actor, owner: report.owner, pool: report.pool,
    receiptBlock: report.block.toString(), receiptBlockHash: report.blockHash,
    currentObservationBlock: report.currentBlock.toString(), observedAt: report.observedAt,
    transactionStatus: report.transactionStatus, outcome: report.outcome,
    filledRaw: report.conflicting ? null : report.filled.toString(), baseDecimals: report.baseDecimals,
    gasPaidWei: report.gasPaid.toString(), explanation,
    provenance: 'Independent chain inspection; does not prove PEI frontend origin or complete account history.',
    rawEvidence: 'Download the full JSON report for underlying observations. Local notes and provider error strings are not included in this summary.' };
  return <section className={`case-outcome ${explanation.tone}`} aria-label="Case explanation">
    <div className="case-eyebrow">WHAT HAPPENED</div><h3>{explanation.title}</h3>
    <div className="case-explanation-grid"><div><span className="evidence-tag">Observed</span><p>{explanation.observed}</p></div><div><span className="evidence-tag unknown">Unknown</span><p>{explanation.unknown}</p></div></div>
    <div className="case-next"><strong>Next safe step</strong><p>{explanation.next}</p></div>
    <details className="diagnostic-export"><summary>Save a concise case summary</summary><p>Includes public addresses and the hash. Review before sharing; nothing is sent automatically.</p><EvidenceDownload value={summary} name={`case-${report.hash}`} label="case summary" /></details>
  </section>;
}
