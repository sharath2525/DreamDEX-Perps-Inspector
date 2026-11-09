import { Link } from 'react-router';
import { ArrowRight, FileCheck2, ScanLine, Wallet } from 'lucide-react';
import { PERPS_CONFIG, sameAddress } from '@pei/perps-adapter';
import { useAccount } from '../app/account-context';
import { useAccountSnapshot } from '../app/queries';
import { PageHeader } from '../components/PageHeader';
import { ExecutionJourney, Checkpoint } from '../components/ExecutionJourney';
import { LocalActivity } from '../components/LocalActivity';

export function Guide() {
  const account = useAccount();
  const snapshot = useAccountSnapshot(account.owner);
  const identity = !!account.actor && !!account.owner && !account.viewOnly && account.chainId === PERPS_CONFIG.chainId && !!account.signingSession();
  const linked = account.actor && account.owner && !sameAddress(account.actor, account.owner);
  return <>
    <PageHeader eyebrow="GUIDED EXECUTION" title="One order. An explainable outcome." description="Check the right account, verify what happened, and leave with evidence you can inspect." />
    <ExecutionJourney active={identity ? 1 : 0} detail={identity ? 'Account selected. Order inputs, permission, margin and gas still need a fresh preflight.' : 'Use Connect wallet above to trade, or inspect an existing transaction without connecting.'} />
    <div className="case-start-grid">
      <section className="panel case-start-card"><Wallet size={23} aria-hidden="true" /><h2>Start a new order</h2><p>A guided path through the existing trading checks. You approve every write.</p>
        <Checkpoint label="Signing wallet" done={!!account.actor} detail={account.actor ?? 'Connect using the wallet button in the header.'} />
        <Checkpoint label="Trading account" done={!!account.owner} detail={account.owner ? `${account.owner}${linked ? ' · separate from the signer' : ''}` : 'Choose the account holding your perps margin.'} />
        <Checkpoint label="Account snapshot" done={!!snapshot.data && !snapshot.error && !snapshot.isFetching} detail={snapshot.error ? 'Read unavailable; refresh Positions. No balance is assumed.' : snapshot.data ? `Observed at block ${snapshot.data.blockNumber}. This is not order approval.` : account.owner ? 'Waiting for account data.' : 'Select an account to read its margin and positions.'} />
        <Link className="button primary" to={identity ? '/trade' : '/positions'}>{identity ? 'Build and check an order' : 'Set up trading account'}<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
      <section className="panel case-start-card"><ScanLine size={23} aria-hidden="true" /><h2>Explain an existing transaction</h2><p>Paste a testnet hash. Inspect supported direct or delegated place, cancel and reduce calls without wallet access.</p>
        <ul className="case-benefits"><li>Canonical receipt and actual gas</li><li>Matching fill events and current remainder</li><li>What is observed, what is unknown and what to check next</li></ul>
        <Link className="button secondary" to="/executions">Open transaction inspector<ArrowRight size={16} aria-hidden="true" /></Link>
        <p className="coverage-note">Smart-account batches and arbitrary router calls remain unsupported. A report never authorizes a resend.</p>
      </section>
    </div>
    <section className="panel case-finish"><FileCheck2 size={22} aria-hidden="true" /><div><h2>Finish with a verifiable case</h2><p>Follow the report to Positions or Risk Lab, return to the same hash, then download the evidence. No keys or signatures are exported.</p></div><Link className="text-link" to="/test-lab">Open testing scenarios</Link></section>
    <section className="panel case-recent"><h2>Continue a local attempt</h2><LocalActivity limit={3} /></section>
  </>;
}
