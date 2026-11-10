import { getAddress, isAddress, zeroAddress, type Address } from 'viem';
import { PERPS_CONFIG } from './config';
import { indexed, readError, result, sameAddress, verifyDeployment } from './read';
import { bankAbi, factoryAbi, poolAbi } from './abi';
import { delegatedSelectors, operationsAbi, operatorRegistry } from './operations';

export interface TradingAccountCandidate {
  address: Address; sources: string[]; pools: Address[];
  verification: 'indexed' | 'linked' | 'not-authorized' | 'unavailable';
  permissionPool?: Address; block?: bigint;
  margin?: { unlocked: bigint; locked: bigint; activeMarkets: number; decimals: number };
  warning?: string;
}

async function boundedIndex<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  let abort = () => {};
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Account source timed out.')), 6000);
    abort = () => reject(signal.reason ?? new Error('Account discovery interrupted.'));
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
  try { return await Promise.race([operation, timeout]); }
  finally { clearTimeout(timer!); signal.removeEventListener('abort', abort); }
}

// Public Hasura schema verified against the official Hideki indexer, 2026-11-09.
// These rows discover candidates only. The pool remains the authority for access.
export const linkedAccountsQuery = `query LinkedTradingAccounts($operator:String!,$after:String!){
  OperatorApproval(where:{operator:{_eq:$operator},id:{_gt:$after}},order_by:{id:asc},limit:201){
    id user operator pool selector allowed isDenial updatedAt
  }
  chain_metadata(where:{chain_id:{_eq:50383}}){chain_id latest_processed_block}
}`;
export async function indexedLinkedAccounts(signer: Address, signal: AbortSignal) {
  const candidates = new Map<string, { address: Address; pools: Address[] }>();
  let after = '', truncated = false, processed: bigint | null = null;
  for (let page = 0; page < 5; page++) {
    const response = await fetch(PERPS_CONFIG.indexerUrl, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: linkedAccountsQuery, variables: { operator: signer.toLowerCase(), after } }), signal });
    if (!response.ok) throw new Error('Linked-account index unavailable.');
    const body = await response.json() as { errors?: unknown; data?: { OperatorApproval?: unknown[]; chain_metadata?: { chain_id: number; latest_processed_block: number | string }[] } };
    const rows = body.data?.OperatorApproval;
    if (body.errors || !Array.isArray(rows)) throw new Error('Linked-account index returned an unsupported response.');
    const height = body.data?.chain_metadata?.find(row => row.chain_id === PERPS_CONFIG.chainId)?.latest_processed_block;
    if (height !== undefined && /^\d+$/.test(String(height))) processed = BigInt(height);
    let previous = after;
    for (const value of rows.slice(0, 200)) {
      const row = value as Record<string, unknown>;
      if (!row || typeof row.id !== 'string' || row.id <= previous || typeof row.user !== 'string' || !isAddress(row.user) ||
        typeof row.operator !== 'string' || !sameAddress(row.operator, signer) || typeof row.pool !== 'string' || !isAddress(row.pool) ||
        typeof row.selector !== 'string' || typeof row.allowed !== 'boolean' || typeof row.isDenial !== 'boolean') throw new Error('Linked-account index rows could not be validated.');
      previous = row.id;
      if (sameAddress(row.user, zeroAddress) || sameAddress(row.user, signer) || !delegatedSelectors.some(selector => selector === row.selector)) continue;
      const key = row.user.toLowerCase(), candidate = candidates.get(key) ?? { address: getAddress(row.user), pools: [] };
      const pool = getAddress(row.pool);
      if (!candidate.pools.includes(pool)) candidate.pools.push(pool);
      candidates.set(key, candidate);
    }
    truncated = rows.length > 200;
    if (!truncated) break;
    after = previous;
  }
  return { candidates: [...candidates.values()], truncated, processed };
}

