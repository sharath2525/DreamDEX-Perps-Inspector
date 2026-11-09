import { Link, useSearchParams } from 'react-router';
import { ArrowRight, Check, Circle } from 'lucide-react';
import { reportPath } from '@pei/perps-adapter';
import type { Hash } from 'viem';

const steps = ['Choose account', 'Check order', 'Review & sign', 'Verify result', 'Review exposure', 'Save evidence'];
export function ExecutionJourney({ active, detail }: { active: number; detail: string }) {
  return <section className="execution-journey" aria-label="Execution journey">
    <div className="journey-heading"><Link to="/guide">Guided execution</Link><span>TESTNET</span></div>
    <ol>{steps.map((step, index) => <li key={step} aria-current={index === active ? 'step' : undefined} className={index === active ? 'current' : ''}><span className="journey-number">{index + 1}</span><span>{step}</span></li>)}</ol>
    <p role="status">{detail}</p>
  </section>;
}

export function Checkpoint({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return <div className={`case-checkpoint${done ? ' observed' : ''}`}>{done ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}<div><strong>{label}</strong><p>{detail}</p></div></div>;
}

/** The URL carries a public hash only. It neither changes identity nor grants authority. */
export function ReturnToCase() {
  const [params] = useSearchParams();
  const hash = params.get('case');
  if (!hash || !/^0x[\da-f]{64}$/i.test(hash)) return null;
  return <div className="case-return"><div><strong>Continue your execution case</strong><p>These are account observations, not transaction-local changes.</p></div><Link className="button secondary" to={reportPath(hash as Hash)}>Return to report & export<ArrowRight size={15} aria-hidden="true" /></Link></div>;
}
