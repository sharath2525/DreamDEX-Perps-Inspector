import { PERPS_CONFIG, PREFLIGHT_TTL_MS, prepareOrder, prepareCancellation, sameAddress, type PreparedOrder, type PreparedCancellation } from '@pei/perps-adapter';
import { toHex, type Address, type Hash } from 'viem';
import type { WalletProvider } from './account-context';
import { newAttempt, readAttempts, saveAttempt, type Attempt } from './execution-store';
import { unresolvedOperations } from './operation-store';

export async function checkWallet(provider: WalletProvider, owner: Address) {
  const [accounts, chain, genesis] = await Promise.all([provider.request({ method: 'eth_accounts' }), provider.request({ method: 'eth_chainId' }), provider.request({ method: 'eth_getBlockByNumber', params: ['0x0', false] })]);
  if (typeof chain !== 'string' || Number(chain) !== PERPS_CONFIG.chainId || !Array.isArray(accounts) || typeof accounts[0] !== 'string' || !sameAddress(accounts[0], owner)) throw new Error('Wallet account or network changed. Reconnect and review again.');
  if (!genesis || typeof genesis !== 'object' || !('hash' in genesis) || typeof genesis.hash !== 'string' || genesis.hash.toLowerCase() !== PERPS_CONFIG.genesisHash) throw new Error('Wallet genesis differs from the verified testnet. Sending is blocked.');
}
/** Direct-order send boundary. Account operations use send-operation.ts with shared locks. */
export async function sendReviewed(prepared: PreparedOrder | PreparedCancellation, provider: WalletProvider, stillCurrent: () => boolean, onAttempt: (attempt: Attempt) => void) {
  if (!navigator.locks) throw new Error('This browser lacks the cross-tab lock required for safe submission.');
  const owner = prepared.kind === 'place' ? prepared.intent.owner : prepared.owner;
  return navigator.locks.request(`pei-send-${PERPS_CONFIG.chainId}-${owner.toLowerCase()}`, { ifAvailable: true }, async lock => {
    if (!lock) throw new Error('Another tab is preparing or sending an order for this wallet.');
    if (unresolvedOperations(owner)) throw new Error('An account operation has an unresolved outcome. Inspect Account operations first.');
    if (readAttempts().some(row => sameAddress(row.owner, owner) && ['awaiting-wallet', 'submitted', 'unknown'].includes(row.status))) throw new Error('An earlier attempt has an unresolved outcome. Inspect it before another send.');
    if (!stillCurrent() || Date.now() - prepared.checkedAt > PREFLIGHT_TTL_MS) throw new Error('Review expired or inputs changed. Run preflight again.');
    await checkWallet(provider, owner);
    const signal = AbortSignal.timeout(35_000);
    const fresh = prepared.kind === 'place' ? await prepareOrder(prepared.draft, signal, prepared.intent)
      : await prepareCancellation(owner, prepared.pool, prepared.orderId, prepared.gasBudget, signal);
    if (fresh.call.data !== prepared.call.data || fresh.gasLimit > prepared.gasLimit || fresh.gasPrice > prepared.gasPrice) throw new Error('Calldata or gas requirements changed. Review a new preflight.');
    if (prepared.kind === 'place' && fresh.kind === 'place' && (fresh.margin.lockAmount > prepared.margin.lockAmount || fresh.margin.ownWalletPull > prepared.margin.ownWalletPull || fresh.margin.mainWalletPull > prepared.margin.mainWalletPull)) throw new Error('Margin or wallet funding increased. Review a new preflight.');
    await checkWallet(provider, owner);
    if (!stillCurrent()) throw new Error('Account or order changed while checking. No signature was requested.');
    let attempt = newAttempt({ ...fresh, gasLimit: prepared.gasLimit, gasPrice: prepared.gasPrice });
    await saveAttempt(attempt); // Must succeed BEFORE opening the wallet.
    onAttempt(attempt);
    try {
      const hash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: owner, to: fresh.call.to, data: fresh.call.data,
        value: '0x0', chainId: toHex(PERPS_CONFIG.chainId), gas: toHex(prepared.gasLimit), gasPrice: toHex(prepared.gasPrice) }] });
      if (typeof hash !== 'string' || !/^0x[\da-f]{64}$/i.test(hash)) throw new Error('Wallet returned no valid transaction hash. Outcome unknown.');
      attempt = { ...attempt, status: 'submitted', hash: hash as Hash, timeline: [...(attempt.timeline ?? []), { stage: 'hash-returned', at: Date.now(), hash }] };
    } catch (error) {
      const rejected = typeof error === 'object' && error !== null && 'code' in error && error.code === 4001;
      attempt = { ...attempt, status: rejected ? 'rejected' : 'unknown', timeline: [...(attempt.timeline ?? []), { stage: rejected ? 'wallet-rejected' : 'outcome-unknown', at: Date.now() }], error: rejected ? 'Wallet rejected the request. No automatic retry.' : 'Wallet or transport failed. A transaction may have been broadcast. Inspect wallet activity; do not resend blindly.' };
    }
    onAttempt(attempt); // Retain hash in the mounted UI even if storage becomes unavailable.
    try { await saveAttempt(attempt); }
    catch { throw new Error(`Transaction outcome: ${attempt.status}. Copy this hash before leaving: ${attempt.hash ?? 'not returned'}. Browser storage failed; the earlier journal entry remains unresolved.`); }
    return attempt;
  });
}
