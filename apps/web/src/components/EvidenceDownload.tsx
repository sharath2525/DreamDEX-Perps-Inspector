import { useState } from 'react';
import { evidenceJson, evidenceMarkdown } from '@pei/perps-adapter';

export function EvidenceDownload({ value, name = 'execution', label = 'evidence' }: { value: unknown; name?: string; label?: string }) {
  const [message, setMessage] = useState('');
  function download(markdown: boolean) {
    try {
      const text = markdown ? evidenceMarkdown(value) : evidenceJson(value);
      const url = URL.createObjectURL(new Blob([text], { type: markdown ? 'text/markdown;charset=utf-8' : 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `pei-${name.replace(/[^a-z0-9-]/gi, '').slice(0, 60)}.${markdown ? 'md' : 'json'}`;
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Evidence download prepared. Review public addresses and scope before sharing.');
    } catch { setMessage('Download unavailable. Try a browser with file downloads enabled.'); }
  }
  return <div className="evidence-download"><p>Exports include public addresses, normalized intent and observations. No keys, signatures or wallet sessions. Nothing is submitted automatically.</p><div className="input-actions"><button className="button secondary" onClick={() => download(false)}>Download JSON {label}</button><button className="button secondary" onClick={() => download(true)}>Download Markdown {label}</button></div><p role="status">{message}</p></div>;
}
