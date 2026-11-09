import { expect, test } from '@playwright/test';
import { ACCOUNT_A, ACCOUNT_B, mockReads } from './rpc-fixture';

for (const fault of ['wrongChain', 'wrongGenesis', 'wrongSystem'] as const) {
  test(`${fault} blocks market reads`, async ({ page }) => {
    const fixture = await mockReads(page, { [fault]: true });
    await page.goto('/markets');
    await expect(page.getByText(/Network identity mismatch|Deployment verification failed/)).toBeVisible();
    await expect(page.getByText('1 factory pools')).not.toBeVisible();
    if (fault !== 'wrongSystem') expect(fixture.calls.some(call => call.method === 'eth_call')).toBe(false);
  });
}

test('chain discovery survives indexer failure and uses actual token decimals', async ({ page }) => {
  const fixture = await mockReads(page);
  await page.goto('/markets');
  await expect(page.getByText('1 factory pools')).toBeVisible();
  await page.locator('.data-warnings summary').click();
  await expect(page.getByText(/Indexer discovery unavailable:/)).toBeVisible();
  await page.getByRole('button', { name: 'Inspect MOCK' }).click();
  await expect(page.getByRole('heading', { name: 'Resting bids' })).toBeVisible();
  await expect(page.getByText('9 / 6', { exact: true })).toBeVisible();
  await expect(page.locator('.compact-table').first().getByRole('cell', { name: '1.5', exact: true })).toBeVisible();
  await expect(page.getByText('0.001 TESTUSD', { exact: true })).toBeVisible();
  expect(fixture.calls.filter(call => call.method === 'eth_call').every(call => call.params[1] === '0x64')).toBe(true);
  expect(fixture.calls.every(call => !/send|sign/i.test(call.method))).toBe(true);
});

test('failed mark stays unpriceable and RPC failure can recover', async ({ page }) => {
  const fixture = await mockReads(page, { offline: true, unpriceable: true });
  await page.goto('/markets');
  await expect(page.getByText('Read failed', { exact: true })).toBeVisible({ timeout: 15000 });
  fixture.options.offline = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('1 factory pools')).toBeVisible();
  await page.getByRole('button', { name: 'Inspect MOCK' }).click();
  await expect(page.locator('.live-metrics').getByText('Unpriceable', { exact: true })).toBeVisible();
});

test('account keeps unpriceable positions, failed health and observed orders', async ({ page }) => {
  await mockReads(page, { unpriceable: true, failHealth: true });
  await page.goto('/positions');
  if (!(await page.getByLabel('Account to inspect', { exact: true }).isVisible())) await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click();
  await page.getByLabel('Account to inspect', { exact: true }).fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Inspect address' }).click();
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).toBeVisible();
  await expect(page.getByText('Contract reports this market as unpriceable; position is retained.')).toBeVisible();
  await expect(page.locator('.live-metrics article').first().locator('strong')).toHaveText('—');
  await expect(page.locator('.order-panel').getByRole('cell').filter({ hasText: '#7' })).toBeVisible();
  if (!(await page.getByLabel('Account to inspect', { exact: true }).isVisible())) await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click();
  await page.getByLabel('Account to inspect', { exact: true }).fill(ACCOUNT_B);
  await page.getByRole('button', { name: 'Inspect address' }).click();
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).not.toBeVisible();
  await expect(page.getByText('No non-flat positions observed in bank-active and indexed pools at this block.')).toBeVisible();
  await expect(page.getByText('No pending orders observed across the enumerated pools.')).toBeVisible();
});

test('wallet connects without signing, account events clear stale identity, and disconnect clears data', async ({ page }) => {
  await mockReads(page);
  await page.addInitScript(({ first, second }) => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const methods: string[] = [];
    Object.assign(window, {
      ethereum: {
        request: async ({ method }: { method: string }) => { methods.push(method); if (method === 'eth_requestAccounts') return [first]; if (method === 'eth_chainId') return '0x1'; throw new Error('Forbidden wallet method'); },
        on: (event: string, handler: (...args: unknown[]) => void) => listeners.set(event, handler),
        removeListener: (event: string) => listeners.delete(event),
      },
      walletTest: { methods, switch: () => listeners.get('accountsChanged')?.([second]), changeChain: () => listeners.get('chainChanged')?.('0xc4cf') },
    });
  }, { first: ACCOUNT_A, second: ACCOUNT_B });
  await page.goto('/positions');
  await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click(); await page.getByRole('button', { name: 'Connect browser wallet' }).click();
  await expect(page.getByText(/Wrong wallet network \(1\)/)).toBeVisible();
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { walletTest: { switch(): void } }).walletTest.switch());
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).not.toBeVisible();
  await expect(page.getByText('No non-flat positions observed in bank-active and indexed pools at this block.')).toBeVisible();
  await page.evaluate(() => (window as unknown as { walletTest: { changeChain(): void } }).walletTest.changeChain());
  await expect(page.getByRole('button', { name: 'Return to trading account' })).toBeVisible();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Shared account setup' })).toContainText('Not connected');
  const methods = await page.evaluate(() => (window as unknown as { walletTest: { methods: string[] } }).walletTest.methods);
  expect(methods).toEqual(['eth_requestAccounts', 'eth_chainId']);
});

test('leaving a market cancels in-flight RPC and stops route polling', async ({ page }) => {
  await mockReads(page);
  let started = false;
  await page.route('https://api.hideki2.infra.testnet.somnia.network', async route => {
    started = true;
    await new Promise(resolve => setTimeout(resolve, 800));
    await route.abort().catch(() => {});
  });
  await page.goto('/markets');
  await expect.poll(() => started).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(1000);
  let callsAfterUnmount = 0;
  page.on('request', request => { if (request.url().includes('hideki')) callsAfterUnmount++; });
  await page.clock.install();
  await page.clock.fastForward(65000);
  expect(callsAfterUnmount).toBe(0);
});
