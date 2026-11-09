import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { encodeFunctionData, zeroAddress } from 'viem';
import { orderWriteAbi } from '../../packages/perps-adapter/src/trade';
import { reportPath } from '../../packages/perps-adapter/src/report';
import { ACCOUNT_A, ACCOUNT_B, POOL, TX_HASH, mockReads } from './rpc-fixture';

const data = encodeFunctionData({ abi: orderWriteAbi, functionName: 'placeOrder', args: [true, 0n, 12000000n, 1000000000n, 1900000000000000000n, 0, 0, zeroAddress, 0n] });
async function wallet(page: Page, actor = ACCOUNT_A) {
  await page.addInitScript(({ actor }) => {
    const calls: string[] = []; const handlers = new Map<string, (...args: unknown[]) => void>();
    Object.assign(window, { guidedCalls: calls, ethereum: { on: (event: string, handler: (...args: unknown[]) => void) => handlers.set(event, handler), removeListener: (event: string) => handlers.delete(event), request: async ({ method }: { method: string }) => {
      calls.push(method); if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [actor];
      if (method === 'eth_chainId') return '0xc4cf';
      throw new Error('Signing is not allowed in this scenario');
    } } });
  }, { actor });
  await page.goto('/guide');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Browser wallet/ }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(actor);
  await page.getByRole('button', { name: 'Close wallet dialog' }).click();
}
test.beforeEach(async ({ page }) => { await page.route('https://**', route => route.abort()); });

test('guided entry explains account setup and works without wallet access at mobile widths', async ({ page }, info) => {
  await mockReads(page);
  await page.goto('/guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('One order. An explainable outcome.');
  await expect(page.getByRole('region', { name: 'Execution journey' }).locator('[aria-current="step"]')).toContainText('Choose account');
  await expect(page.getByRole('link', { name: 'Open transaction inspector' })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`guide-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'Open transaction inspector' }).click();
  await expect(page.getByLabel('Testnet transaction hash')).toBeVisible();
});

test('a preflight diagnostic is a possible explanation, exports no raw error, and clears on edit', async ({ page }) => {
  await mockReads(page, { emptyMargin: true }); await wallet(page);
  await page.getByRole('link', { name: 'Build and check an order' }).click();
  await page.getByLabel('Market', { exact: true }).selectOption(POOL);
  await page.getByLabel('Price', { exact: true }).fill('12');
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Run preflight · no signature' }).click();
  const card = page.getByRole('region', { name: 'Execution diagnosis' });
  await expect(card).toContainText('Unsigned preflight did not complete');
  await expect(card).toContainText('Possible explanation');
  await expect(card).toContainText('inferred from error wording');
  await card.getByText('Export this diagnostic', { exact: true }).click();
  const download = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Download JSON diagnostic', exact: true }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  expect(exported).toMatchObject({ schema: 'pei.diagnostic-case.v1', confidence: 'possible-explanation', stage: 'preflight' });
  expect(exported).not.toHaveProperty('error'); expect(exported).not.toHaveProperty('privateKey');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { guidedCalls: string[] }).guidedCalls)).toEqual(['eth_requestAccounts', 'eth_chainId']);
});

test('local precision validation never claims that a preflight was run', async ({ page }) => {
  await mockReads(page); await wallet(page);
  await page.getByRole('link', { name: 'Build and check an order' }).click();
  await page.getByLabel('Market', { exact: true }).selectOption(POOL);
  await page.getByLabel('Price', { exact: true }).fill('12');
  await page.getByLabel('Quantity', { exact: true }).fill('1.0000000001');
  await expect(page.getByRole('region', { name: 'Execution diagnosis' })).toContainText('failed local validation');
  await expect(page.getByRole('button', { name: 'Run preflight · no signature' })).toBeDisabled();
});

test('delegated permission failure gives a recovery path and clears when the action changes', async ({ page }) => {
  await mockReads(page, { operations: true, permission: false }); await wallet(page, ACCOUNT_B);
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Account operations', exact: true }).click();
  await page.getByLabel('Receiving owner account').fill(ACCOUNT_A);
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-place');
  await page.getByLabel('Operation market').selectOption(POOL);
  await page.getByLabel('Base quantity', { exact: true }).fill('1');
  await page.getByLabel('Limit price').fill('12');
  await page.getByRole('button', { name: 'Check operation · no signature' }).click();
  const card = page.getByRole('region', { name: 'Execution diagnosis' });
  await expect(card).toContainText('Possible explanation');
  await expect(card.getByRole('link', { name: 'Official account-linking guide' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-cancel');
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { guidedCalls: string[] }).guidedCalls)).toEqual(['eth_requestAccounts', 'eth_chainId']);
});

for (const [mode, title] of [['filled', 'The requested quantity filled in this receipt'], ['resting', 'No receipt fill; a remainder is observed'], ['no-events', 'Receipt confirmed; trading outcome unknown'], ['reverted', 'The transaction reverted']] as const) {
  test(`case explanation separates evidence for ${mode}`, async ({ page }) => {
    await mockReads(page, { receiptMode: mode, sent: { from: ACCOUNT_A, to: POOL, data } });
    await page.goto(reportPath(TX_HASH));
    const card = page.getByRole('region', { name: 'Case explanation' });
    await expect(card.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(card.getByText('Unknown', { exact: true })).toBeVisible();
    await expect(card.getByText('Next safe step', { exact: true })).toBeVisible();
  });
}

test('exposure and risk keep the case hash, and summary exports only public observations', async ({ page }, info) => {
  await mockReads(page, { receiptMode: 'filled', sent: { from: ACCOUNT_A, to: POOL, data } });
  await page.goto(reportPath(TX_HASH));
  await page.getByRole('link', { name: 'Inspect resulting positions' }).click();
  await expect(page).toHaveURL(new RegExp(`positions\\?case=${TX_HASH}`));
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.getByRole('link', { name: 'Return to report & export' }).click();
  await page.getByRole('link', { name: 'Explore this market’s risk' }).click();
  await expect(page.getByLabel('Focus one market')).toHaveValue(POOL);
  await page.getByRole('link', { name: 'Return to report & export' }).click();
  await page.getByText('Save a concise case summary', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON case summary', exact: true }).click();
  const summary = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  expect(summary).toMatchObject({ schema: 'pei.execution-case.v1', hash: TX_HASH, actor: ACCOUNT_A, owner: ACCOUNT_A, filledRaw: '1000000000' });
  expect(summary).not.toHaveProperty('notes'); expect(summary).not.toHaveProperty('signature');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('case-report-mobile.png'), fullPage: true });
});
