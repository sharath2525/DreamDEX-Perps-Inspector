import { isAddress } from 'viem';
import { PERPS_CONFIG } from '@pei/perps-adapter';

export const testStatuses = ['NOT RUN', 'PASS', 'FAIL', 'BLOCKED', 'SKIPPED'] as const;
export const issueKinds = ['Unclassified', 'PEI application', 'Expected restriction', 'Service failure', 'Possible upstream issue'] as const;
export type TestStatus = typeof testStatuses[number];
export interface TestEnvironment { capturedAt: string; sdkVersion: string; chainId: number; walletChainId: number | null; browser: string; route: string; block?: string; observedAt?: number }
export interface TestNote { status: TestStatus; notes: string; updatedAt?: number; category?: typeof issueKinds[number]; environment?: TestEnvironment }
export type TestNotes = Record<string, TestNote>;
export interface TestScope { owner: string | null; signer: string | null }
interface Backup { schema: 'pei-manual-backup-v2'; scope: TestScope; revision: number; cases: TestNotes; legacySeen: string | null }
export const scenarioIds = Array.from({ length: 24 }, (_, i) => `U${String(i + 1).padStart(2, '0')}`);
export function testKeys(scope: TestScope) {
  const suffix = `${PERPS_CONFIG.chainId}.${scope.signer?.toLowerCase() ?? 'viewer'}.${scope.owner?.toLowerCase() ?? 'none'}`;
  return { legacy: `pei.manual-tests.v1.${suffix}`, durable: `pei.manual-tests.v2.${suffix}` };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a report object.');
  return value as Record<string, unknown>;
}
function address(value: unknown) { return value === null || (typeof value === 'string' && isAddress(value)); }
export function sameScope(a: TestScope, b: TestScope) { return a.owner?.toLowerCase() === b.owner?.toLowerCase() && a.signer?.toLowerCase() === b.signer?.toLowerCase(); }
function note(value: unknown): TestNote {
  const row = object(value);
  if (!testStatuses.includes(row.status as TestStatus) || typeof row.notes !== 'string' || row.notes.length > 5000) throw new Error('Invalid test status or notes longer than 5,000 characters.');
  const result: TestNote = { status: row.status as TestStatus, notes: row.notes };
  if (row.updatedAt !== undefined) {
    if (typeof row.updatedAt !== 'number' || !Number.isSafeInteger(row.updatedAt) || row.updatedAt < 0) throw new Error('Invalid note timestamp.');
    result.updatedAt = row.updatedAt;
  }
  if (row.category !== undefined) {
    if (!issueKinds.includes(row.category as typeof issueKinds[number])) throw new Error('Unknown issue classification.');
    result.category = row.category as typeof issueKinds[number];
  }
  if (row.environment !== undefined) {
    const env = object(row.environment);
    if (typeof env.capturedAt !== 'string' || !Number.isFinite(Date.parse(env.capturedAt)) || env.chainId !== PERPS_CONFIG.chainId || typeof env.sdkVersion !== 'string' || env.sdkVersion.length > 40 || typeof env.browser !== 'string' || env.browser.length > 300 || typeof env.route !== 'string' || env.route.length > 200 || !(env.walletChainId === null || Number.isSafeInteger(env.walletChainId))) throw new Error('Invalid captured environment.');
    if (env.block !== undefined && (typeof env.block !== 'string' || !/^\d{1,80}$/.test(env.block))) throw new Error('Invalid snapshot block.');
    if (env.observedAt !== undefined && (typeof env.observedAt !== 'number' || !Number.isSafeInteger(env.observedAt))) throw new Error('Invalid snapshot time.');
    result.environment = { capturedAt: env.capturedAt, sdkVersion: env.sdkVersion, chainId: env.chainId, walletChainId: env.walletChainId as number | null, browser: env.browser, route: env.route, ...(typeof env.block === 'string' ? { block: env.block } : {}), ...(typeof env.observedAt === 'number' ? { observedAt: env.observedAt } : {}) };
  }
  return result;
}
function notes(value: unknown): TestNotes {
  const rows = object(value);
  if (Object.keys(rows).some(id => !scenarioIds.includes(id))) throw new Error('Unknown scenario ID; this report is not compatible with U01–U12.');
  return Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, note(row)]));
}
export function sameNote(a: TestNote, b: TestNote) { return a.status === b.status && a.notes === b.notes && a.category === b.category && JSON.stringify(a.environment) === JSON.stringify(b.environment); }
export function readTestBackup(scope: TestScope) {
  const keys = testKeys(scope);
  let raw: string | null = null, legacyRaw: string | null = null;
  let saved: TestNotes = {}, legacy: TestNotes = {}, revision = 0, legacySeen: string | null = null;
  const errors: string[] = [];
  try {
    raw = localStorage.getItem(keys.durable);
    if (raw) {
      const row = object(JSON.parse(raw));
      const identity = object(row.scope);
      if (row.schema !== 'pei-manual-backup-v2' || !address(identity.owner) || !address(identity.signer) || !sameScope(identity as unknown as TestScope, scope) || !Number.isSafeInteger(row.revision) || (row.revision as number) < 0 || !(row.legacySeen === null || (typeof row.legacySeen === 'string' && row.legacySeen.length < 150000))) throw new Error('Invalid backup identity/version.');
      saved = notes(row.cases); revision = row.revision as number; legacySeen = row.legacySeen as string | null;
    }
  } catch { errors.push('Browser backup is unavailable or invalid. It will not be overwritten. Export your working notes before repair.'); }
  try {
    legacyRaw = sessionStorage.getItem(keys.legacy);
    if (legacyRaw && legacyRaw !== legacySeen) legacy = notes(JSON.parse(legacyRaw));
  } catch { errors.push('Earlier tab notes could not be read safely. They have been left untouched.'); }
  const conflicts = Object.keys(legacy).filter(id => saved[id] && !sameNote(saved[id]!, legacy[id]!));
  const merged = { ...legacy, ...saved };
  return { raw, results: merged, legacy, legacyRaw, legacySeen, conflicts, revision, error: errors.join(' ') };
}
export function encodeTestBackup(scope: TestScope, cases: TestNotes, revision: number, legacySeen: string | null) {
  const value: Backup = { schema: 'pei-manual-backup-v2', scope, cases: notes(cases), revision, legacySeen };
  return JSON.stringify(value);
}
export function parseTestImport(text: string, scope: TestScope): TestNotes {
  if (text.length > 250000) throw new Error('Report exceeds the 250 KB import limit.');
  const report = object(JSON.parse(text));
  if (report.schema !== 'pei-manual-tests-v1' || report.chainId !== PERPS_CONFIG.chainId || !address(report.owner) || !address(report.signer)) throw new Error('Choose a PEI guided-tests JSON report for chain 50383.');
  if (!sameScope({ owner: report.owner as string | null, signer: report.signer as string | null }, scope)) throw new Error('This report belongs to a different signer or trading account. Select that same account context before importing.');
  if (!Array.isArray(report.cases) || report.cases.length > scenarioIds.length) throw new Error('Invalid scenario list.');
  const result: TestNotes = {};
  for (const value of report.cases) {
    const row = object(value);
    if (typeof row.id !== 'string' || !scenarioIds.includes(row.id) || result[row.id]) throw new Error('Unknown or duplicate scenario ID.');
    result[row.id] = note({ ...row, notes: row.observations });
  }
  return result;
}
