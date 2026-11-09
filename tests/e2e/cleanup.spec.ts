import { expect, test } from '@playwright/test';
import { ACCOUNT_A, mockReads, TX_HASH, REPLACEMENT_HASH } from './rpc-fixture';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';

test('transaction input follows report navigation and browser history', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await mockReads(page);
  await page.goto(`/executions?chain=50383&tx=${TX_HASH}`);
  const input = page.getByLabel('Testnet transaction hash');
  await expect(input).toHaveValue(TX_HASH);
  await input.fill(REPLACEMENT_HASH);
  await page.getByRole('button', { name: 'Inspect transaction', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(REPLACEMENT_HASH));
  await page.goBack();
  await expect(input).toHaveValue(TX_HASH);
  await page.goForward();
  await expect(input).toHaveValue(REPLACEMENT_HASH);
});

test('positions prioritize exposure while secondary controls remain accessible', async ({ page }, info) => {
  await page.route('https://**', route => route.abort());
  await mockReads(page);
  await page.goto('/positions');
  const lookup = page.getByText('Inspect another address or manage wallet connection', { exact: true });
  await expect(page.getByLabel('Account to inspect', { exact: true })).toBeHidden();
  await lookup.click();
  await page.getByLabel('Account to inspect', { exact: true }).fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Inspect address', exact: true }).click();
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).toBeVisible();
  await expect(page.getByText('Non-withdrawable voucher floor', { exact: true })).toBeHidden();
  await page.getByText('Wallet funds, voucher and margin details', { exact: true }).click();
  await expect(page.getByText('Non-withdrawable voucher floor', { exact: true })).toBeVisible();
  await lookup.click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('clean-positions-mobile.png') });
});

test('changing accounts releases a cancelled diagnostic run without leaking its status', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  let started = false;
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(PERPS_CONFIG.rpcUrl, async route => {
    started = true;
    await pending;
    await route.abort().catch(() => {});
  });
  await page.goto('/test-lab');
  await page.getByRole('button', { name: 'Run read-only diagnostics' }).click();
  await expect.poll(() => started).toBe(true);
  await expect(page.getByRole('button', { name: 'Run read-only diagnostics' })).toBeDisabled();
  await page.getByLabel('Public account', { exact: true }).fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Inspect account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run read-only diagnostics' })).toBeEnabled();
  await mockReads(page, { wrongGenesis: true });
  await page.getByRole('button', { name: 'Run read-only diagnostics' }).click();
  release();
  await expect(page.getByText('INCONCLUSIVE', { exact: true })).toBeVisible();
  await expect(page.getByText(/Run cancelled or timed out/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run read-only diagnostics' })).toBeEnabled();
});
