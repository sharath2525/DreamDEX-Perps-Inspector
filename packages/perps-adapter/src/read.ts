import type { SomniaMarkets, PerpPositionMetrics, PerpPositionAnalyticsInputs } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { createPublicClient, http, erc20Abi, getAddress, isAddressEqual, zeroAddress, formatUnits, type Address } from 'viem';
import { PERPS_CONFIG as config } from './config';
import { bankAbi, factoryAbi, poolAbi, voucherAbi } from './abi';

export type ReadResult<T> = { ok: true; value: T } | { ok: false; error: string };
export async function result<T>(operation: Promise<T>): Promise<ReadResult<T>> {
  try { return { ok: true, value: await operation }; }
  catch (error) { return { ok: false, error: readError(error) }; }
}
export function readError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'Read cancelled';
    return ('shortMessage' in error ? String(error.shortMessage) : error.message).slice(0, 300);
  }
  return 'Read failed; no value is available.';
}
export function amount(value: bigint | undefined, decimals: number | undefined): string {
  if (value === undefined || decimals === undefined) return '—';
  return formatUnits(value, decimals);
}
export function sameAddress(a: string, b: string): boolean { return a.toLowerCase() === b.toLowerCase(); }

function rpc(signal?: AbortSignal) {
  return createPublicClient({ chain: hidekiTestnet, transport: http(config.rpcUrl, {
    timeout: 12_000, retryCount: 1, retryDelay: 600,
    // Each snapshot owns its abort signal. URL-shared HTTP batches would let a
    // cancelled account read abort a different page's in-flight snapshot.
    batch: false, fetchOptions: { signal },
  }) });
}
export async function indexed<T>(signal: AbortSignal, operation: (client: SomniaMarkets['client']) => Promise<T>): Promise<T> {
  const { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } = await import('@somnia-chain/markets-sdk');
  const exchange = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: config.indexerUrl,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    indexerLimits: { maxAttempts: 1, maxInFlight: 2 },
  });
  try { return await operation(exchange.client); } finally { await exchange.close(); }
}
async function mapBounded<T, R>(items: readonly T[], work: (item: T) => Promise<R>, signal: AbortSignal): Promise<R[]> {
  const output = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (next < items.length) {
      signal.throwIfAborted();
      const index = next++;
      output[index] = await work(items[index]!);
    }
  }));
  return output;
}

export async function verifyDeployment(signal: AbortSignal) {
  const client = rpc(signal);
  const [chainId, genesis, head] = await Promise.all([client.getChainId(), client.getBlock({ blockNumber: 0n }), client.getBlock()]);
  if (chainId !== config.chainId || genesis.hash?.toLowerCase() !== config.genesisHash.toLowerCase()) throw new Error('Network identity mismatch: chain ID or genesis differs from the approved deployment. Reads are blocked.');
  const headAge = Math.floor(Date.now() / 1000) - Number(head.timestamp);
  if (headAge > 120 || headAge < -60) throw new Error('RPC head is stale or local clock differs significantly. Reads are blocked; check the connection and clock.');
  const blockNumber = head.number;
  const [system, codes, decimals, symbol] = await Promise.all([
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getSystemConfig', blockNumber }),
    Promise.all([config.marginBank, config.factory, config.collateral].map(address => client.getCode({ address, blockNumber }))),
    client.readContract({ address: config.collateral, abi: erc20Abi, functionName: 'decimals', blockNumber }),
    client.readContract({ address: config.collateral, abi: erc20Abi, functionName: 'symbol', blockNumber }),
  ]);
  if (!system.fullyWired || !isAddressEqual(system.marginBank, config.marginBank) || !isAddressEqual(system.collateralToken, config.collateral) || !isAddressEqual(system.perpPoolFactory, config.factory) || codes.some(code => !code || code === '0x')) throw new Error('Deployment verification failed: contract code, collateral, factory or wiring differs from expectations.');
  return { client, blockNumber, blockTimestamp: head.timestamp, observedAt: Date.now(), decimals, symbol, system };
}
export type Deployment = Awaited<ReturnType<typeof verifyDeployment>>;

