import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ACCOUNT_A, ACCOUNT_B, BASE, POOL, mockReads } from './rpc-fixture';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { delegatedSelectors } from '../../packages/perps-adapter/src/operations';
import { selectionKey } from '../../apps/web/src/app/account-selection';
import { encodeFunctionResult, toFunctionSelector } from 'viem';
import { bankAbi } from '../../packages/perps-adapter/src/abi';

type Options = { owners?: string[]; permission?: boolean; chain?: string; delayed?: boolean; unavailable?: boolean; stale?: boolean; malformed?: boolean; many?: boolean; signerMargin?: 'funded' | 'unavailable' };
async function provider(page: Page, actor = ACCOUNT_B, chain = '0xc4cf') {
  await page.addInitScript(({ actor, chain, genesis }) => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const state = { actor, chain, sends: 0, emit: (event: string, value: unknown) => listeners.get(event)?.(value) };
    Object.assign(window, { discoveryWallet: state, ethereum: {
      on: (event: string, fn: (...args: unknown[]) => void) => listeners.set(event, fn), removeListener: (event: string) => listeners.delete(event),
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [state.actor];
        if (method === 'eth_chainId') return state.chain;
        if (method === 'eth_getBlockByNumber') return { hash: genesis };
        if (method === 'wallet_switchEthereumChain') { state.chain = '0xc4cf'; state.emit('chainChanged', state.chain); return null; }
        if (method === 'eth_sendTransaction') state.sends++;
        throw new Error('This test provider cannot sign or send.');
      },
    } });
  }, { actor, chain, genesis: PERPS_CONFIG.genesisHash });
}
async function setup(page: Page, options: Options = {}) {
  await page.route('https://**', route => route.abort());
  await mockReads(page, { permission: options.permission ?? true, transform: (request, value) => {
    const call = request.params?.[0] as { data?: string } | undefined;
    if (options.signerMargin && request.method === 'eth_call' && call?.data?.startsWith(toFunctionSelector('getAccountState(address)')) && call.data.endsWith(ACCOUNT_B.slice(2))) {
      return options.signerMargin === 'unavailable' ? '0x' : encodeFunctionResult({ abi: bankAbi, functionName: 'getAccountState', result: { unlockedCollateralBalance: 5000000n, lockedCollateral: 0n, activePerpPools: [] } });
    }
    return value;
  } });
  await page.route('https://indexer.hyperindex.xyz/ae9785b/v1/graphql', route => route.fulfill({ json: { data: { _meta: [{ chainId: 50383, readyAt: '1' }], FactoryAccount: [], AccountOwner: [] } } }));
  await page.route(PERPS_CONFIG.indexerUrl, async route => {
    const body = route.request().postDataJSON() as { query: string; variables: { operator: string; after: string } };
    if (!body.query.includes('LinkedTradingAccounts')) { await route.fallback(); return; }
    if (options.delayed) await new Promise(resolve => setTimeout(resolve, 900));
    if (options.unavailable) { await route.fulfill({ status: 503, body: 'Unavailable fixture' }); return; }
    const owners = body.variables.operator === ACCOUNT_B ? options.owners ?? [ACCOUNT_A] : [];
    const rows = options.many ? Array.from({ length: 201 }, (_, i) => ({ id: String(Number(body.variables.after || 0) + i + 1).padStart(5, '0'), user: ACCOUNT_A })) : owners.map((user, i) => ({ id: String(i + 1), user }));
    await route.fulfill({ json: { data: { OperatorApproval: rows.map(row => ({ ...row, operator: options.malformed ? ACCOUNT_A : body.variables.operator, pool: POOL, selector: delegatedSelectors[0], allowed: true, isDenial: false, updatedAt: '1' })), chain_metadata: options.stale ? [] : [{ chain_id: 50383, latest_processed_block: 100 }] } } });
  });
  await provider(page, ACCOUNT_B, options.chain);
  await page.goto('/positions');
  await page.getByRole('button', { name: 'Connect signing wallet', exact: true }).click();
}
async function manual(page: Page, address: string) {
  const details = page.getByRole('region', { name: 'Shared account setup' }).locator('details').first();
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await page.getByLabel('Trading account address · saved for this signer').fill(address);
  await page.getByRole('button', { name: 'Use trading account', exact: true }).click();
}
async function noSend(page: Page) { expect(await page.evaluate(() => (window as unknown as { discoveryWallet: { sends: number } }).discoveryWallet.sends)).toBe(0); }

test('one verified linked account is selected automatically with no pasted address or signature', async ({ page }, info) => {
  await setup(page);
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await expect(page.getByText('Linked trading account found automatically.', { exact: false })).toBeVisible();
  await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).toBeVisible();
  await page.locator('.header-wallet').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Linked permission observed', { exact: true })).toBeVisible();
  await expect(dialog.locator('.account-choice-metrics')).toContainText('100 USDso');
  await expect(dialog.getByRole('link', { name: 'Grant trading permission in dreamDEX' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('account-desktop.png') });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`account-${width}.png`) });
  }
  await noSend(page);
});

