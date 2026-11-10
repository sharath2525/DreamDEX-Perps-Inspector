import { build } from 'vite';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { isAddress } from 'viem';

// Public reads only. Usage: node scripts/verify-account-discovery.mjs <signer> <expected-account>
const [signer, expected] = process.argv.slice(2);
if (!isAddress(signer ?? '') || !isAddress(expected ?? '')) throw Error('Provide two public addresses.');
await build({ configFile: false, logLevel: 'warn', build: { ssr: 'packages/perps-adapter/src/accounts.ts', outDir: 'test-results/discovery-adapter', emptyOutDir: false, rolldownOptions: { output: { entryFileNames: 'accounts.mjs' } } } });
const { discoverTradingAccounts } = await import(pathToFileURL(resolve('test-results/discovery-adapter/accounts.mjs')).href);
const started = Date.now();
const result = await discoverTradingAccounts(signer, AbortSignal.timeout(18000));
const found = result.candidates.find(row => row.address.toLowerCase() === expected.toLowerCase());
const evidence = { observedAt: new Date().toISOString(), mode: 'PUBLIC_READ_ONLY_NO_SIGNER', elapsedMs: Date.now() - started, signer, expected, found: !!found, linkedPermissionVerified: found?.verification === 'linked', result };
await writeFile('docs/research/account-discovery-live.json', JSON.stringify(evidence, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2));
console.log(JSON.stringify({ found: evidence.found, linkedPermissionVerified: evidence.linkedPermissionVerified, autoSelect: result.autoSelect, elapsedMs: evidence.elapsedMs, warnings: result.warnings }));
if (!evidence.found || !evidence.linkedPermissionVerified) process.exitCode = 1;
