import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/index.ts', outDir: 'test-results/history-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'adapter.mjs' } } } });
const api = await import(pathToFileURL(resolve('test-results/history-adapter/adapter.mjs')).href);
const owner = JSON.parse(await readFile('docs/research/parts6-7-live.json', 'utf8')).owner;
const report = { timestamp: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_NO_SIGNER', owner, checks: {} };
for (const kind of ['orders', 'fills', 'funding', 'margin']) {
  try { const first = await api.readHistoryPage({ owner, kind }, 0, null, AbortSignal.timeout(45000)); const pages = [first]; if (first.hasMore) pages.push(await api.readHistoryPage({ owner, kind }, 1, first.nextCursor, AbortSignal.timeout(45000)));
    const rows = api.mergeHistory(pages); report.checks[kind] = { status: 'PASS', evidence: api.historyEvidence(pages, rows, { pool: '', from: '', to: '' }) }; console.log(kind, 'PASS', rows.length); }
  catch (error) { report.checks[kind] = { status: 'INCONCLUSIVE', reason: api.readError(error) }; console.log(kind, 'INCONCLUSIVE', api.readError(error)); process.exitCode = 1; }
  await writeFile('docs/research/part8-live.json', api.evidenceJson(report));
}