test('wrong-network selection is saved, restored and remains review-gated after switching', async ({ page }) => {
  await setup(page, { chain: '0x1', unavailable: true }); await manual(page, ACCOUNT_A);
  expect(await page.evaluate(key => localStorage.getItem(key), selectionKey(ACCOUNT_B))).toBe(ACCOUNT_A);
  await page.reload(); await page.locator('.header-wallet').click(); await page.getByRole('button', { name: /Browser wallet/ }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.getByRole('button', { name: 'Switch wallet to Somnia testnet' }).click();
  await expect(page.getByRole('button', { name: 'Resume selected trading account' })).toBeVisible();
  await page.getByRole('button', { name: 'Close wallet dialog' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Trade', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check operation · no signature' })).toBeDisabled(); await noSend(page);
});

test('several discovered accounts require a deliberate selection', async ({ page }) => {
  await setup(page, { owners: [ACCOUNT_A, BASE] });
  await expect(page.locator('.account-choice-card')).toHaveCount(2);
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
  await page.getByRole('button', { name: `Use ${ACCOUNT_A}`, exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A); await noSend(page);
});

test('an indexed grant with revoked on-chain permission is not automatically selected', async ({ page }) => {
  await setup(page, { permission: false }); await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('No permission in checked markets')).toBeVisible();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
  await page.getByRole('dialog').getByRole('button', { name: `${ACCOUNT_A} Use account`, exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Grant trading permission in dreamDEX' })).toBeVisible(); await noSend(page);
});

for (const mode of ['stale', 'malformed', 'many', 'unavailable'] as const) test(`incomplete discovery (${mode}) never silently chooses an account`, async ({ page }) => {
  await setup(page, { [mode]: true }); await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('Discovery is incomplete', { exact: true })).toBeVisible();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B); await noSend(page);
});

test('late discovery cannot overwrite manual selection or public inspection', async ({ page }) => {
  await setup(page, { delayed: true }); await manual(page, BASE);
  await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('Linked permission observed')).toBeVisible();
  await expect(page.getByTestId('selected-account')).toHaveText(BASE);
  await page.getByRole('dialog').getByRole('button', { name: 'Inspect only', exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.getByRole('dialog').getByRole('button', { name: 'Refresh accounts' }).click();
  await expect(page.getByRole('dialog').getByText('Linked permission observed')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Viewing account · read-only')).toBeVisible();
  await page.getByRole('button', { name: 'Resume selected trading account' }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(BASE); await noSend(page);
});

test('switching signing wallets cannot inherit the previous trading account or review', async ({ page }) => {
  await setup(page); await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.evaluate(address => { const state = (window as unknown as { discoveryWallet: { actor: string; emit(e: string, v: unknown): void } }).discoveryWallet; state.actor = address; state.emit('accountsChanged', [address]); }, BASE);
  await expect(page.getByTestId('selected-account')).toHaveText(BASE);
  await expect(page.getByRole('button', { name: 'Return to trading account' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Trade', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run preflight · no signature' })).toBeDisabled(); await noSend(page);
});

test('legacy signer defaults upgrade to discovery but an explicit signer selection persists', async ({ page }) => {
  await page.addInitScript(({ key, actor }) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, actor); sessionStorage.setItem('seeded', '1'); } }, { key: selectionKey(ACCOUNT_B), actor: ACCOUNT_B });
  await setup(page); await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await manual(page, ACCOUNT_B);
  await page.reload(); await page.locator('.header-wallet').click(); await page.getByRole('button', { name: /Browser wallet/ }).click();
  await expect(page.getByRole('dialog').getByText('Linked permission observed')).toBeVisible();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B); await noSend(page);
});

test('automatic discovery after network switching cannot resume a signing session', async ({ page }) => {
  await setup(page, { chain: '0x1' }); await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('Linked permission observed')).toBeVisible();
  await page.getByRole('button', { name: 'Switch wallet to Somnia testnet' }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await expect(page.getByRole('button', { name: 'Resume selected trading account' })).toBeVisible(); await noSend(page);
});

for (const signerMargin of ['funded', 'unavailable'] as const) test(`a ${signerMargin} signing account is not silently replaced`, async ({ page }) => {
  await setup(page, { signerMargin }); await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('Linked permission observed')).toBeVisible();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B); await noSend(page);
});

test('live browser discovers the supplied public linked account without signing', async ({ page }, info) => {
  test.skip(process.env.PEI_LIVE_READS !== '1', 'Live public reads require opt-in.'); test.setTimeout(90000);
  const evidence = JSON.parse(await readFile('docs/research/account-discovery-live.json', 'utf8')) as { signer: string; expected: string };
  // Only the provider address is stubbed. SDK, GraphQL, RPC and permission reads are live.
  await provider(page, evidence.signer);
  const csp = (await readFile('apps/web/public/_headers', 'utf8')).split('Content-Security-Policy: ')[1]!.trim();
  await page.route('http://127.0.0.1:4173/guide', async route => { const response = await route.fetch(); await route.fulfill({ response, headers: { ...response.headers(), 'Content-Security-Policy': csp } }); });
  await page.goto('/guide'); await page.locator('.header-wallet').click(); await page.getByRole('button', { name: /Browser wallet/ }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(evidence.expected, { timeout: 25000 });
  await expect(page.getByRole('dialog').getByText('Linked permission observed')).toBeVisible();
  await page.screenshot({ path: info.outputPath('live-linked-account.png') }); await noSend(page);
});
