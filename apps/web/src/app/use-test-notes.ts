import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { encodeTestBackup, readTestBackup, testKeys, type TestNotes, type TestScope } from './manual-test-store';

/** Only the scoped test-note keys are written. Trading journals are never touched. */
export function useTestNotes(scope: TestScope) {
  const [initial] = useState(() => readTestBackup(scope));
  const [results, setResults] = useState(initial.results);
  const [legacySeen, setLegacySeen] = useState(initial.conflicts.length ? initial.legacySeen : initial.legacyRaw);
  const [migrationPending, setMigrationPending] = useState(initial.conflicts.length > 0);
  const [message, setMessage] = useState(initial.error || (initial.conflicts.length ? 'Earlier tab notes differ from the durable backup. Review the merge before saving.' : 'Preparing local backup…'));
  const [blocked, setBlocked] = useState(!!initial.error);
  const expected = useRef(initial.raw);
  const revision = useRef(initial.revision);
  const queue = useRef(Promise.resolve());
  const keys = testKeys(scope);
  const { owner, signer } = scope;
  useEffect(() => {
    if (blocked || migrationPending) return;
    // Serialize this tab's saves; Web Locks make the comparison atomic across tabs.
    queue.current = queue.current.then(async () => {
      try {
        if (!navigator.locks) throw new Error('Safe local saving is unavailable in this browser. Download the report before leaving.');
        await navigator.locks.request(keys.durable, () => {
          if (localStorage.getItem(keys.durable) !== expected.current) throw new Error('Another tab changed this backup. Your edits remain here. Export them, then reload and import to review differences.');
          const previous = expected.current ? JSON.parse(expected.current) : null;
          if (previous && JSON.stringify(previous.cases) === JSON.stringify(results) && previous.legacySeen === legacySeen) {
            setMessage('Saved on this browser/device. Export for a portable backup.');
            return;
          }
          const next = encodeTestBackup({ owner, signer }, results, revision.current + 1, legacySeen);
          localStorage.setItem(keys.durable, next);
          if (localStorage.getItem(keys.durable) !== next) throw new Error('Local saving could not be verified. Download your report before leaving.');
          expected.current = next; revision.current++;
          setMessage('Saved on this browser/device. Export for a portable backup.');
        });
      } catch (error) { setBlocked(true); setMessage(error instanceof Error ? error.message : 'Local saving failed. Download your report before leaving.'); }
    });
  }, [results, legacySeen, migrationPending, blocked, keys.durable, owner, signer]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if ((event.key === keys.durable || event.key === null) && event.newValue !== expected.current) {
        setBlocked(true); setMessage('Another tab changed this backup. Your edits remain here. Export them, then reload and import to review differences.');
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [keys.durable]);
  function update(next: SetStateAction<TestNotes>) { if (!blocked) setMessage('Saving local notes…'); setResults(next); }
  function merge(next: TestNotes) { update(next); setLegacySeen(initial.legacyRaw); setMigrationPending(false); }
  async function clear() {
    await queue.current;
    try {
      if (!navigator.locks) throw new Error('Safe clearing is unavailable. Use browser site-data controls after exporting.');
      await navigator.locks.request(keys.durable, () => {
        if (localStorage.getItem(keys.durable) !== expected.current) throw new Error('Backup changed in another tab. Reload before clearing it.');
        // Preserve the original legacy data unless the user explicitly confirms this clear.
        sessionStorage.removeItem(keys.legacy);
        localStorage.removeItem(keys.durable);
        expected.current = null; revision.current = 0;
        setResults({}); setLegacySeen(null); setMigrationPending(false); setBlocked(false);
        setMessage('Test notes cleared for this account context. Trading journals are unchanged.');
      });
      return true;
    } catch (error) { setBlocked(true); setMessage(error instanceof Error ? error.message : 'Could not clear notes.'); return false; }
  }
  return { results, setResults: update, initial, migrationPending, merge, clear, blocked, message };
}
