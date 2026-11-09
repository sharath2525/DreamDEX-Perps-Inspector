import { build } from 'vite';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isAddress } from 'viem';

const input = process.argv[2];
if (!input || (!isAddress(input) && !/^0x[\da-f]{64}$/i.test(input))) throw new Error('Usage: node scripts/verify-report.mjs <public-owner-or-transaction-hash>. Read only; never pass keys.');
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/index.ts', outDir: 'test-results/report-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'adapter.mjs' } } } });
const api = await import(pathToFileURL(resolve('test-results/report-adapter/adapter.mjs')).href);
const evidence = { observedAt: new Date().toISOString(), mode: 'PUBLIC_CHAIN_INSPECTION_NO_SIGNER', origin: 'UNKNOWN_FRONTEND_NOT_PEI_BUILD_PROOF', input, historyCoverage: null, inspections: [] };
try {
  let hashes = [input];
  if (isAddress(input)) {
    const page = await api.readHistoryPage({ owner: input, kind: 'orders' }, 0, null, AbortSignal.timeout(45000));
    evidence.historyCoverage = { rowsReturned: page.rows.length, head: page.head, processed: page.processed, limit: 'First page only; inspect at most three distinct placement transactions.' };
    hashes = [...new Set(page.rows.map(row => row.txHash))].slice(0, 3);
  }
  for (const hash of hashes) {
    try {
      const report = await api.inspectTransaction(hash, 50383, AbortSignal.timeout(45000));
      evidence.inspections.push(report);
      if (report.state === 'mined') break;
    } catch (error) { evidence.inspections.push({ hash, state: 'unresolved', reason: api.readError(error) }); }
  }
  evidence.status = evidence.inspections.some(report => report.state === 'mined') ? 'LIVE_READ_VERIFIED' : 'INCONCLUSIVE';
} catch (error) { evidence.status = 'INCONCLUSIVE'; evidence.reason = api.readError(error); }
await writeFile('docs/research/part2-public-report-live.json', api.evidenceJson(evidence));
console.log(JSON.stringify({ status: evidence.status, mode: evidence.mode, origin: evidence.origin, reason: evidence.reason, inspections: evidence.inspections.map(report => ({ hash: report.hash, state: report.state, outcome: report.outcome, reason: report.reason })) }));
if (evidence.status !== 'LIVE_READ_VERIFIED') process.exitCode = 1;
