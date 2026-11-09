import { expect, test, type Page } from '@playwright/test';
import { formatUnits } from 'viem';
import { exactUnits, validateGrid, bookEstimate } from '../../packages/perps-adapter/src/precision';
import { ACCOUNT_A, ACCOUNT_B, POOL, TX_HASH, mockReads, type FixtureOptions } from './rpc-fixture';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';

test('exact precision round-trips 6–24 decimals without rounding and rejects invalid grids', () => {
  for (let decimals = 6; decimals <= 24; decimals++) {
    for (const value of [1n, 1234567n, 10n ** BigInt(decimals) + 17n, 98765432101234567890123456789n]) {
      expect(exactUnits(formatUnits(value, decimals), decimals)).toBe(value);
    }
    expect(() => exactUnits(`0.${'0'.repeat(decimals)}1`, decimals)).toThrow('decimal places');
  }
  for (const text of ['0', '-1', '1e3', ' 1', '1.', '.1', 'NaN', 'Infinity', '01', '1,000']) expect(() => exactUnits(text, 18)).toThrow();
  expect(() => validateGrid(12000001n, 1000000000n, 1000n, 10000000n, 100000000n)).toThrow('tick');
  expect(() => validateGrid(12000000n, 100000001n, 1000n, 10000000n, 100000000n)).toThrow('lot');
  expect(() => validateGrid(12000000n, 10000000n, 1000n, 10000000n, 100000000n)).toThrow('minimum');
});

test('visible book estimate respects side, limit and partial depth', () => {
  const levels = [{ price: 11n, quantity: 3n }, { price: 10n, quantity: 2n }, { price: 15n, quantity: 10n }];
  expect(bookEstimate(levels, true, 11n, 8n)).toEqual({ visibleQuantity: 5n, uncoveredQuantity: 3n, averagePrice: 10n });
  expect(bookEstimate(levels, false, 12n, 8n)).toEqual({ visibleQuantity: 8n, uncoveredQuantity: 0n, averagePrice: 15n });
  expect(bookEstimate([], true, 11n, 8n).averagePrice).toBeNull();
});

