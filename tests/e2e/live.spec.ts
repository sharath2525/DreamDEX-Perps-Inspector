import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('live testnet browser reads show markets and a public non-empty account', async ({ page }, testInfo) => {
  test.skip(process.env.PEI_LIVE_READS !== '1', 'Explicit opt-in required for public testnet integration reads.');
  test.setTimeout(120000);
  const evidence = JSON.parse(await readFile('docs/research/parts2-3-live.json', 'utf8')) as { checks: { publicNonEmptyAccount?: { value?: { owner?: string } } } };
  const address = evidence.checks.publicNonEmptyAccount?.value?.owner;
  if (!address) throw new Error('Run scripts/verify-live.mjs to obtain a public holder sample first.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/markets');
  await expect(page.getByRole('button', { name: 'Inspect SOL', exact: true })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: 'Inspect SOL', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resting bids', exact: true })).toBeVisible({ timeout: 30000 });
  await page.locator('#selected-market').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('live-market-desktop.png') });
  await page.getByRole('navigation').getByRole('link', { name: 'Positions', exact: true }).click();
  if (!(await page.getByLabel('Account to inspect', { exact: true }).isVisible())) await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click();
  await page.getByLabel('Account to inspect', { exact: true }).fill(address);
  await page.getByRole('button', { name: 'Inspect address' }).click();
  await expect(page.getByRole('heading', { name: 'Current positions', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.positions-table tbody tr')).not.toHaveCount(0);
  await page.locator('.live-metrics').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('live-account-desktop.png') });
  await page.getByRole('navigation').getByRole('link', { name: 'Risk Lab', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use latest snapshot & reset scenarios' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Baseline reconciled exactly with on-chain health|Scenario estimate · minor baseline discrepancy/)).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: '-20%', exact: true }).click();
  await expect(page.getByText(/last valid calculation/)).toHaveCount(0);
  await page.locator('.live-metrics').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('live-risk-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('main').evaluate(element => element.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('live-risk-mobile.png') });
  const fits = await page.evaluate(() => document.querySelector('main')!.scrollWidth <= document.querySelector('main')!.clientWidth);
  expect(fits).toBe(true);
  expect(errors).toEqual([]);
});

test('reported public account risk scenario stays usable without concealing reconciliation differences', async ({ page }, testInfo) => {
  test.skip(process.env.PEI_LIVE_READS !== '1', 'Public read-only integration check.'); test.setTimeout(120000);
  const evidence = JSON.parse(await readFile('docs/research/risk-sdk-reproduction.json', 'utf8')) as { account: string };
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/positions/risk'); await page.getByLabel('Account to analyze').fill(evidence.account);
  await page.getByRole('button', { name: 'Inspect risk account' }).click();
  await expect(page.getByText(/Baseline reconciled exactly with on-chain health|Scenario estimate · minor baseline discrepancy/)).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: '-10%', exact: true }).click();
  await expect(page.getByText(/last valid calculation/)).toHaveCount(0);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download JSON evidence' }).click();
  const report = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(report.ready).toBe(true); expect(report.baseline).not.toBeNull(); expect(report.scenario).not.toBeNull();
  if (!report.reconciled) {
    expect(report.roundingCompatible).toBe(true);
    expect(report.equityAdjustment).toBe((-BigInt(report.difference.equity)).toString());
    await expect(page.getByText('Scenario estimate · minor baseline discrepancy')).toBeVisible();
  }
  await page.locator('.live-metrics').scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath('reported-risk-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('reported-risk-mobile.png') });
});

test('live history and owner-operation reads remain usable without a connected signer', async ({ page }, testInfo) => {
  test.skip(process.env.PEI_LIVE_READS !== '1', 'Explicit opt-in required.'); test.setTimeout(120000);
  const sample = JSON.parse(await readFile('docs/research/part9-live.json', 'utf8')) as { owner: string; pool: string };
  await page.setViewportSize({ width: 1440, height: 1100 }); await page.goto('/history'); await page.getByLabel('Public account', { exact: true }).fill(sample.owner); await page.getByRole('button', { name: 'Inspect account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download visible CSV' })).toBeVisible({ timeout: 45000 }); await expect(page.getByText('unique loaded', { exact: false })).not.toContainText('/ 0 unique loaded'); await page.screenshot({ path: testInfo.outputPath('live-history-desktop.png') });
  await page.getByRole('navigation').getByRole('link', { name: 'Account operations', exact: true }).click(); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('stop-create'); await page.getByLabel('Operation market').selectOption(sample.pool, { timeout: 45000 }); await page.getByRole('button', { name: 'Check registry payment & permission' }).click();
  await expect(page.getByText('STT per leg', { exact: false })).toBeVisible({ timeout: 30000 }); await expect(page.getByRole('button', { name: 'Check operation · no signature' })).toBeDisabled(); await page.screenshot({ path: testInfo.outputPath('live-operations-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('main').evaluate(element => element.scrollTo(0, 0)); await page.screenshot({ path: testInfo.outputPath('live-operations-mobile.png') }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main')!.scrollWidth <= document.querySelector('main')!.clientWidth)).toBe(true);
});
