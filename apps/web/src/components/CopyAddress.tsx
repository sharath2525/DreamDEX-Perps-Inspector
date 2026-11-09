import { useState } from 'react';
import { Copy } from 'lucide-react';

export function CopyAddress({ address, label }: { address: string; label: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(address); setMessage('Copied'); }
    catch { setMessage('Copy unavailable. Select the full address above.'); }
  }
  return <span className="copy-address"><button type="button" className="icon-button" aria-label={`Copy ${label}`} onClick={() => void copy()}><Copy size={15} aria-hidden="true" /></button><span role="status">{message}</span></span>;
}
