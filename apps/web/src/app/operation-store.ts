import { useSyncExternalStore } from 'react';
import { isAddress, type Address, type Hash, type Hex } from 'viem';
import { PERPS_CONFIG, operationKinds, type OperationKind } from '@pei/perps-adapter';
export interface OperationRecord { id: string; nonce: number; kind: OperationKind; owner: Address; actor: Address; to: Address; data: Hex; value: string; createdAt: number; status: 'awaiting-wallet' | 'unknown' | 'submitted' | 'rejected' | 'confirmed' | 'reverted'; hash?: Hash; receiptBlock?: string; receiptHash?: Hash }
const KEY = `pei.operations.v1.${PERPS_CONFIG.chainId}.${PERPS_CONFIG.genesisHash}`;
function snapshot() { try { return localStorage.getItem(KEY) ?? '[]'; } catch { return '!unavailable'; } }
export function readOperations(raw = snapshot()): OperationRecord[] {
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('Operation journal is unavailable or over its bound. Export and repair before sending.');
  for (const row of rows) if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(row.id) || !Number.isSafeInteger(row.nonce) || row.nonce < 0 || !operationKinds.includes(row.kind) || ![row.owner, row.actor, row.to].every(value => typeof value === 'string' && isAddress(value)) || typeof row.data !== 'string' || !/^0x(?:[a-f0-9]{2})+$/i.test(row.data) || row.data.length > 20000 || typeof row.value !== 'string' || !/^\d+$/.test(row.value) || !Number.isSafeInteger(row.createdAt) || !['awaiting-wallet', 'unknown', 'submitted', 'rejected', 'confirmed', 'reverted'].includes(row.status) || (row.hash !== undefined && !/^0x[0-9a-f]{64}$/i.test(row.hash))) throw new Error('Operation journal is invalid. Sends are blocked.');
  // Explicit fields keep arbitrary localStorage additions out of exported records.
  return rows.map(row => ({ id: row.id, nonce: row.nonce, kind: row.kind, owner: row.owner, actor: row.actor, to: row.to, data: row.data, value: row.value, createdAt: row.createdAt, status: row.status, ...(row.hash ? { hash: row.hash } : {}), ...(typeof row.receiptBlock === 'string' && /^\d+$/.test(row.receiptBlock) ? { receiptBlock: row.receiptBlock } : {}), ...(typeof row.receiptHash === 'string' && /^0x[0-9a-f]{64}$/i.test(row.receiptHash) ? { receiptHash: row.receiptHash } : {}) }));
}
export function unresolvedOperations(address: Address) { return readOperations().some(row => [row.owner, row.actor].some(value => value.toLowerCase() === address.toLowerCase()) && ['awaiting-wallet', 'unknown', 'submitted'].includes(row.status)); }
export async function saveOperation(row: OperationRecord) {
  if (!navigator.locks) throw new Error('Cross-tab locking is required.');
  await navigator.locks.request('pei-operation-journal', async () => { const rows = readOperations(); const found = rows.findIndex(value => value.id === row.id); if (found >= 0) rows[found] = row; else rows.unshift(row); const raw = JSON.stringify(rows); readOperations(raw); localStorage.setItem(KEY, raw); if (localStorage.getItem(KEY) !== raw) throw new Error('Operation journal did not persist.'); window.dispatchEvent(new Event('pei-operations-changed')); });
}
function subscribe(update: () => void) { window.addEventListener('storage', update); window.addEventListener('pei-operations-changed', update); return () => { window.removeEventListener('storage', update); window.removeEventListener('pei-operations-changed', update); }; }
export function useOperations() { const raw = useSyncExternalStore(subscribe, snapshot); try { return { rows: readOperations(raw), error: '' }; } catch { return { rows: [], error: 'Operation journal unavailable. Do not send again until unresolved outcomes are recovered.' }; } }

