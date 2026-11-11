import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { ACCOUNT_A, ACCOUNT_B, POOL, mockReads } from './rpc-fixture';

async function wallet(page: Page, indexedCandidate = false) {
  await page.route('https://**', route => route.abort());
  await mockReads(page, { permission: true });
  if (indexedCandidate) {
    // Exercise the real SDK decoder and the release's actual connect-src policy.
    const header = (await readFile('apps/web/public/_headers', 'utf8')).split('Content-Security-Policy: ')[1]!.trim();
    await page.route('http://127.0.0.1:4173/positions', async route => {
      const response = await route.fetch(); await route.fulfill({ response, headers: { ...response.headers(), 'Content-Security-Policy': header } });
    });
    await page.route('https://indexer.hyperindex.xyz/ae9785b/v1/graphql', route => {
      const factory = { accountId: ACCOUNT_B, index: '0', deployer: ACCOUNT_B, createdAtBlock: '1', createdAtTimestamp: '1', authorization: '0x', accountIdIsOwner: true };
      const account = { chainId: 50383, id: ACCOUNT_A, firstSeenBlock: '1', firstSeenTimestamp: '1', threshold: '1', ownerCount: 1, moduleCount: 0, executionCount: '0', failedExecutionCount: '0', factory: [factory] };
      const accounts = [account, { ...account, id: `0x${'44'.repeat(20)}` }, { ...account, id: `0x${'00'.repeat(20)}` }];
      return route.fulfill({ json: { data: { _meta: [{ chainId: 50383, readyAt: '1' }], FactoryAccount: [{ account }], AccountOwner: accounts.map((row, index) => ({ id: `owner-${index}`, addedAtBlock: '1', addedAtTimestamp: '1', account: row })) } } });
    });
  }
  await page.addInitScript(({ actor, genesis }) => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const state = { actor, chain: '0xc4cf', sends: 0, emit: (event: string, value: unknown) => listeners.get(event)?.(value) };
    Object.assign(window, { uxWallet: state, ethereum: {
      on: (event: string, fn: (...args: unknown[]) => void) => listeners.set(event, fn), removeListener: (event: string) => listeners.delete(event),
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [state.actor];
        if (method === 'eth_chainId') return state.chain;
        if (method === 'eth_getBlockByNumber') return { hash: genesis };
        if (method === 'wallet_switchEthereumChain') { state.chain = '0xc4cf'; state.emit('chainChanged', state.chain); return null; }
        if (method === 'eth_sendTransaction') { state.sends++; throw { code: 4001 }; }
        throw new Error('Unexpected wallet method');
      },
    } });
  }, { actor: ACCOUNT_B, genesis: PERPS_CONFIG.genesisHash });
  await page.goto('/positions');
  await page.getByRole('button', { name: 'Connect signing wallet', exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
}
async function selectFunded(page: Page) {
  const setup = page.getByRole('region', { name: 'Shared account setup' });
  const details = setup.locator('details').first();
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await page.getByLabel('Trading account address · saved for this signer').fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Use trading account', exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
}
async function navigate(page: Page, label: string) {
  const parent = label === 'Risk Lab' ? 'Positions' : null;
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: parent ?? label, exact: true }).click();
  if (parent) await page.getByRole('navigation', { name: 'Workspace tabs' }).getByRole('link', { name: label, exact: true }).click();
}

test('under the shipping CSP indexed candidates are deduplicated and selected deliberately', async ({ page }) => {
  await wallet(page, true);
  await expect(page.locator('.account-choice-card')).toHaveCount(2);
  const details = page.getByRole('region', { name: 'Shared account setup' }).locator('details').first();
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  const candidate = page.getByRole('button', { name: `Use ${ACCOUNT_A}`, exact: true });
  await expect(candidate).toHaveCount(1);
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
  await candidate.click(); await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
});

