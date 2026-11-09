import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, parseAbi, zeroAddress, type Hex } from 'viem';
import { orderBookEventsAbi } from '@somnia-chain/markets-sdk';
import { orderWriteAbi } from '../../packages/perps-adapter/src/trade';
import { operationsAbi } from '../../packages/perps-adapter/src/operations';
import { decodeReportIntent, reportPath } from '../../packages/perps-adapter/src/report';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { ACCOUNT_A, ACCOUNT_B, POOL, TX_HASH, mockReads, type FixtureOptions } from './rpc-fixture';

const terms = [true, 0n, 12000000n, 1000000000n, 1900000000000000000n, 0, 0, zeroAddress, 0n] as const;
const data = encodeFunctionData({ abi: orderWriteAbi, functionName: 'placeOrder', args: terms });
async function open(page: Page, options: FixtureOptions = {}) {
  await page.route('https://**', route => route.abort());
  const fixture = await mockReads(page, { sent: { from: ACCOUNT_A, to: POOL, data }, ...options });
  await page.goto(reportPath(TX_HASH));
  return fixture;
}
const panel = (page: Page) => page.getByRole('region', { name: 'Independent execution report' });

test('public report works without wallet/journal, exports provenance and uses read-only account links', async ({ page }) => {
  const fixture = await open(page, { receiptMode: 'filled', duplicateLogs: true });
  await expect(panel(page)).toContainText('Fully filled in this receipt');
  await expect(panel(page)).toContainText('1 MOCK');
  await expect(panel(page)).toContainText('1 matching events');
  const download = page.waitForEvent('download');
  await panel(page).getByRole('button', { name: 'Download JSON report' }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  expect(exported).toMatchObject({ schema: 'pei.execution-report.v1', actor: ACCOUNT_A, owner: ACCOUNT_A, hash: TX_HASH, filled: '1000000000' });
  expect(exported.fills).toHaveLength(1);
  expect(exported).not.toHaveProperty('notes');
  await panel(page).getByRole('link', { name: 'Explore this market’s risk' }).click();
  await expect(page).toHaveURL(/positions\/risk\?pool=/);
  await expect(page.getByLabel('Focus one market')).toHaveValue(POOL);
  await expect(page.getByText('Baseline reconciled exactly with on-chain health')).toBeVisible();
  await page.getByRole('button', { name: 'Focused +10%', exact: true }).click();
  await expect(page.getByLabel('Uniform price shock')).toHaveValue('0');
  await expect(page.getByLabel('Shock for MOCK', { exact: true })).toHaveValue('10');
  expect(fixture.calls.some(call => /send|sign/i.test(call.method))).toBe(false);
});

for (const [mode, text] of [['resting', 'No fills in receipt; remainder observed'], ['no-events', 'Mined; business outcome unresolved'], ['reverted', 'Reverted; no execution'], ['pending', 'Transaction not found']] as const) {
  test(`public report distinguishes ${mode}`, async ({ page }) => { await open(page, { receiptMode: mode }); await expect(panel(page)).toContainText(text); });
}
test('known pending transaction is not reported as missing or reverted', async ({ page }) => {
  await open(page, { originalPending: true });
  await expect(panel(page)).toContainText('Pending / receipt unavailable');
});
test('foreign emitter and mismatched placement owner cannot prove a fill', async ({ page }) => {
  await open(page, { receiptMode: 'filled', transform(request, value) {
    if (request.method !== 'eth_getTransactionReceipt') return value;
    const receipt = value as { logs: { address: string }[] }; return { ...receipt, logs: receipt.logs.map(log => ({ ...log, address: ACCOUNT_B })) };
  } });
  await expect(panel(page)).toContainText('Mined; business outcome unresolved');
  await expect(panel(page)).toContainText('0 matching events');
});
test('canonical mismatch and unsupported chain fail closed', async ({ page }) => {
  await open(page, { transform(request, value) { return request.method === 'eth_getTransactionReceipt' ? { ...(value as object), blockHash: `0x${'ff'.repeat(32)}` } : value; } });
  await expect(panel(page)).toContainText('Canonical receipt verification failed');
  await page.goto(`/executions?chain=1&tx=${TX_HASH}`);
  await expect(page.getByText('Invalid report link:')).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
});
test('unsupported selectors and unregistered pools do not become reports', async ({ page }) => {
  await open(page, { operations: true, sent: { from: ACCOUNT_A, to: POOL, data: '0x12345678' } });
  await expect(panel(page)).toContainText('Unsupported transaction');
  await open(page, { sent: { from: ACCOUNT_A, to: ACCOUNT_B, data } });
  await expect(panel(page)).toContainText('absent from the current factory registry');
});
test('delegated place attributes receiver independently of signing actor', async ({ page }) => {
  const delegated = encodeFunctionData({ abi: operationsAbi, functionName: 'placeOrderFor', args: [ACCOUNT_A, ...terms] });
  await open(page, { receiptMode: 'filled', transform(request, value) { return request.method === 'eth_getTransactionByHash' ? { ...(value as object), from: ACCOUNT_B, input: delegated } : value; } });
  await expect(panel(page)).toContainText('Linked operator place');
  await expect(panel(page)).toContainText('Fully filled in this receipt');
  await expect(panel(page).locator('dl')).toContainText(ACCOUNT_B);
});
for (const delegated of [false, true]) for (const kind of ['cancel', 'reduce'] as const) {
  test(`${delegated ? 'delegated' : 'direct'} ${kind} uses matching event not receipt success`, async ({ page }) => {
    const abi = parseAbi(['function cancelOrder(uint128)', 'function reduceOrder(uint128,uint256)', 'function cancelOrderFor(address,uint128)', 'function reduceOrderFor(address,uint128,uint256)']);
    const call: Hex = delegated ? kind === 'cancel' ? encodeFunctionData({ abi, functionName: 'cancelOrderFor', args: [ACCOUNT_A, 7n] }) : encodeFunctionData({ abi, functionName: 'reduceOrderFor', args: [ACCOUNT_A, 7n, 500000000n] }) : kind === 'cancel' ? encodeFunctionData({ abi, functionName: 'cancelOrder', args: [7n] }) : encodeFunctionData({ abi, functionName: 'reduceOrder', args: [7n, 500000000n] });
    await open(page, { transform(request, value) {
      if (request.method === 'eth_getTransactionByHash') return { ...(value as object), from: delegated ? ACCOUNT_B : ACCOUNT_A, input: call };
      if (request.method !== 'eth_getTransactionReceipt') return value;
      const receipt = value as { logs: object[] };
      return { ...receipt, logs: [{ ...receipt.logs[0], topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: kind === 'cancel' ? 'OrderCancelled' : 'OrderReduced', args: { orderId: 7n } }), data: kind === 'cancel' ? '0x' : encodeAbiParameters([{ type: 'uint256' }], [500000000n]) }] };
    } });
    await expect(panel(page)).toContainText(kind === 'cancel' ? 'Cancellation / expiry event confirmed' : 'Resting remainder reduction confirmed');
    await expect(panel(page)).toContainText('0 matching events');
    expect(decodeReportIntent(ACCOUNT_B, call).kind).toBe(kind);
  });
}
test('report and navigation remain contained on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await open(page, { receiptMode: 'filled' });
  await expect(panel(page)).toContainText('Fully filled in this receipt');
  await panel(page).getByText('Evidence coverage, network and raw units').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.release/part2-report-mobile.png', fullPage: true });
});

