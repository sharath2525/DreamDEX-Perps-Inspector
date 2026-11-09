import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function NotFound() {
  return <><PageHeader eyebrow="PAGE NOT FOUND" title="This route isn’t in the workspace." description="Check the address or return to the overview." /><Link to="/" className="button primary"><ArrowLeft size={16} aria-hidden="true" />Back to overview</Link></>;
}
