import { isAddress, type Address } from 'viem';
import { PERPS_CONFIG as config } from './config';
import { indexed, sameAddress, verifyDeployment } from './read';

export const HISTORY_PAGE_SIZE = 50;
export const HISTORY_MAX_PAGES = 10;
export type HistoryKind = 'orders' | 'fills' | 'funding' | 'margin';
export interface HistoryRow { id: string; kind: HistoryKind; pool: string | null; timestamp: string; txHash: string; label: string; amount: string; price: string | null; orderId: string | null; blockNumber: string | null }
export interface HistoryScope { owner: Address; kind: HistoryKind }
export interface HistoryPage { scope: HistoryScope; rows: HistoryRow[]; page: number; nextCursor: string | null; hasMore: boolean; generation: string | null; observedAt: number; head: string; processed: number | null }
const integer = (value: string) => { if (!/^-?\d+$/.test(value)) throw new Error('History contains a malformed raw integer.'); return value; };
const publicId = (value: string) => { if (!/^[a-zA-Z0-9_:.-]{1,200}$/.test(value)) throw new Error('History contains an invalid identity.'); return value; };
function normalize(row: HistoryRow): HistoryRow {
  if (!/^0x[0-9a-f]{64}$/i.test(row.txHash) || (row.pool !== null && !isAddress(row.pool))) throw new Error('History provenance is malformed.');
  if (!/^\d+$/.test(row.timestamp) || Number(row.timestamp) > 253402300799) throw new Error('History timestamp is outside the supported range.');
  return { ...row, id: publicId(row.id), pool: row.pool?.toLowerCase() ?? null, timestamp: integer(row.timestamp), amount: integer(row.amount),
    price: row.price === null ? null : integer(row.price), orderId: row.orderId === null ? null : integer(row.orderId), blockNumber: row.blockNumber === null ? null : integer(row.blockNumber) };
}
export function mergeHistory(pages: readonly HistoryPage[]) {
  const rows = new Map<string, HistoryRow>();
  const first = pages[0];
  for (const page of pages) {
    if (first && (!sameAddress(page.scope.owner, first.scope.owner) || page.scope.kind !== first.scope.kind || page.generation !== first.generation)) throw new Error('History scope or fill dataset changed. Restart from the newest page.');
    for (const row of page.rows) {
      const key = `${row.kind}:${row.id}`;
      const prior = rows.get(key);
      if (prior && JSON.stringify(prior) !== JSON.stringify(row)) throw new Error('A loaded history record changed. Restart to reconcile the new indexer view.');
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}
export async function readHistoryPage(scope: HistoryScope, page: number, cursor: string | null, signal: AbortSignal): Promise<HistoryPage> {
  if (!isAddress(scope.owner) || !['orders', 'fills', 'funding', 'margin'].includes(scope.kind) || !Number.isInteger(page) || page < 0 || page >= HISTORY_MAX_PAGES) throw new Error('Invalid history scope or page bound.');
  if (scope.kind === 'fills' && page > 0 && !cursor) throw new Error('Fill continuation is unavailable. Restart history.');
  const deployment = await verifyDeployment(signal);
  return indexed(signal, async sdk => {
    const sync = await sdk.getSyncStatus(config.chainId);
    if (!sync || sync.chainId !== config.chainId || (sync.latestProcessedBlock !== null && BigInt(sync.latestProcessedBlock) > deployment.blockNumber + 100n)) throw new Error('Indexer chain binding differs from the verified chain.');
    const opts = { limit: HISTORY_PAGE_SIZE, offset: page * HISTORY_PAGE_SIZE };
    let rows: HistoryRow[]; let nextCursor: string | null = null; let generation: string | null = null;
    if (scope.kind === 'fills') {
      const read = await sdk.getUserFillsPage(scope.owner, { marketType: 'PERP', limit: HISTORY_PAGE_SIZE, ...(cursor ? { cursor } : {}) });
      generation = read.datasetGeneration; nextCursor = read.nextCursor;
      rows = read.fills.map(row => {
        const maker = row.maker && sameAddress(row.maker, scope.owner), taker = row.takerOrder?.owner ?? row.taker;
        if (!maker && (!taker || !sameAddress(taker, scope.owner))) throw new Error('Fill does not belong to this account.');
        return { id: row.id, kind: 'fills', pool: row.pool, timestamp: row.timestamp, txHash: row.txHash, label: maker ? 'Maker fill' : 'Taker fill', amount: row.quantity, price: row.fillPrice, orderId: maker ? row.makerOrderId : row.takerOrderId, blockNumber: row.blockNumber ?? null };
      });
    } else if (scope.kind === 'orders') {
      rows = (await sdk.listPerpOrderHistory(scope.owner, opts)).map(row => ({ id: row.id, kind: 'orders', pool: row.market.poolAddress, timestamp: row.lastUpdatedAtTimestamp, txHash: row.placedTxHash,
        label: `${row.status}${row.cancelReason ? ` · ${row.cancelReason.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 80)}` : ''}`, amount: row.filledQuantity, price: row.price, orderId: row.orderId, blockNumber: null }));
    } else if (scope.kind === 'funding') {
      rows = (await sdk.getFundingPayments(scope.owner, opts)).map(row => {
        if (!sameAddress(row.account, scope.owner) || row.chainId !== config.chainId) throw new Error('Funding scope mismatch.');
        return { id: row.id, kind: 'funding', pool: row.pool, timestamp: row.timestamp, txHash: row.txHash, label: BigInt(row.amount) > 0n ? 'Paid' : BigInt(row.amount) < 0n ? 'Received' : 'Zero settlement', amount: row.amount, price: null, orderId: null, blockNumber: null };
      });
    } else {
      rows = (await sdk.getMarginEvents(scope.owner, opts)).map(row => {
        if (!sameAddress(row.account, scope.owner)) throw new Error('Margin scope mismatch.');
        return { id: row.id, kind: 'margin', pool: row.pool, timestamp: row.timestamp, txHash: row.txHash, label: ['Deposit', 'Withdraw', 'Locked', 'Unlocked', 'Credited'].includes(row.kind) ? row.kind : 'Unknown movement', amount: row.amount, price: null, orderId: null, blockNumber: null };
      });
    }
    if (rows.length > HISTORY_PAGE_SIZE) throw new Error('Indexer exceeded the requested page bound.');
    return { scope, rows: rows.map(normalize), page, nextCursor, hasMore: scope.kind === 'fills' ? nextCursor !== null : rows.length === HISTORY_PAGE_SIZE, generation, observedAt: Date.now(), head: deployment.blockNumber.toString(), processed: sync.latestProcessedBlock };
  });
}
export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value);
  // Quoting alone does not stop spreadsheet formula execution, including leading whitespace.
  let prefix = text.trimStart();
  while (prefix.length && prefix.charCodeAt(0) < 32) prefix = prefix.slice(1).trimStart();
  if (/^[=+\-@]/.test(prefix) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function historyCsv(rows: readonly HistoryRow[]) {
  const keys = ['kind', 'id', 'pool', 'timestamp', 'txHash', 'label', 'amount', 'price', 'orderId', 'blockNumber'] as const;
  return [keys.map(csvCell).join(','), ...rows.map(row => keys.map(key => csvCell(row[key])).join(','))].join('\r\n');
}
export function historyEvidence(pages: readonly HistoryPage[], visible: readonly HistoryRow[], filters: { pool: string; from: string; to: string }) {
  return { schema: 'pei-history-v1', chainId: config.chainId, genesis: config.genesisHash, sdkVersion: config.sdkVersion, scope: pages[0]?.scope,
    filters, pages: pages.map(({ page, observedAt, head, processed, generation }) => ({ page, observedAt, head, processed, generation })), rows: visible,
    coverage: 'At most 500 indexed rows. Filters apply to loaded rows only. Offset pages can skip records as the dataset changes; deduplication cannot restore missing rows. Not lifetime history or realized return. Order transaction hashes refer to placement, not terminal events.' };
}