test('partial receipt fills remain partial and independent inspection preserves unresolved journal', async ({ page }) => {
  const key = `pei.attempts.v1.50383.${PERPS_CONFIG.genesisHash}`;
  const records = [{ id: '12345678-1234-1234-1234-123456789012', createdAt: 1, kind: 'place', owner: ACCOUNT_A, pool: POOL, data, status: 'unknown', positionBefore: '0', gasLimit: '100000', gasPrice: '1' }];
  await page.addInitScript(({ key, records }) => localStorage.setItem(key, JSON.stringify(records)), { key, records });
  await open(page, { receiptMode: 'filled', transform(request, value) {
    if (request.method !== 'eth_getTransactionReceipt') return value;
    const receipt = value as { logs: object[] };
    return { ...receipt, logs: [receipt.logs[0], { ...receipt.logs[1], data: encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], [500000000n, 500000000n, 0n, 12000000n]) }] };
  } });
  await expect(panel(page)).toContainText('Partially filled in this receipt');
  await expect(panel(page)).toContainText('0.5 MOCK');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(JSON.stringify(records));
});
test('conflicting placement owner withholds fills and archive failure preserves receipt facts', async ({ page }) => {
  await open(page, { receiptMode: 'filled', transform(request, value) {
    if (request.method !== 'eth_getTransactionReceipt') return value;
    const receipt = value as { logs: { data: string }[] };
    return { ...receipt, logs: receipt.logs.map((log, i) => i === 0 ? { ...log, data: log.data.replace(ACCOUNT_A.slice(2), ACCOUNT_B.slice(2)) } : log) };
  } });
  await expect(panel(page)).toContainText('conflicting event attribution');
  await expect(panel(page)).toContainText('Withheld — conflicting');
  await open(page, { receiptMode: 'filled', transform(request, value) {
    if (request.method === 'eth_call' && request.params[1] === '0x63') throw new Error('Controlled missing archive state');
    return value;
  } });
  await expect(panel(page)).toContainText('Fully filled in this receipt');
  await expect(panel(page)).toContainText('Historical block state is unavailable');
});