/** Indexed candidates only. Neither discovery nor storage establishes trading authority. */
export async function discoverTradingAccounts(signer: Address, signal: AbortSignal) {
  const deployment = await verifyDeployment(signal);
  const pending = Promise.allSettled([
    boundedIndex(indexed(signal, client => client.accounts.listDerivedAccounts(signer)), signal),
    boundedIndex(indexed(signal, client => client.accounts.listControlledAccounts(signer)), signal),
    boundedIndex(indexedLinkedAccounts(signer, signal), signal),
  ]);
  // The accounts indexer does not accept the markets client's abort signal.
  // Bound the UI wait even when its transport is still settling in the background.
  let abortRead: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    abortRead = () => reject(signal.reason ?? new Error('Account discovery interrupted.'));
    if (signal.aborted) abortRead(); else signal.addEventListener('abort', abortRead, { once: true });
  });
  const reads = await Promise.race([pending, interrupted]).finally(() => signal.removeEventListener('abort', abortRead));
  const candidates = new Map<string, TradingAccountCandidate>();
  const warnings: string[] = [];
  reads.slice(0, 2).forEach((read, index) => {
    const source = index === 0 ? 'Derived account index' : 'Controlled account index';
    if (read.status === 'rejected') { warnings.push(`${source} unavailable: ${readError(read.reason)}`); return; }
    for (const row of read.value as Awaited<ReturnType<import('@somnia-chain/markets-sdk').SomniaMarkets['client']['accounts']['listDerivedAccounts']>>) {
      if (row.chainId !== PERPS_CONFIG.chainId || !isAddress(row.address) || /^0x0{40}$/i.test(row.address)) continue;
      const key = row.address.toLowerCase();
      const candidate = candidates.get(key) ?? { address: getAddress(row.address), sources: [], pools: [], verification: 'indexed' as const };
      candidate.sources.push(source); candidates.set(key, candidate);
    }
  });
  const links = reads[2];
  let truncated = false;
  if (links.status === 'rejected') warnings.push(`Linked-account index unavailable: ${readError(links.reason)}`);
  else {
    truncated = links.value.truncated;
    if (links.value.processed === null || links.value.processed < deployment.blockNumber - 100n || links.value.processed > deployment.blockNumber + 10000n) warnings.push('Linked-account index freshness is uncertain; newly linked accounts may be missing.');
    for (const row of links.value.candidates) {
      const key = row.address.toLowerCase();
      const candidate = candidates.get(key) ?? { ...row, sources: [], verification: 'indexed' as const };
      candidate.pools = row.pools; candidate.sources.push('Trading permission index'); candidates.set(key, candidate);
    }
  }
  const { client, blockNumber } = deployment;
  const statuses = await client.readContract({ address: PERPS_CONFIG.factory, abi: factoryAbi, functionName: 'getPerpPoolStatuses', blockNumber });
  const official = statuses.map(row => row.perpPool);
  const checked = [...candidates.values()].slice(0, 20);
  // Four candidates at a time, at most 32 permission-market checks per candidate.
  for (let start = 0; start < checked.length; start += 4) await Promise.all(checked.slice(start, start + 4).map(async candidate => {
    signal.throwIfAborted(); candidate.block = blockNumber;
    const margin = await result(client.readContract({ address: PERPS_CONFIG.marginBank, abi: bankAbi, functionName: 'getAccountState', args: [candidate.address], blockNumber }));
    if (margin.ok) candidate.margin = { unlocked: margin.value.unlockedCollateralBalance, locked: margin.value.lockedCollateral, activeMarkets: margin.value.activePerpPools.length, decimals: deployment.decimals };
    else candidate.warning = 'Margin unavailable; no zero assumed.';
    if (!candidate.sources.includes('Trading permission index')) return;
    const pools = candidate.pools.some(pool => sameAddress(pool, zeroAddress)) ? official : official.filter(pool => candidate.pools.some(item => sameAddress(pool, item)));
    candidate.verification = 'not-authorized';
    let failed = false;
    for (const pool of pools.slice(0, 32)) {
      signal.throwIfAborted();
      const permission = await result((async () => {
        const [registry, bank] = await Promise.all([
          client.readContract({ address: pool, abi: operationsAbi, functionName: 'getOperatorPermissionsRegistry', blockNumber }),
          client.readContract({ address: pool, abi: poolAbi, functionName: 'marginBank', blockNumber }),
        ]);
        if (!sameAddress(registry, operatorRegistry) || !sameAddress(bank, PERPS_CONFIG.marginBank)) throw new Error('Unverified pool wiring.');
        return await Promise.all(delegatedSelectors.map(selector => client.readContract({ address: pool, abi: operationsAbi, functionName: 'isOperatorAuthorized', args: [candidate.address, signer, selector], blockNumber })));
      })());
      if (!permission.ok) { failed = true; continue; }
      if (permission.value.some(Boolean)) { candidate.verification = 'linked'; candidate.permissionPool = pool; break; }
    }
    if (candidate.verification !== 'linked' && (failed || pools.length > 32 || pools.length === 0)) candidate.verification = 'unavailable';
  }));
  truncated ||= candidates.size > 20;
  if (truncated) warnings.push('Discovery reached its bounded limit; additional accounts or grants may exist.');
  const ownMargin = await result(client.readContract({ address: PERPS_CONFIG.marginBank, abi: bankAbi, functionName: 'getAccountState', args: [signer], blockNumber }));
  const signerEmpty = ownMargin.ok && ownMargin.value.unlockedCollateralBalance === 0n && ownMargin.value.lockedCollateral === 0n && ownMargin.value.activePerpPools.length === 0;
  // Never switch away from a signer with its own funds/exposure, or an unreadable account.
  return { candidates: checked, warnings, truncated, observedAt: Date.now(), blockNumber,
    autoSelect: signerEmpty && !truncated && warnings.length === 0 && checked.length === 1 && checked[0]?.verification === 'linked' && !!checked[0].margin ? checked[0].address : null,
    coverage: 'Owned, derived and indexed trading-permission candidates. Current pool permissions are checked separately; index coverage is not a complete account directory.' };
}

export async function readSignerGas(signer: Address, signal: AbortSignal) {
  const deployment = await verifyDeployment(signal);
  return { value: await deployment.client.getBalance({ address: signer, blockNumber: deployment.blockNumber }), block: deployment.blockNumber };
}
