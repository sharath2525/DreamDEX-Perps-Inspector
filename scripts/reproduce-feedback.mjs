import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Offline diagnostic only: no wallet, network, signing, or chain writes.
const dist = dirname(fileURLToPath(import.meta.resolve('@somnia-chain/markets-sdk')));
const pkg = JSON.parse(await readFile(resolve(dist, '../package.json'), 'utf8'));
assert.equal(pkg.version, '0.32.1', 'Re-review candidates before testing another SDK version.');
const declaration = await readFile(resolve(dist, 'trade.d.ts'), 'utf8');
const source = ts.createSourceFile('trade.d.ts', declaration, ts.ScriptTarget.Latest, true);
const trader = source.statements.find(node => (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name?.text === 'Trader');
assert.ok(trader, 'Expected Trader declaration not found');
const methods = trader.members.filter(node => ts.isMethodDeclaration(node) || ts.isMethodSignature(node)).map(node => node.name.getText(source));
const params = source.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'PlacePerpOrderParams');
assert.ok(params);
const paramNames = params.members.map(node => node.name?.getText(source));
const { makeGenesisCheck } = await import(pathToFileURL(resolve(dist, 'client.js')).href);
async function observe(label, getBlock) {
  const check = makeGenesisCheck(50383, { getBlock });
  try { await check(); return { label, outcome: 'resolved' }; }
  catch (error) { return { label, outcome: 'rejected', name: error.name, message: error.message, cause: error.cause?.message ?? null }; }
}
const observations = await Promise.all([
  observe('CONTROLLED transport refusal; no endpoint was contacted', async () => { throw new Error('Controlled WebSocket transport refused'); }),
  observe('CONTROLLED retired block-1 hash', async () => ({ hash: '0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae' })),
  observe('CONTROLLED non-retired hash; not a live chain observation', async () => ({ hash: `0x${'12'.repeat(32)}` })),
]);
assert.equal(observations[0].outcome, 'rejected');
assert.match(observations[0].message, /genesis check failed/);
assert.equal(observations[0].cause, 'Controlled WebSocket transport refused');
assert.equal(observations[1].outcome, 'rejected');
assert.match(observations[1].message, /retired/);
assert.equal(observations[2].outcome, 'resolved');
const fundingCommentPresent = declaration.includes('no escrow\n *  transfer in this tx') || /no escrow\s*\r?\n\s*\*\s*transfer in this tx/.test(declaration);
assert.ok(fundingCommentPresent);
const report = {
  observedAt: new Date().toISOString(), mode: 'OFFLINE_CONTROLLED_INPUTS_NO_NETWORK_NO_SIGNER',
  sdkVersion: pkg.version, node: process.version, declarationSha256: createHash('sha256').update(declaration).digest('hex'),
  fundingDocumentation: { status: 'STALE_COMMENT_CONFIRMED_IN_PINNED_PACKAGE', source: 'dist/trade.d.ts: PlacePerpOrderParams', fundingCommentPresent, liveAutoPullTransactionTested: false },
  delegatedSurface: { status: 'FEATURE_REQUEST_NOT_PROTOCOL_BUG', perpMethods: methods.filter(name => /perp/i.test(name)), requestedNamesAbsent: ['placePerpOrderFor', 'cancelPerpOrderFor', 'reducePerpOrderFor'].filter(name => !methods.includes(name)), placementHasOwner: paramNames.includes('owner'), rawContractRouteExists: true },
  genesisDiagnostics: { status: 'KNOWN_DOCUMENTED_BEHAVIOR_WITH_RETAINED_CAUSE', observations, conclusion: 'Transport and retired-genesis failures have distinct error types/messages; the original transport cause is retained. Do not claim loss of cause or a new outage bug.' },
  limitations: 'No transaction evidence, organizer acceptance, duplicate clearance, latest-version claim, or exploitability claim. Internal module import is for isolated reproduction only, not an application integration API.',
};
await mkdir('docs/research', { recursive: true });
await writeFile('docs/research/feedback-reproduction.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