test('wallet dialog automatically displays discovered accounts without granting or sending a trade', async ({ page }) => {
  await wallet(page, true);
  await page.locator('.header-wallet').click();
  const dialog = page.getByRole('dialog');
  const accounts = dialog.getByRole('region', { name: 'Discovered trading accounts' });
  const candidate = accounts.getByRole('button', { name: `${ACCOUNT_A} Use account`, exact: true });
  await expect(candidate).toBeVisible();
  await expect(accounts.locator('.account-candidate-list .choose-account')).toHaveCount(2);
  await expect(accounts.getByRole('button', { name: /0x0000000000000000000000000000000000000000/ })).toHaveCount(0);
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
  await candidate.click();
  await expect(accounts.getByRole('button', { name: `${ACCOUNT_A} Selected`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  expect(await page.evaluate(() => (window as unknown as { uxWallet: { sends: number } }).uxWallet.sends)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('funded account persists across pages and reconnect, signer stays separate', async ({ page }, info) => {
  await wallet(page); await selectFunded(page);
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).toBeVisible();
  await navigate(page, 'Overview');
  await expect(page.locator('.positions-preview').getByRole('cell', { name: '1.5', exact: true })).toBeVisible();
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toContainText('103');
  await navigate(page, 'Trade');
  await expect(page.getByLabel('Receiving owner account')).toHaveValue(ACCOUNT_A);
  await expect(page.getByRole('combobox', { name: 'Action', exact: true })).toHaveCount(0);
  await expect(page.getByText('Post-only limit · linked account', { exact: true })).toBeVisible();
  await navigate(page, 'Risk Lab');
  await expect(page.getByText('Baseline reconciled exactly with on-chain health')).toBeVisible();
  await page.screenshot({ path: info.outputPath('linked-risk-desktop.png'), fullPage: true });
  await page.reload();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await expect(page.locator('.account-drawer > summary')).toContainText('Viewing account');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Connect a wallet' });
  await dialog.getByRole('button', { name: /Browser wallet/ }).click();
  await page.getByRole('button', { name: 'Close wallet dialog' }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.locator('.account-drawer > summary').click();
  await expect(page.getByRole('region', { name: 'Shared account setup' })).toContainText(ACCOUNT_B);
  expect(await page.evaluate(() => (window as unknown as { uxWallet: { sends: number } }).uxWallet.sends)).toBe(0);
});

test('public lookup retains connection but blocks writes until deliberate return', async ({ page }) => {
  await wallet(page); await selectFunded(page);
  if (!(await page.getByLabel('Account to inspect', { exact: true }).isVisible())) await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click();
  await page.getByLabel('Account to inspect', { exact: true }).fill(ACCOUNT_B);
  await page.getByRole('button', { name: 'Inspect address', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to trading account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disconnect', exact: true })).toBeVisible();
  await navigate(page, 'Trade');
  await expect(page.getByRole('button', { name: 'Run preflight · no signature' })).toBeDisabled();
  await page.locator('.account-drawer > summary').click();
  await page.getByRole('button', { name: 'Return to trading account' }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await expect(page.getByLabel('Receiving owner account')).toHaveValue(ACCOUNT_A);
});

test('linked trader can inspect the selected book and return to the same market', async ({ page }) => {
  await wallet(page); await selectFunded(page); await navigate(page, 'Trade');
  await page.getByLabel('Operation market').selectOption(POOL);
  await page.getByRole('link', { name: 'Inspect current book in Markets' }).click();
  await expect(page).toHaveURL(new RegExp(POOL + '#selected-market$'));
  await expect(page.getByRole('heading', { name: 'Resting bids' })).toBeVisible();
  await page.getByRole('link', { name: 'Compose an order' }).click();
  await expect(page.getByLabel('Operation market')).toHaveValue(POOL);
  await expect(page.getByLabel('Receiving owner account')).toHaveValue(ACCOUNT_A);
});

test('compact trade keeps account setup on demand and advanced operations accessible', async ({ page }, info) => {
  await wallet(page); await selectFunded(page); await navigate(page, 'Trade');
  await expect(page.locator('.account-drawer')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Receiving owner account')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Receiving owner account')).not.toBeVisible();
  await page.getByText('Signing and trading account details', { exact: true }).click();
  await expect(page.getByLabel('Receiving owner account')).toBeVisible();
  await page.getByText('Signing and trading account details', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Action', exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link')).toHaveCount(7);
  await expect(page.getByRole('navigation', { name: 'Workspace tabs' }).getByRole('link', { name: 'Markets', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('compact-linked-trade-desktop.png'), fullPage: true });
  await page.locator('.header-wallet').click();
  await page.getByRole('button', { name: 'Manage trading account', exact: true }).click();
  await expect(page.locator('.account-drawer')).toHaveAttribute('open', '');
  await expect(page.getByLabel('Trading account address · saved for this signer')).toBeFocused();
  await page.locator('.account-drawer > summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect((await page.getByLabel('Operation market').boundingBox())!.y).toBeLessThan(600);
  await page.screenshot({ path: info.outputPath('compact-linked-trade-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Manage existing orders, collateral and permissions' }).click();
  await expect(page.getByRole('combobox', { name: 'Action', exact: true })).toBeVisible();
  await expect(page.getByLabel('Receiving owner account')).not.toHaveAttribute('readonly');
  expect(await page.evaluate(() => (window as unknown as { uxWallet: { sends: number } }).uxWallet.sends)).toBe(0);
});

test('order recovery switches network and resumes explicitly without a transaction', async ({ page }) => {
  await wallet(page); await selectFunded(page); await navigate(page, 'Trade');
  await page.evaluate(() => { const state = (window as unknown as { uxWallet: { chain: string; emit(e: string, v: unknown): void } }).uxWallet; state.chain = '0x1'; state.emit('chainChanged', '0x1'); });
  await page.getByRole('button', { name: 'Switch network to 50383', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check operation · no signature' })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume selected trading account', exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await expect(page.getByRole('button', { name: 'Resume selected trading account', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { uxWallet: { sends: number } }).uxWallet.sends)).toBe(0);
});

test('network change invalidates checked delegated call even after returning to testnet', async ({ page }) => {
  await wallet(page); await selectFunded(page); await navigate(page, 'Trade');
  await page.getByLabel('Operation market').selectOption(POOL);
  await page.getByLabel('Base quantity', { exact: true }).fill('1');
  await page.getByLabel('Limit price').fill('13');
  await page.getByRole('button', { name: 'Check operation · no signature' }).click();
  await expect(page.getByRole('button', { name: 'Confirm operation & open wallet' })).toBeVisible();
  await page.evaluate(() => { const state = (window as unknown as { uxWallet: { chain: string; emit(e: string, v: unknown): void } }).uxWallet; state.chain = '0x1'; state.emit('chainChanged', '0x1'); });
  await expect(page.getByRole('button', { name: 'Confirm operation & open wallet' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check operation · no signature' })).toBeDisabled();
  await page.locator('.account-drawer > summary').click();
  await page.getByRole('button', { name: 'Switch wallet to testnet' }).click();
  await page.getByRole('button', { name: 'Return to trading account' }).click();
  await expect(page.getByRole('button', { name: 'Confirm operation & open wallet' })).toHaveCount(0);
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
});

test('manual receiving owner selection updates the dashboard, invalid address blocks check', async ({ page }) => {
  await wallet(page); await navigate(page, 'Account operations');
  await page.getByLabel('Receiving owner account').fill(ACCOUNT_A);
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.getByLabel('Receiving owner account').fill('bad');
  await expect(page.getByRole('button', { name: 'Check operation · no signature' })).toBeDisabled();
  await expect(page.getByText('Enter a valid nonzero receiving owner account.', { exact: true })).toHaveCount(2);
  await navigate(page, 'Overview');
  await expect(page.locator('.positions-preview').getByText('MOCK', { exact: true })).toBeVisible();
});

test('automatic risk stays frozen, account switch replaces it and mobile fits', async ({ page }, info) => {
  const options = { healthOffset: 0n }; await mockReads(page, options);
  await page.goto('/positions/risk'); await page.getByLabel('Account to analyze').fill(ACCOUNT_A); await page.getByRole('button', { name: 'Inspect risk account' }).click();
  await expect(page.getByText('Baseline reconciled exactly with on-chain health')).toBeVisible();
  options.healthOffset = 1n;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use latest snapshot & reset scenarios' })).toBeEnabled();
  await expect(page.getByText('Baseline reconciled exactly with on-chain health')).toBeVisible();
  await page.getByRole('button', { name: 'Use latest snapshot & reset scenarios' }).click();
  await expect(page.getByText('Portfolio totals withheld · incomplete or mismatched baseline')).toBeVisible();
  await page.getByLabel('Account to analyze').fill(ACCOUNT_B); await page.getByRole('button', { name: 'Inspect risk account' }).click();
  await expect(page.getByText('No non-flat positions in this snapshot.', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('account-setup-mobile.png'), fullPage: true });
});

test('guided scenarios begin unrun and export only user-recorded results', async ({ page }) => {
  await page.route('https://**', route => route.abort()); await page.goto('/test-lab');
  const tests = page.locator('.guided-tests'); await expect(tests.locator('details')).toHaveCount(24);
  await tests.getByText('U01 · Select the funded account', { exact: true }).click();
  await tests.getByLabel('Result for U01', { exact: true }).selectOption('BLOCKED');
  await tests.getByLabel('Observations for U01', { exact: true }).fill('No wallet extension in this test.');
  const download = page.waitForEvent('download'); await tests.getByRole('button', { name: 'Download JSON evidence' }).click();
  const report = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(report.cases[0].status).toBe('BLOCKED'); expect(report.cases.slice(1).every((row: { status: string }) => row.status === 'NOT RUN')).toBe(true);
});