async function setup(page: Page, options: FixtureOptions = {}, walletOutcome: 'hash' | 'reject' | 'unknown' | 'delay' = 'hash') {
  const fixture = await mockReads(page, options);
  await page.exposeFunction('captureTransaction', (transaction: NonNullable<FixtureOptions['sent']>) => { options.sent = transaction; });
  await page.addInitScript(({ owner, hash, outcome, genesis }) => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const state = { sends: 0, accounts: [owner], emit: (event: string, value: unknown) => listeners.get(event)?.(value) };
    Object.assign(window, { testWallet: state });
    Object.defineProperty(window, 'ethereum', { value: {
      on: (event: string, listener: (...args: unknown[]) => void) => listeners.set(event, listener),
      removeListener: (event: string) => listeners.delete(event),
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return state.accounts;
        if (method === 'eth_chainId') return '0xc4cf';
        if (method === 'eth_getBlockByNumber') return { hash: genesis };
        if (method === 'eth_sendTransaction') {
          state.sends++;
          await (window as unknown as { captureTransaction(value: unknown): Promise<void> }).captureTransaction(params?.[0]);
          if (outcome === 'reject') throw { code: 4001 };
          if (outcome === 'unknown') throw new Error('Transport lost after possible broadcast');
          if (outcome === 'delay') await new Promise(resolve => setTimeout(resolve, 1500));
          return hash;
        }
        throw new Error(`Unexpected wallet method ${method}`);
      },
    } });
  }, { owner: ACCOUNT_A, hash: TX_HASH, outcome: walletOutcome, genesis: PERPS_CONFIG.genesisHash });
  await page.goto('/positions');
  await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click(); await page.getByRole('button', { name: 'Connect browser wallet' }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('Somnia testnet · 50383', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close wallet dialog' }).click();
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Trade', exact: true }).click();
  await page.getByLabel('Market', { exact: true }).selectOption(POOL);
  await page.getByLabel('Price', { exact: true }).fill('12');
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  return fixture;
}
async function preflight(page: Page) {
  await page.getByRole('button', { name: 'Run preflight · no signature' }).click();
  await expect(page.getByText('PREFLIGHT PASSED', { exact: true })).toBeVisible({ timeout: 25000 });
}
async function authorize(page: Page) {
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm & open wallet' }).click();
}

test('preflight uses SDK, invalidates on edit and needs explicit confirmation; resting order can be cancelled', async ({ page }, testInfo) => {
  const options: FixtureOptions = {};
  await setup(page, options, 'delay');
  await preflight(page);
  await expect(page.getByRole('button', { name: 'Confirm & open wallet' })).toBeDisabled();
  await page.getByLabel('Quantity', { exact: true }).fill('1.1');
  await expect(page.getByText('PREFLIGHT PASSED', { exact: true })).toHaveCount(0);
  await preflight(page);
  await page.getByRole('main').evaluate(element => element.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('checked-order.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('checked-order-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  await authorize(page);
  await expect(page.getByRole('button', { name: 'Checking / waiting…' })).toBeDisabled();
  await expect(page.getByText('Attempt: submitted')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { testWallet: { sends: number } }).testWallet.sends)).toBe(1);
  await page.getByRole('link', { name: 'Inspect this attempt' }).click();
  await page.getByText('Journal details and raw observations', { exact: true }).click(); await expect(page.getByText('No fills in receipt; order currently resting', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check cancellation · no signature' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm cancellation & open wallet' }).click();
  await expect(page.getByText('Cancellation attempt: submitted')).toBeVisible();
  await page.getByRole('link', { name: 'Inspect cancellation', exact: true }).click();
  await page.getByText('Journal details and raw observations', { exact: true }).click(); await expect(page.getByText('Cancellation / expiry event confirmed', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('cancel-inspector-mobile.png') });
});

test('precision, insufficient collateral and simulation errors never request a signature', async ({ page }) => {
  const options: FixtureOptions = {};
  await setup(page, options);
  await page.getByLabel('Quantity', { exact: true }).fill('1.0000000001');
  await expect(page.getByRole('alert')).toContainText('9 decimal places');
  await expect(page.getByRole('button', { name: 'Run preflight · no signature' })).toBeDisabled();
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  options.emptyMargin = true;
  await page.getByRole('button', { name: 'Run preflight · no signature' }).click();
  await expect(page.getByRole('alert')).toContainText(/capacity|Margin check failed/, { timeout: 25000 });
  options.emptyMargin = false; options.revertSimulation = true;
  await page.getByRole('button', { name: 'Run preflight · no signature' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('PREFLIGHT PASSED', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { testWallet: { sends: number } }).testWallet.sends)).toBe(0);
});

test('ambiguous failure survives reload and its mined hash can be recovered', async ({ page }) => {
  await setup(page, {}, 'unknown');
  await preflight(page); await authorize(page);
  await expect(page.getByText('Attempt: unknown')).toBeVisible();
  await page.getByRole('link', { name: 'Inspect this attempt' }).click();
  await page.reload();
  await expect(page.getByText('Outcome unknown · another send is blocked', { exact: true })).toBeVisible();
  await page.getByLabel('Recovery transaction hash').fill(TX_HASH);
  await page.getByRole('button', { name: 'Verify recovered hash' }).click();
  await page.getByText('Journal details and raw observations', { exact: true }).click(); await expect(page.getByText('No fills in receipt; order currently resting', { exact: true })).toBeVisible();
});

test('explicit wallet rejection is recorded without retry', async ({ page }) => {
  await setup(page, {}, 'reject'); await preflight(page); await authorize(page);
  await expect(page.getByText('Attempt: rejected')).toBeVisible();
  await page.getByRole('link', { name: 'Inspect this attempt' }).click();
  await expect(page.getByText('Wallet rejected the request. No automatic retry.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { testWallet: { sends: number } }).testWallet.sends)).toBe(1);
});

test('an unresolved attempt in another tab blocks a second wallet request', async ({ page, context }) => {
  await setup(page, {}, 'unknown'); await preflight(page); await authorize(page);
  await expect(page.getByText('Attempt: unknown')).toBeVisible();
  const second = await context.newPage();
  await setup(second); await preflight(second); await authorize(second);
  await expect(second.getByRole('alert')).toContainText('earlier attempt has an unresolved outcome');
  expect(await second.evaluate(() => (window as unknown as { testWallet: { sends: number } }).testWallet.sends)).toBe(0);
});

test('storage failure blocks before any wallet send', async ({ page }) => {
  await setup(page); await preflight(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Controlled storage full'); }; });
  await authorize(page);
  await expect(page.getByRole('alert')).toContainText('Controlled storage full');
  expect(await page.evaluate(() => (window as unknown as { testWallet: { sends: number } }).testWallet.sends)).toBe(0);
});

test('expired review and an exceeded gas budget cannot open wallet', async ({ page }) => {
  await page.clock.install();
  await setup(page); await preflight(page);
  await page.clock.fastForward(31_000);
  await expect(page.getByText('REVIEW EXPIRED · RUN AGAIN')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm & open wallet' })).toBeDisabled();
  await page.getByLabel('Maximum gas budget · STT').fill('0.000000000000000001');
  await page.getByRole('button', { name: 'Run preflight · no signature' }).click();
  await expect(page.getByRole('alert')).toContainText('gas', { timeout: 25000 });
});

test('receipt with a different sender is never accepted as execution proof', async ({ page }) => {
  await setup(page, { wrongTransaction: true, receiptMode: 'filled' }); await preflight(page); await authorize(page);
  await expect(page.getByText('Attempt: submitted')).toBeVisible();
  await page.getByRole('link', { name: 'Inspect this attempt' }).click();
  await expect(page.getByRole('alert')).toContainText('does not match');
  await expect(page.getByText('Fully filled in this receipt', { exact: true })).toHaveCount(0);
});

test('account changes revoke reviewed intent before signing', async ({ page }) => {
  await setup(page); await preflight(page);
  await page.evaluate(owner => (window as unknown as { testWallet: { emit(event: string, value: unknown): void } }).testWallet.emit('accountsChanged', [owner]), ACCOUNT_B);
  await expect(page.getByText('PREFLIGHT PASSED', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run preflight · no signature' })).toBeDisabled();
});

test('wallet fork with the same chain ID fails genesis verification before sending', async ({ page }) => {
  await setup(page); await preflight(page);
  await page.evaluate(() => {
    const wallet = (window as unknown as { ethereum: { request(args: { method: string }): Promise<unknown> } }).ethereum;
    const original = wallet.request;
    wallet.request = args => args.method === 'eth_getBlockByNumber' ? Promise.resolve({ hash: `0x${'00'.repeat(32)}` }) : original(args);
  });
  await authorize(page);
  await expect(page.getByRole('alert')).toContainText('Wallet genesis differs');
  expect(await page.evaluate(() => (window as unknown as { testWallet: { sends: number } }).testWallet.sends)).toBe(0);
});

for (const [mode, expected] of [['filled', 'Fully filled in this receipt'], ['reverted', 'Reverted; no order execution from this transaction'], ['no-events', 'Confirmed; business outcome unresolved']] as const) {
  test(`receipt interpretation: ${mode}`, async ({ page }) => {
    await setup(page, { receiptMode: mode }); await preflight(page); await authorize(page);
    await expect(page.getByText('Attempt: submitted')).toBeVisible();
    await page.getByRole('link', { name: 'Inspect this attempt' }).click();
    await page.getByText('Journal details and raw observations', { exact: true }).click(); await expect(page.getByText(expected, { exact: true })).toBeVisible();
  });
}
