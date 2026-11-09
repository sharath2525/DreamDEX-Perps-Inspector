import { getAddress, isAddress, type Address } from 'viem';
import { PERPS_CONFIG } from './config';
import { indexed, readError, verifyDeployment } from './read';

/** Indexed candidates only. Neither discovery nor storage establishes trading authority. */
export async function discoverTradingAccounts(signer: Address, signal: AbortSignal) {
  await verifyDeployment(signal);
  const pending = Promise.allSettled([
    indexed(signal, client => client.accounts.listDerivedAccounts(signer)),
    indexed(signal, client => client.accounts.listControlledAccounts(signer)),
  ]);
  // The accounts indexer does not accept the markets client's abort signal.
  // Bound the UI wait even when its transport is still settling in the background.
  let abortRead: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    abortRead = () => reject(signal.reason ?? new Error('Account discovery interrupted.'));
    if (signal.aborted) abortRead(); else signal.addEventListener('abort', abortRead, { once: true });
  });
  const reads = await Promise.race([pending, interrupted]).finally(() => signal.removeEventListener('abort', abortRead));
  const candidates = new Map<string, { address: Address; sources: string[] }>();
  const warnings: string[] = [];
  reads.forEach((read, index) => {
    const source = index === 0 ? 'Derived account index' : 'Controlled account index';
    if (read.status === 'rejected') { warnings.push(`${source} unavailable: ${readError(read.reason)}`); return; }
    for (const row of read.value) {
      if (row.chainId !== PERPS_CONFIG.chainId || !isAddress(row.address) || /^0x0{40}$/i.test(row.address)) continue;
      const key = row.address.toLowerCase();
      const candidate = candidates.get(key) ?? { address: getAddress(row.address), sources: [] };
      candidate.sources.push(source); candidates.set(key, candidate);
    }
  });
  return { candidates: [...candidates.values()].slice(0, 50), warnings,
    truncated: candidates.size > 50, observedAt: Date.now(),
    coverage: 'Owner and derived-account indexes only. Operator-linked accounts may not appear. Enter the trading address once if missing.' };
}

export async function readSignerGas(signer: Address, signal: AbortSignal) {
  const deployment = await verifyDeployment(signal);
  return { value: await deployment.client.getBalance({ address: signer, blockNumber: deployment.blockNumber }), block: deployment.blockNumber };
}