export interface MarketMetadata {
  baseDecimals: number; baseSymbol: string; tickSize: bigint; lotSize: bigint; minQuantity: bigint;
  initialMarginBps: bigint; maintenanceMarginBps: bigint; closeOutMarginBps: bigint;
  maxOpenInterest: bigint; maxPositionSize: bigint; takerFeeBpsTimes1k: bigint; makerFeeBpsTimes1k: bigint;
}
export interface MarketRow {
  pool: Address; baseToken: Address; restricted: boolean; indexed: boolean;
  metadata: ReadResult<MarketMetadata>;
}
async function marketMetadata(deployment: Deployment, pool: Address, baseToken: Address): Promise<MarketMetadata> {
  const { client, blockNumber } = deployment;
  const p = { address: pool, abi: poolAbi, blockNumber } as const;
  const [registered, bank, code, decimals, symbol, book, risk] = await Promise.all([
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'isPerpPoolRegistered', args: [pool], blockNumber }),
    client.readContract({ ...p, functionName: 'marginBank' }), client.getCode({ address: pool, blockNumber }),
    client.readContract({ address: baseToken, abi: erc20Abi, functionName: 'decimals', blockNumber }),
    client.readContract({ address: baseToken, abi: erc20Abi, functionName: 'symbol', blockNumber }),
    client.readContract({ ...p, functionName: 'getOrderBookParameters' }), client.readContract({ ...p, functionName: 'getPerpPoolParameters' }),
  ]);
  if (!registered || !sameAddress(bank, config.marginBank) || !code || code === '0x') throw new Error('Pool registration or MarginBank verification failed.');
  if (book.tickSize <= 0n || book.lotSize <= 0n || book.minQuantity <= 0n) throw new Error('Market returned invalid precision rules.');
  return { baseDecimals: decimals, baseSymbol: symbol, ...book, ...risk };
}

/** Connectivity probe only. No subscription or claim of a synchronized live stream. */
export function probeWebSocket(signal: AbortSignal): Promise<ReadResult<string>> {
  return result(new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(config.wsUrl);
    const finish = (error?: Error) => { clearTimeout(timer); signal.removeEventListener('abort', abort); socket.close(); if (error) reject(error); };
    const abort = () => finish(new DOMException('Read cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('WebSocket did not answer within 5 seconds. HTTP snapshots remain available.')), 5000);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    socket.onopen = () => socket.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }));
    socket.onerror = () => finish(new Error('WebSocket unavailable. HTTP snapshots remain available.'));
    socket.onmessage = event => {
      try { const response = JSON.parse(String(event.data)) as { id?: number; result?: string };
        if (response.id !== 1) return;
        if (Number(response.result) !== config.chainId) { finish(new Error('WebSocket chain ID mismatch.')); return; }
        finish(); resolve('Reachable; streaming is not enabled.');
      } catch { finish(new Error('Invalid WebSocket response.')); }
    };
  }));
}

