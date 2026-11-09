import { useSyncExternalStore } from 'react';
import { isAddress, type Address, type Hash, type Hex } from 'viem';
import { PERPS_CONFIG, timelineStages, type TimelineEvent, type PreflightEvidence, type ReplacementEvidence, type PreparedOrder, type PreparedCancellation } from '@pei/perps-adapter';

export type AttemptStatus = 'awaiting-wallet' | 'submitted' | 'unknown' | 'rejected' | 'confirmed' | 'reverted' | 'replaced';
export interface Attempt {
  id: string; createdAt: number; kind: 'place' | 'cancel'; owner: Address; pool: Address; data: Hex;
  status: AttemptStatus; hash?: Hash; error?: string; orderId?: string;
  positionBefore: string; gasLimit: string; gasPrice: string;
  quantity?: string; price?: string; isBid?: boolean; baseDecimals?: number; quoteDecimals?: number;
  preflight?: PreflightEvidence; timeline?: TimelineEvent[]; replacement?: ReplacementEvidence;
}
const KEY = `pei.attempts.v1.${PERPS_CONFIG.chainId}.${PERPS_CONFIG.genesisHash}`;
const EVENT = 'pei-attempts-changed';
function snapshot() { try { return localStorage.getItem(KEY) ?? '[]'; } catch { return '!storage-unavailable'; } }
export function parseAttempts(raw: string): Attempt[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 1000) throw new Error('Execution journal is invalid or exceeds its limit. Back it up before repair.');
  for (const row of value) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^[\da-f-]{36}$/i.test(row.id) || !isAddress(row.owner ?? '') || !isAddress(row.pool ?? '') || !/^0x(?:[\da-f]{2})+$/i.test(row.data ?? '') || row.data.length > 4096 || !Number.isFinite(row.createdAt) || !['place', 'cancel'].includes(row.kind) || !['awaiting-wallet', 'submitted', 'unknown', 'rejected', 'confirmed', 'reverted', 'replaced'].includes(row.status) || (row.hash !== undefined && !/^0x[\da-f]{64}$/i.test(row.hash)) || !/^-?\d{1,80}$/.test(row.positionBefore ?? '') || !/^\d{1,80}$/.test(row.gasLimit ?? '') || !/^\d{1,80}$/.test(row.gasPrice ?? '') || (row.orderId !== undefined && !/^\d{1,39}$/.test(row.orderId))) throw new Error('Execution journal contains an invalid record. Sending is blocked.');
    if ((row.error !== undefined && (typeof row.error !== 'string' || row.error.length > 1000)) || (row.isBid !== undefined && typeof row.isBid !== 'boolean') || ['price', 'quantity'].some(field => row[field] !== undefined && (typeof row[field] !== 'string' || !/^\d{1,80}$/.test(row[field]))) || ['baseDecimals', 'quoteDecimals'].some(field => row[field] !== undefined && (!Number.isInteger(row[field]) || row[field] < 0 || row[field] > 36))) throw new Error('Execution journal contains malformed metadata.');
    if (row.timeline !== undefined && (!Array.isArray(row.timeline) || row.timeline.length > 128 || row.timeline.some((event: TimelineEvent) => !event || !timelineStages.includes(event.stage) || !Number.isFinite(event.at) || (event.hash !== undefined && !/^0x[\da-f]{64}$/i.test(event.hash)) || (event.block !== undefined && !/^\d{1,80}$/.test(event.block))))) throw new Error('Execution timeline is invalid.');
    if (row.preflight !== undefined && (!row.preflight || !Number.isFinite(row.preflight.at) || ['block', 'gasBudget', 'maximumGasCost'].some(key => typeof row.preflight[key] !== 'string' || !/^\d{1,80}$/.test(row.preflight[key])) || ['marginLock', 'ownWalletPull', 'maximumQuantity'].some(key => row.preflight[key] !== undefined && (typeof row.preflight[key] !== 'string' || !/^\d{1,80}$/.test(row.preflight[key]))))) throw new Error('Preflight evidence is invalid.');
    if (row.replacement !== undefined && (!row.replacement || !['repriced', 'wallet-cancelled', 'different-call'].includes(row.replacement.kind) || !['success', 'reverted'].includes(row.replacement.receiptStatus) || !Number.isSafeInteger(row.replacement.nonce) || row.replacement.nonce < 0 || !Number.isFinite(row.replacement.observedAt) || !/^\d{1,80}$/.test(row.replacement.blockNumber) || ['hash', 'originalHash', 'blockHash'].some(key => typeof row.replacement[key] !== 'string' || !/^0x[\da-f]{64}$/i.test(row.replacement[key])))) throw new Error('Replacement evidence is invalid.');
  }
  if (new Set(value.map(row => row.id)).size !== value.length) throw new Error('Execution journal contains duplicate identifiers.');
  return value as Attempt[];
}
export function readAttempts(): Attempt[] { return parseAttempts(snapshot()); }
export async function saveAttempt(attempt: Attempt) {
  if (!navigator.locks) throw new Error('Execution journal requires browser locking support.');
  await navigator.locks.request(`${KEY}.journal`, () => {
  const records = readAttempts();
  const index = records.findIndex(row => row.id === attempt.id);
  if (index >= 0) {
    const previous = records[index]!;
    const timeline = [...new Map([...(previous.timeline ?? []), ...(attempt.timeline ?? [])].map(event => [`${event.stage}:${event.hash ?? ''}:${event.block ?? ''}`, event])).values()].sort((a, b) => a.at - b.at);
    records[index] = { ...previous, ...attempt, timeline, ...(previous.replacement && !attempt.replacement ? { replacement: previous.replacement, status: previous.status } : {}) };
  } else records.unshift(attempt);
  const raw = JSON.stringify(records);
  parseAttempts(raw);
  localStorage.setItem(KEY, raw);
  if (localStorage.getItem(KEY) !== raw) throw new Error('Execution journal could not be saved.');
  window.dispatchEvent(new Event(EVENT));
  });
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback); window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(EVENT, callback); };
}
export function useAttempts() {
  const raw = useSyncExternalStore(subscribe, snapshot);
  try { return { records: parseAttempts(raw), error: '' }; }
  catch (error) { return { records: [] as Attempt[], error: error instanceof Error ? error.message : 'Execution storage unavailable.' }; }
}
export function newAttempt(prepared: PreparedOrder | PreparedCancellation): Attempt {
  const base: Attempt = { id: crypto.randomUUID(), createdAt: Date.now(), kind: prepared.kind,
    owner: prepared.kind === 'place' ? prepared.intent.owner : prepared.owner, pool: prepared.call.to, data: prepared.call.data,
    status: 'awaiting-wallet', positionBefore: prepared.positionBefore.toString(), gasLimit: prepared.gasLimit.toString(), gasPrice: prepared.gasPrice.toString() };
  base.preflight = { at: prepared.checkedAt, block: prepared.blockNumber.toString(), gasBudget: prepared.gasBudget.toString(), maximumGasCost: prepared.maximumGasCost.toString(), ...(prepared.kind === 'place' ? { marginLock: prepared.margin.lockAmount.toString(), ownWalletPull: prepared.margin.ownWalletPull.toString(), maximumQuantity: prepared.maximum.maxQuantity.toString() } : {}) };
  base.timeline = [{ stage: 'preflight-passed', at: prepared.checkedAt }, { stage: 'review-confirmed', at: Date.now() }, { stage: 'wallet-requested', at: Date.now() }];
  return prepared.kind === 'place' ? { ...base, quantity: prepared.intent.quantity.toString(), price: prepared.intent.price.toString(), isBid: prepared.intent.isBid,
    baseDecimals: prepared.market.metadata.baseDecimals, quoteDecimals: prepared.market.decimals } : { ...base, orderId: prepared.orderId.toString() };
}
