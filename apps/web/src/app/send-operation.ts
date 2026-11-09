import { PERPS_CONFIG, PREFLIGHT_TTL_MS, prepareOperation, sameAddress, type PreparedOperation } from '@pei/perps-adapter';
import { toHex, type Hash } from 'viem';
import type { WalletProvider } from './account-context';
import { checkWallet } from './send-order';
import { readAttempts } from './execution-store';
import { saveOperation, unresolvedOperations, type OperationRecord } from './operation-store';
export async function sendOperation(prepared: PreparedOperation, provider: WalletProvider, current: () => boolean, onRecord: (record: OperationRecord) => void) {
  if (!navigator.locks) throw new Error('Cross-tab locking is required.');
  const { owner, actor } = prepared.draft;
  const locked = async () => {
    if (unresolvedOperations(owner) || unresolvedOperations(actor) || readAttempts().some(row => [owner, actor].some(address => sameAddress(row.owner, address)) && ['awaiting-wallet', 'submitted', 'unknown'].includes(row.status))) throw new Error('An earlier operation or order is unresolved. Inspect its outcome before sending.');
    if (!current() || Date.now() - prepared.checkedAt > PREFLIGHT_TTL_MS) throw new Error('Operation review expired or identity changed.');
    await checkWallet(provider, actor);
    const fresh = await prepareOperation(prepared.draft, AbortSignal.timeout(45000), prepared.expiry);
    if (!sameAddress(fresh.call.to, prepared.call.to) || fresh.call.data !== prepared.call.data || fresh.call.value !== prepared.call.value || fresh.nonce !== prepared.nonce || fresh.gasLimit > prepared.gasLimit || fresh.gasPrice > prepared.gasPrice) throw new Error('Operation, nonce or gas changed. Review a fresh preflight.');
    await checkWallet(provider, actor); if (!current()) throw new Error('Account or inputs changed.');
    let record: OperationRecord = { id: crypto.randomUUID(), kind: prepared.draft.kind, owner, actor, nonce: fresh.nonce, to: fresh.call.to, data: fresh.call.data, value: fresh.call.value.toString(), createdAt: Date.now(), status: 'awaiting-wallet' };
    await saveOperation(record); onRecord(record);
    try {
      const hash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: actor, to: fresh.call.to, data: fresh.call.data, value: toHex(fresh.call.value), nonce: toHex(fresh.nonce), chainId: toHex(PERPS_CONFIG.chainId), gas: toHex(prepared.gasLimit), gasPrice: toHex(prepared.gasPrice) }] });
      if (typeof hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('No valid transaction hash.');
      record = { ...record, status: 'submitted', hash: hash as Hash };
    } catch (caught) { record = { ...record, status: caught && typeof caught === 'object' && 'code' in caught && caught.code === 4001 ? 'rejected' : 'unknown' }; }
    onRecord(record);
    try { await saveOperation(record); } catch { throw new Error(`Storage failed after wallet request. Preserve hash ${record.hash ?? 'unknown'} and do not retry blindly.`); }
    return record;
  };
  // Sorted identity locks prevent reversed owner/operator pairs from deadlocking.
  const addresses = [...new Set([owner.toLowerCase(), actor.toLowerCase()])].sort();
  const acquire = (index: number): Promise<OperationRecord> => index === addresses.length ? locked() : navigator.locks.request(`pei-send-${PERPS_CONFIG.chainId}-${addresses[index]}`, { ifAvailable: true }, lock => { if (!lock) throw new Error('Another tab is preparing a transaction for this owner or actor.'); return acquire(index + 1); });
  return acquire(0);
}