export async function discoverMarkets(signal: AbortSignal) {
  const deployment = await verifyDeployment(signal);
  const { client, blockNumber, blockTimestamp, observedAt, decimals, symbol } = deployment;
  const [statuses, index, sync, websocket] = await Promise.all([
    client.readContract({ address: config.factory, abi: factoryAbi, functionName: 'getPerpPoolStatuses', blockNumber }),
    result(indexed(signal, sdk => sdk.listPerpMarkets({ limit: 1000 }))),
    result(indexed(signal, sdk => sdk.getSyncStatus(config.chainId))), probeWebSocket(signal),
  ]);
  const warnings: string[] = [];
  const indexedRows = index.ok ? index.value : [];
  if (!index.ok) warnings.push(`Indexer discovery unavailable: ${index.error}`);
  if (indexedRows.length === 1000) warnings.push('Indexer discovery reached the 1,000-row bound; indexed coverage may be incomplete.');
  const rows = await mapBounded(statuses, async status => {
    const indexedRow = indexedRows.find(row => sameAddress(row.poolAddress, status.perpPool));
    if (indexedRow && (!sameAddress(indexedRow.marginBank, config.marginBank) || !sameAddress(indexedRow.quoteToken, config.collateral) || !sameAddress(indexedRow.baseToken, status.baseToken))) warnings.push(`Indexer metadata mismatch for ${status.perpPool}; chain metadata is used.`);
    return { pool: status.perpPool, baseToken: status.baseToken, restricted: status.restricted, indexed: !!indexedRow, metadata: await result(marketMetadata(deployment, status.perpPool, status.baseToken)) };
  }, signal);
  const orphaned = indexedRows.filter(row => !statuses.some(status => sameAddress(status.perpPool, row.poolAddress)));
  if (orphaned.length) warnings.push(`${orphaned.length} indexed pools absent from the current factory registry were excluded.`);
  // Measure the independent head AFTER indexer replies; the discovery block was sampled earlier.
  const freshnessHead = await client.getBlock();
  const processed = sync.ok && sync.value?.latestProcessedBlock != null ? BigInt(sync.value.latestProcessedBlock) : null;
  const compatibleIndexer = processed === null || processed <= freshnessHead.number + 10_000n;
  const lagBlocks = processed === null || !compatibleIndexer ? null : freshnessHead.number > processed ? freshnessHead.number - processed : 0n;
  if (!compatibleIndexer) warnings.push('Indexer appears to follow a different genesis: its processed height is far ahead of this RPC.');
  if (!sync.ok) warnings.push(`Indexer freshness unavailable: ${sync.error}`);
  else if (processed === null) warnings.push('Indexer has no processed height; freshness is unknown.');
  if (lagBlocks !== null && lagBlocks > 100n) warnings.push('Indexer is behind the independently measured chain head; indexed account coverage may be incomplete.');
  const processedBlock = processed === null || !compatibleIndexer || processed > freshnessHead.number ? null : await result(client.getBlock({ blockNumber: processed }));
  const lagSeconds = processedBlock?.ok ? freshnessHead.timestamp - processedBlock.value.timestamp : null;
  return { rows, blockNumber, blockTimestamp, observedAt, decimals, symbol, warnings, websocket, sync, lagBlocks, lagSeconds, freshnessHead: freshnessHead.number, indexAvailable: index.ok };
}
export type MarketDiscovery = Awaited<ReturnType<typeof discoverMarkets>>;

export async function readMarket(pool: Address, signal: AbortSignal) {
  const deployment = await verifyDeployment(signal);
  const { client, blockNumber, blockTimestamp, observedAt } = deployment;
  const statuses = await client.readContract({ address: config.factory, abi: factoryAbi, functionName: 'getPerpPoolStatuses', blockNumber });
  const status = statuses.find(row => sameAddress(row.perpPool, pool));
  if (!status) throw new Error('Selected pool is absent from the current factory registry.');
  const metadata = await marketMetadata(deployment, pool, status.baseToken);
  const p = { address: pool, abi: poolAbi, blockNumber } as const;
  const [mark, index, funding, interest, parameters, lastFunding, bids, asks] = await Promise.all([
    result(client.readContract({ ...p, functionName: 'tryGetMarkPrice' })), result(client.readContract({ ...p, functionName: 'getIndexPrice' })),
    result(client.readContract({ ...p, functionName: 'getCurrentFundingRate' })), result(client.readContract({ ...p, functionName: 'getOpenInterest' })),
    result(client.readContract({ ...p, functionName: 'getFundingParameters' })), result(client.readContract({ ...p, functionName: 'getLastFundingUpdateTimestampNs' })),
    result(client.readContract({ ...p, functionName: 'getBookLevels', args: [true, 10n] })), result(client.readContract({ ...p, functionName: 'getBookLevels', args: [false, 10n] })),
  ]);
  return { pool, metadata, restricted: status.restricted, blockNumber, blockTimestamp, observedAt, decimals: deployment.decimals, symbol: deployment.symbol, mark, index, funding, interest, parameters, lastFunding, bids, asks };
}
export type MarketSnapshot = Awaited<ReturnType<typeof readMarket>>;

