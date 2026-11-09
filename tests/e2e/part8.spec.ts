import { expect, test } from '@playwright/test';
import { csvCell, historyCsv, mergeHistory, type HistoryPage, type HistoryRow } from '../../packages/perps-adapter/src/history';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { ACCOUNT_A, POOL, TX_HASH, mockReads } from './rpc-fixture';
const row: HistoryRow = { kind: 'funding', id: 'one', pool: POOL, timestamp: '1700000000', txHash: TX_HASH, label: 'Paid', amount: '100000000000000000000', price: null, orderId: null, blockNumber: null };
const pageOf = (rows: HistoryRow[], generation: string | null = null): HistoryPage => ({ scope: { owner: ACCOUNT_A, kind: 'funding' }, rows, page: 0, nextCursor: null, generation, hasMore: true, observedAt: 1, head: '100', processed: 100 });
test('history merges overlap without duplicating amounts and rejects changed views', () => {
  expect(mergeHistory([pageOf([row]), pageOf([row, { ...row, id: 'two' }])])).toHaveLength(2);
  expect(() => mergeHistory([pageOf([row]), pageOf([{ ...row, amount: '2' }])])).toThrow('changed');
  expect(() => mergeHistory([pageOf([row], 'old'), pageOf([row], 'new')])).toThrow('dataset changed');
});
test('CSV escapes formula prefixes, quotes, line breaks and preserves integer precision', () => {
  for (const value of ['=HYPERLINK("x")', '+cmd', '-2', '@SUM(A1)', ' \t=cmd', '\r=cmd']) expect(csvCell(value)).toMatch(/^"'/);
  expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  expect(historyCsv([row])).toContain('100000000000000000000');
});
test('history pages deduplicate overlapping funding records, filter loaded data and export CSV', async ({ page }) => {
  await mockReads(page);
  await page.route(PERPS_CONFIG.indexerUrl, route => {
    const body = route.request().postDataJSON() as { variables?: { offset?: number } };
    const funding = Array.from({ length: body.variables?.offset ? 2 : 50 }, (_, i) => ({ id: `f-${body.variables?.offset ? 49 + i : i}`, account: ACCOUNT_A, pool: POOL, timestamp: '1700000000', txHash: TX_HASH, amount: i === 0 ? '-2' : '100000000000000000000' }));
    // Offset overlap must retain the exact same row value.
    if (body.variables?.offset) funding[0]!.amount = '100000000000000000000';
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { chain_metadata: [{ chain_id: 50383, latest_processed_block: 100 }], _sdkWatermark: [{ chain_id: 50383, latest_processed_block: 100 }], FundingPayment: funding, Market: [], Order: [] } }) });
  });
  await page.goto('/history'); await page.getByLabel('Record type').selectOption('funding'); await page.getByLabel('Public account', { exact: true }).fill(ACCOUNT_A); await page.getByRole('button', { name: 'Inspect account', exact: true }).click();
  await expect(page.getByText('50 visible / 50 unique loaded', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Load older records' }).click(); await expect(page.getByText('51 visible / 51 unique loaded', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load older records' })).toBeDisabled();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visible CSV' }).click(); expect((await download).suggestedFilename()).toBe('pei-funding-loaded-records.csv');
  await page.getByLabel('Pool filter').fill('0x999'); await expect(page.getByText('0 visible / 51 unique loaded', { exact: false })).toBeVisible();
});
test('read-only lab distinguishes failed reads and unrun signing without asking wallet access', async ({ page }) => {
  await mockReads(page, { wrongGenesis: true });
  await page.addInitScript(() => { Object.defineProperty(window, 'ethereum', { value: { request: () => { throw new Error('Unexpected wallet access'); } } }); });
  await page.goto('/test-lab'); await page.getByRole('button', { name: 'Run read-only diagnostics' }).click();
  await expect(page.getByText('INCONCLUSIVE', { exact: true })).toBeVisible(); await expect(page.getByRole('table').getByText('BLOCKED', { exact: true })).toBeVisible(); await expect(page.getByRole('table').getByText('NOT RUN', { exact: true })).toBeVisible();
  await page.getByLabel('Show manual cases').check(); await expect(page.getByRole('link', { name: 'Open controlled order composer' })).toBeVisible();
});
