import { expect, test, type Page } from '@playwright/test';
import { decodeFunctionData, erc20Abi } from 'viem';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { operationsAbi, delegatedSelectors } from '../../packages/perps-adapter/src/operations';
import { readOperations } from '../../apps/web/src/app/operation-store';
import { ACCOUNT_A, ACCOUNT_B, BASE, POOL, TX_HASH, mockReads, type FixtureOptions } from './rpc-fixture';

async function setup(page: Page, opts: FixtureOptions = {}, actor = ACCOUNT_A, outcome = 'hash') {
  opts.operations = true; await mockReads(page, opts);
  await page.exposeFunction('operationSent', (value: NonNullable<FixtureOptions['sent']>) => { opts.sent = value; });
  await page.addInitScript(({ actor, hash, genesis, outcome }) => {
    const state = { sends: 0 }; Object.assign(window, { operationWallet: state });
    Object.defineProperty(window, 'ethereum', { value: { on() {}, removeListener() {}, request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [actor];
      if (method === 'eth_chainId') return '0xc4cf'; if (method === 'eth_getBlockByNumber') return { hash: genesis };
      if (method === 'eth_sendTransaction') { state.sends++; await (window as unknown as { operationSent(v: unknown): Promise<void> }).operationSent(params?.[0]); if (outcome === 'unknown') throw new Error('Lost transport'); if (outcome === 'reject') throw { code: 4001 }; return hash; }
      throw new Error('Unexpected wallet method');
    } } });
  }, { actor, hash: TX_HASH, genesis: PERPS_CONFIG.genesisHash, outcome });
  await page.goto('/positions'); await page.getByText('Inspect another address or manage wallet connection', { exact: true }).click(); await page.getByRole('button', { name: 'Connect browser wallet' }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(actor);
  await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText('Somnia testnet · 50383', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close wallet dialog' }).click();
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Account operations', exact: true }).click();
}
async function check(page: Page) { await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByRole('button', { name: 'Confirm operation & open wallet' })).toBeVisible({ timeout: 25000 }); }
async function send(page: Page) { await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Confirm operation & open wallet' }).click(); }
async function sends(page: Page) { return page.evaluate(() => (window as unknown as { operationWallet: { sends: number } }).operationWallet.sends); }

test('exact approval is separate, requires confirmation and verifies the actual receipt', async ({ page }) => {
  const opts: FixtureOptions = {}; await setup(page, opts); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('approve'); await page.getByLabel('Collateral amount').fill('2.125'); await check(page);
  expect(await sends(page)).toBe(0); await expect(page.getByRole('button', { name: 'Confirm operation & open wallet' })).toBeDisabled(); await send(page);
  await expect(page.getByRole('heading', { name: 'Set exact bank allowance · submitted' })).toBeVisible();
  expect(opts.sent?.to.toLowerCase()).toBe(PERPS_CONFIG.collateral.toLowerCase()); expect(decodeFunctionData({ abi: erc20Abi, data: opts.sent!.data }).args).toEqual([PERPS_CONFIG.marginBank, 2125000n]);
  await page.getByRole('button', { name: 'Verify actual receipt' }).click(); await expect(page.getByText('Canonical receipt: success', { exact: false })).toBeVisible(); expect(await sends(page)).toBe(1);
  await page.getByLabel('Transaction hash · inspect or recover').fill(`0x${'ab'.repeat(32)}`);
  await expect(page.getByText('Canonical receipt: success', { exact: false })).toHaveCount(0);
  await page.getByLabel('Transaction hash · inspect or recover').fill(TX_HASH);
  await expect(page.getByText('Canonical receipt: success', { exact: false })).toBeVisible();
});
test('deposit without allowance, excessive withdrawal and dormant voucher never open wallet', async ({ page }) => {
  await setup(page); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('deposit'); await page.getByLabel('Collateral amount').fill('2'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('Deposit exceeds wallet balance', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('withdraw'); await page.getByLabel('Collateral amount').fill('100'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('Withdrawal exceeds', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('voucher'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('Voucher is ineligible: dormant.')).toBeVisible(); expect(await sends(page)).toBe(0);
});
test('existing approval must be zeroed; deposit uses exact amount and never an implicit approval', async ({ page }) => {
  const opts: FixtureOptions = { bankAllowance: 3000000n }; await setup(page, opts); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('approve'); await page.getByLabel('Collateral amount').fill('2'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('Reset the existing bank allowance', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('deposit'); await check(page); await send(page); await expect(page.getByRole('heading', { name: 'Deposit margin · submitted' })).toBeVisible();
  expect(decodeFunctionData({ abi: operationsAbi, data: opts.sent!.data })).toMatchObject({ functionName: 'deposit', args: [2000000n] }); expect(await sends(page)).toBe(1);
});
test('wrong owner blocks owner operations; revoked delegated permission is rechecked before signing', async ({ page }) => {
  const opts: FixtureOptions = { permission: true }; await setup(page, opts, ACCOUNT_B);
  await page.getByLabel('Receiving owner account').fill(ACCOUNT_A); await expect(page.getByRole('button', { name: 'Check operation · no signature' })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-cancel'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Order ID', { exact: true }).fill('7'); await check(page);
  opts.permission = false; await send(page); await expect(page.getByText('Required operator permission is absent or revoked.')).toBeVisible(); expect(await sends(page)).toBe(0);
});
test('delegated cancellation preserves owner while actor signs and pays gas', async ({ page }) => {
  const opts: FixtureOptions = { permission: true }; await setup(page, opts, ACCOUNT_B); await page.getByLabel('Receiving owner account').fill(ACCOUNT_A); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-cancel'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Order ID', { exact: true }).fill('7'); await check(page); await send(page);
  await expect(page.getByRole('heading', { name: 'Operator: cancel resting order · submitted' })).toBeVisible(); expect(opts.sent?.from).toBe(ACCOUNT_B); expect(decodeFunctionData({ abi: operationsAbi, data: opts.sent!.data })).toMatchObject({ functionName: 'cancelOrderFor', args: [ACCOUNT_A, 7n] });
});
test('stop creation blocks without permission; a linked pair has exactly two native payments', async ({ page }) => {
  const opts: FixtureOptions = { permission: false }; await setup(page, opts); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('stop-create'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Base quantity', { exact: true }).fill('1'); await page.getByLabel('Limit price').fill('10'); await page.getByLabel('Mark trigger price').fill('11'); await page.getByLabel('Optional paired trigger').fill('13');
  await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('Stop registry lacks placement permission.', { exact: false })).toBeVisible(); expect(await sends(page)).toBe(0);
  opts.permission = true; await check(page); await expect(page.getByText('Native payment: 0.3 STT', { exact: false })).toBeVisible(); await send(page); await expect(page.getByRole('heading', { name: 'Create owner TP/SL · submitted' })).toBeVisible(); expect(BigInt(opts.sent!.value!)).toBe(300000000000000000n); expect(opts.sent?.to).toBe(BASE); expect(decodeFunctionData({ abi: operationsAbi, data: opts.sent!.data }).functionName).toBe('createLinkedPendingOrders');
});
test('stop cancellation checks liveness and refunds require a nonzero claimable credit', async ({ page }) => {
  const opts: FixtureOptions = { stopLive: false }; await setup(page, opts); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('stop-cancel'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Order ID', { exact: true }).fill('11'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('No live stop owned', { exact: false })).toBeVisible();
  opts.stopLive = true; await check(page); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('stop-refund'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('No unclaimed native refund exists.')).toBeVisible(); expect(await sends(page)).toBe(0);
});
test('pool-scoped operator grant contains only trading selectors', async ({ page }) => {
  const opts: FixtureOptions = {}; await setup(page, opts); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-grant'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Operator address').fill(ACCOUNT_B); await check(page); await send(page); await expect(page.getByRole('heading', { name: 'Grant trading operator on this pool · submitted' })).toBeVisible();
  expect(decodeFunctionData({ abi: operationsAbi, data: opts.sent!.data })).toMatchObject({ functionName: 'setOperatorApprovalForPool', args: [POOL, ACCOUNT_B, [...delegatedSelectors], true] });
});
test('ambiguous operation blocks another send after reload and a wrong recovered call is rejected', async ({ page }) => {
  const opts: FixtureOptions = {}; await setup(page, opts, ACCOUNT_A, 'unknown'); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('approve'); await page.getByLabel('Collateral amount').fill('2'); await check(page); await send(page); await expect(page.getByRole('heading', { name: 'Set exact bank allowance · unknown' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Set exact bank allowance · unknown' })).toBeVisible();
  opts.wrongTransaction = true; await page.getByLabel('Transaction hash').fill(TX_HASH); await page.getByRole('button', { name: 'Verify actual receipt' }).click(); await expect(page.getByText('Receipt does not canonically match', { exact: false })).toBeVisible();
});
test('operation journal rejects invalid storage and strips extra credential fields', () => {
  const row = { id: '00000000-0000-0000-0000-000000000000', kind: 'approve', nonce: 0, owner: ACCOUNT_A, actor: ACCOUNT_A, to: PERPS_CONFIG.collateral, data: '0x12345678', value: '0', createdAt: 1, status: 'unknown', privateKey: 'secret' };
  expect(JSON.stringify(readOperations(JSON.stringify([row])))).not.toContain('secret'); expect(() => readOperations(JSON.stringify([{ ...row, data: 'javascript:alert(1)' }]))).toThrow();
});
test('nonce changes invalidate review and historical identical calls cannot resolve an unknown send', async ({ page }) => {
  const opts: FixtureOptions = {}; await setup(page, opts, ACCOUNT_A, 'unknown'); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('approve'); await page.getByLabel('Collateral amount').fill('2'); await check(page);
  opts.pendingNonce = 1; await send(page); await expect(page.getByText('Operation, nonce or gas changed.', { exact: false })).toBeVisible(); expect(await sends(page)).toBe(0);
  await check(page); await send(page); await expect(page.getByRole('heading', { name: 'Set exact bank allowance · unknown' })).toBeVisible();
  await page.getByLabel('Transaction hash').fill(TX_HASH); await page.getByRole('button', { name: 'Verify actual receipt' }).click(); await expect(page.getByText('Receipt does not canonically match', { exact: false })).toBeVisible();
  // A new review may be read, but the persisted unresolved operation blocks another wallet request.
  await check(page); await send(page); await expect(page.getByText('An earlier operation or order is unresolved.', { exact: false })).toBeVisible(); expect(await sends(page)).toBe(1);
});
test('native payment plus gas must fit the actor balance', async ({ page }) => {
  await setup(page, { permission: true, nativeBalance: '0x1' }); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('stop-create'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Base quantity', { exact: true }).fill('1'); await page.getByLabel('Limit price').fill('10'); await page.getByLabel('Mark trigger price').fill('11'); await page.getByRole('button', { name: 'Check operation · no signature' }).click(); await expect(page.getByText('Gas ceiling exceeds', { exact: false })).toBeVisible(); expect(await sends(page)).toBe(0);
});
test('delegated placement and remainder reduction preserve exact raw units', async ({ page }) => {
  const opts: FixtureOptions = { permission: true }; await setup(page, opts, ACCOUNT_B); await page.getByLabel('Receiving owner account').fill(ACCOUNT_A); await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-place'); await page.getByLabel('Operation market').selectOption(POOL); await page.getByLabel('Base quantity', { exact: true }).fill('1'); await page.getByLabel('Limit price').fill('12'); await check(page);
  await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('delegate-reduce'); await page.getByLabel('Order ID', { exact: true }).fill('7'); await page.getByLabel('Base quantity', { exact: false }).fill('0.5'); await check(page); await send(page); await expect(page.getByRole('heading', { name: 'Operator: reduce resting remainder · submitted' })).toBeVisible(); expect(decodeFunctionData({ abi: operationsAbi, data: opts.sent!.data })).toMatchObject({ functionName: 'reduceOrderFor', args: [ACCOUNT_A, 7n, 500000000n] });
});