export interface PositionRow {
  pool: Address;
  position: ReadResult<{ size: bigint; avgEntryPrice: bigint; entryFundingIndex: bigint; lastUpdatedTimestampNs: bigint }>;
  metadata: ReadResult<MarketMetadata>;
  analytics: ReadResult<{ markPrice: bigint; metrics: PerpPositionMetrics; inputs: PerpPositionAnalyticsInputs }>;
}
export interface OpenOrderRow {
  pool: Address; orderId: bigint;
  metadata: ReadResult<MarketMetadata>;
  detail: ReadResult<{ orderId: bigint; isBid: boolean; owner: Address; userData: bigint; price: bigint; fullQuantity: bigint; quantityRemaining: bigint; expireTimestampNs: bigint }>;
}
export async function readAccount(address: Address, signal: AbortSignal) {
  const { perpPositionAnalytics } = await import('@somnia-chain/markets-sdk');
  const owner = getAddress(address);
  const deployment = await verifyDeployment(signal);
  const { client, blockNumber, blockTimestamp, observedAt, decimals, symbol } = deployment;
  const bank = { address: config.marginBank, abi: bankAbi, blockNumber } as const;
  const [state, health, status, withdrawable, floor, isolated, nativeBalance, tokenBalance, code, factory, indexedPositions, voucher] = await Promise.all([
    client.readContract({ ...bank, functionName: 'getAccountState', args: [owner] }),
    result(client.readContract({ ...bank, functionName: 'getAccountHealth', args: [owner] })),
    result(client.readContract({ ...bank, functionName: 'getMarginStatus', args: [owner] })),
    result(client.readContract({ ...bank, functionName: 'getWithdrawableCollateral', args: [owner] })),
    result(client.readContract({ ...bank, functionName: 'getCreditFloor', args: [owner] })),
    result(client.readContract({ ...bank, functionName: 'isolated', args: [owner] })),
    result(client.getBalance({ address: owner, blockNumber })),
    result(client.readContract({ address: config.collateral, abi: erc20Abi, functionName: 'balanceOf', args: [owner], blockNumber })),
    result(client.getCode({ address: owner, blockNumber })),
    result(client.readContract({ address: config.factory, abi: factoryAbi, functionName: 'getPerpPoolStatuses', blockNumber })),
    result(indexed(signal, sdk => sdk.listPerpPositions(owner, { limit: 500, offset: 0 }))),
    result((async () => {
      const distributor = await client.readContract({ ...bank, functionName: 'getCreditGranter' });
      if (sameAddress(distributor, zeroAddress)) return null;
      const [claimed, expiresAt] = await Promise.all([
        client.readContract({ address: distributor, abi: voucherAbi, functionName: 'isClaimed', args: [owner], blockNumber }),
        client.readContract({ address: distributor, abi: voucherAbi, functionName: 'voucherExpiryOf', args: [owner], blockNumber }),
      ]);
      return { distributor, claimed, expiresAt };
    })()),
  ]);
  signal.throwIfAborted();
  const warnings: string[] = [];
  if (!factory.ok) warnings.push('Factory enumeration failed; pending-order coverage is partial.');
  if (!indexedPositions.ok) warnings.push(`Indexed positions unavailable: ${indexedPositions.error}. Bank active pools remain the authoritative current source.`);
  if (indexedPositions.ok && indexedPositions.value.length >= 500) warnings.push('Indexed position coverage reached the 500-row limit.');
  const indexedPools = indexedPositions.ok ? indexedPositions.value.map(row => getAddress(row.pool)) : [];
  const pools = [...new Set([...state.activePerpPools, ...indexedPools, ...(factory.ok ? factory.value.map(row => row.perpPool) : [])].map(pool => pool.toLowerCase()))].map(pool => getAddress(pool));
  if (pools.length > 256) warnings.push('Account scan capped at 256 pools; coverage is partial.');
  const scans = await mapBounded(pools.slice(0, 256), async pool => {
    const ids = await result(client.readContract({ address: pool, abi: poolAbi, functionName: 'getOwnOpenOrders', account: owner, blockNumber }));
    return { pool, ids };
  }, signal);
  const failedOrderPools = scans.filter(scan => !scan.ids.ok).map(scan => scan.pool);
  if (failedOrderPools.length) warnings.push(`Open-order reads failed in ${failedOrderPools.length} pools; do not assume those pools have no orders.`);
  const positionPools = pools.slice(0, 256).filter(pool => state.activePerpPools.some(active => sameAddress(active, pool)) || indexedPools.some(indexedPool => sameAddress(indexedPool, pool)) || scans.some(scan => sameAddress(scan.pool, pool) && scan.ids.ok && scan.ids.value.length > 0));
  const positions = await mapBounded(positionPools, async (pool): Promise<PositionRow> => {
    const registered = factory.ok ? factory.value.find(row => sameAddress(row.perpPool, pool)) : undefined;
    const [position, snapshot, metadata] = await Promise.all([
      result(client.readContract({ ...bank, functionName: 'getPosition', args: [owner, pool] })),
      result(client.readContract({ address: pool, abi: poolAbi, functionName: 'tryGetHealthSnapshot', blockNumber })),
      registered ? result(marketMetadata(deployment, pool, registered.baseToken)) : Promise.resolve({ ok: false as const, error: 'Pool absent from current factory metadata; raw values retained.' }),
    ]);
    let analytics: PositionRow['analytics'] = { ok: false, error: 'Position or price snapshot is unavailable.' };
    if (position.ok && snapshot.ok && snapshot.value[0] && snapshot.value[1].markPrice > 0n) {
      const snap = snapshot.value[1];
      const inputs: PerpPositionAnalyticsInputs = { ...position.value, markPrice: snap.markPrice, projectedCumulativeFunding: snap.projectedCumulativeFunding, oneBase: snap.oneBase, effectiveImfBps: snap.effectiveIMFBps, maintenanceMarginBps: snap.maintenanceMarginBps, closeOutMarginBps: snap.closeOutMarginBps };
      analytics = { ok: true, value: { markPrice: snap.markPrice, inputs, metrics: perpPositionAnalytics(inputs) } };
    } else if (snapshot.ok && !snapshot.value[0]) analytics = { ok: false, error: 'Contract reports this market as unpriceable; position is retained.' };
    return { pool, position, metadata, analytics };
  }, signal);
  const identities = scans.flatMap(scan => scan.ids.ok ? scan.ids.value.map(orderId => ({ pool: scan.pool, orderId })) : []);
  if (identities.length > 300) warnings.push('Order detail scan capped at 300 orders; IDs beyond the cap are counted but not expanded.');
  const orders = await mapBounded(identities.slice(0, 300), async ({ pool, orderId }): Promise<OpenOrderRow> => ({ pool, orderId, metadata: positions.find(row => sameAddress(row.pool, pool))?.metadata ?? { ok: false, error: 'Metadata unavailable.' }, detail: await result(client.readContract({ address: pool, abi: poolAbi, functionName: 'getOrder', args: [orderId], blockNumber })) }), signal);
  const omittedPositions: PositionRow[] = state.activePerpPools.filter(pool => !positions.some(row => sameAddress(row.pool, pool))).map(pool => ({
    pool, position: { ok: false, error: 'Pool exceeds the bounded scan; position is unknown.' },
    metadata: { ok: false, error: 'Not read.' }, analytics: { ok: false, error: 'Not read.' },
  }));
  const visiblePositions = [...positions.filter(row => !row.position.ok || row.position.value.size !== 0n), ...omittedPositions];
  const positionCoverageComplete = state.activePerpPools.every(pool => positions.some(row => sameAddress(row.pool, pool) && row.position.ok));
  return { owner, blockNumber, blockTimestamp, observedAt, decimals, symbol, state, health, status, withdrawable, floor, isolated, nativeBalance, tokenBalance, code, voucher,
    positions: visiblePositions, orders, orderCount: identities.length, scannedPools: scans.length, failedOrderPools, warnings,
    positionCoverageComplete, analyticsComplete: positionCoverageComplete && visiblePositions.every(row => row.analytics.ok),
    orderCoverageComplete: factory.ok && pools.length <= 256 && failedOrderPools.length === 0 && identities.length <= 300 && orders.every(row => row.detail.ok),
    indexedPositionCount: indexedPositions.ok ? indexedPositions.value.length : null,
  };
}
export type AccountSnapshot = Awaited<ReturnType<typeof readAccount>>;
