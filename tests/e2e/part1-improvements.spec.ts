import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { ACCOUNT_A, ACCOUNT_B, POOL, mockReads } from './rpc-fixture';

const legacy = 'pei.manual-tests.v1.50383.viewer.none';
const durable = 'pei.manual-tests.v2.50383.viewer.none';
const viewKey = `pei.selection.v1.50383.${PERPS_CONFIG.genesisHash}.view`;
async function offline(page: Page) { await page.route('https://**', route => route.abort()); }
async function openCase(page: Page, id = 'U04') { await page.locator('.guided-tests summary').filter({ hasText: id }).click(); }
async function saved(page: Page) { await expect(page.locator('.note-save-status')).toContainText('Saved on this browser/device'); }
function report(cases: unknown[], owner: string | null = null) { return { schema: 'pei-manual-tests-v1', chainId: 50383, owner, signer: null, cases }; }
async function importReport(page: Page, value: unknown) { await page.getByLabel('Import guided-tests JSON').setInputFiles({ name: 'report.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) }); }

test('legacy notes migrate intact and survive a new tab without its session storage', async ({ page, context }) => {
  await context.route('https://**', route => route.abort());
  await page.goto('/test-lab'); await saved(page);
  await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ U04: { status: 'FAIL', notes: 'Original user observation' }, U10: { status: 'BLOCKED', notes: 'No real hash yet' } })), legacy);
  await page.reload(); await saved(page); await openCase(page);
  await expect(page.getByLabel('Observations for U04')).toHaveValue('Original user observation');
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).U04.notes, legacy)).toBe('Original user observation');
  const other = await context.newPage(); await other.goto('/test-lab'); await saved(other); await openCase(other);
  await expect(other.getByLabel('Observations for U04')).toHaveValue('Original user observation');
  expect(await other.evaluate(key => sessionStorage.getItem(key), legacy)).toBeNull();
});

test('migration conflicts require a preview and never overwrite newer notes silently', async ({ page }) => {
  await offline(page); await page.goto('/test-lab'); await openCase(page);
  await page.getByLabel('Observations for U04').fill('Newer durable observation'); await saved(page);
  await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ U04: { status: 'FAIL', notes: 'Older tab observation' } })), legacy);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Review note merge' })).toBeVisible();
  await expect(page.getByLabel('Resolution for U04')).toHaveValue('keep');
  await page.getByRole('button', { name: 'Apply reviewed merge' }).click(); await saved(page);
  await openCase(page); await expect(page.getByLabel('Observations for U04')).toHaveValue('Newer durable observation');
  await page.reload(); await expect(page.getByRole('region', { name: 'Review note merge' })).toHaveCount(0);
});

test('import validates identity and duplicate IDs, previews conflicts, exports every case and environment', async ({ page }) => {
  await offline(page); await page.goto('/test-lab'); await openCase(page);
  await page.getByLabel('Observations for U04').fill('Keep this'); await saved(page);
  await importReport(page, report([{ id: 'U04', status: 'FAIL', observations: 'Different account' }], ACCOUNT_A));
  await expect(page.getByRole('alert')).toContainText('different signer or trading account');
  await importReport(page, report([{ id: 'U04', status: 'FAIL', observations: 'A' }, { id: 'U04', status: 'PASS', observations: 'B' }]));
  await expect(page.getByRole('alert')).toContainText('duplicate scenario');
  await importReport(page, report([{ id: 'U04', status: 'FAIL', observations: 'Imported failure' }, { id: 'U05', status: 'BLOCKED', observations: 'Service unavailable' }]));
  await expect(page.getByLabel('Observations for U04')).toHaveValue('Keep this');
  await page.getByLabel('Resolution for U04').selectOption('import');
  await page.getByRole('button', { name: 'Apply reviewed merge' }).click(); await saved(page);
  await expect(page.getByLabel('Observations for U04')).toHaveValue('Imported failure');
  await page.getByLabel('Issue category for U04').selectOption('PEI application');
  await page.getByRole('button', { name: 'Capture environment for U04' }).click(); await saved(page);
  await page.getByLabel('Show scenarios').selectOption('attention');
  const download = page.waitForEvent('download');
  await page.locator('.guided-tests').getByRole('button', { name: 'Download JSON evidence' }).click();
  const result = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(result.cases).toHaveLength(24);
  expect(result.cases[3]).toMatchObject({ status: 'FAIL', category: 'PEI application', environment: { sdkVersion: '0.32.1', chainId: 50383, walletChainId: null } });
  expect(result.cases[3].environment.block).toBeUndefined();
  expect(result.cases[9].status).toBe('NOT RUN');
  // The new 24-case export must also be importable, preserving earlier notes.
  result.cases[23].status = 'BLOCKED'; result.cases[23].observations = 'No replacement transaction available';
  await importReport(page, result);
  await page.getByRole('button', { name: 'Apply reviewed merge' }).click(); await saved(page);
  await openCase(page, 'U24');
  await expect(page.getByLabel('Observations for U24')).toHaveValue('No replacement transaction available');
  await expect(page.getByLabel('Observations for U04')).toHaveValue('Imported failure');
});

test('cross-tab conflicts preserve both the saved report and unsaved local edits', async ({ page, context }) => {
  await context.route('https://**', route => route.abort());
  await page.goto('/test-lab'); await saved(page); await openCase(page);
  await page.getByLabel('Observations for U04').fill('First tab'); await saved(page);
  const second = await context.newPage(); await second.goto('/test-lab'); await saved(second); await openCase(second);
  await second.getByLabel('Observations for U04').fill('Second tab'); await saved(second);
  await expect(page.locator('.note-save-status')).toContainText('Another tab changed');
  await page.getByLabel('Observations for U04').fill('Retained unsaved draft');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases.U04.notes, durable)).toBe('Second tab');
  await expect(page.getByLabel('Observations for U04')).toHaveValue('Retained unsaved draft');
});

test('storage failure is visible and does not prevent exporting working notes', async ({ page }) => {
  await offline(page);
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key.startsWith('pei.manual-tests.v2')) throw new DOMException('Quota exceeded', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await page.goto('/test-lab'); await expect(page.locator('.note-save-status')).toHaveAttribute('role', 'alert'); await openCase(page);
  await page.getByLabel('Observations for U04').fill('Export survives storage failure');
  const download = page.waitForEvent('download'); await page.locator('.guided-tests').getByRole('button', { name: 'Download JSON evidence' }).click();
  const result = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(result.cases[3].observations).toBe('Export survives storage failure');
});

test('explicit scoped clearing preserves trading journals and other accounts', async ({ page }) => {
  await offline(page); await page.goto('/test-lab'); await saved(page); await openCase(page);
  await page.getByLabel('Observations for U04').fill('Clear me'); await saved(page);
  const untouched = [`pei.attempts.v1.50383.${PERPS_CONFIG.genesisHash}`, `pei.operations.v1.50383.${PERPS_CONFIG.genesisHash}`, 'pei.manual-tests.v2.50383.viewer.other'];
  await page.evaluate(keys => keys.forEach(key => localStorage.setItem(key, '[]')), untouched);
  await expect(page.getByRole('button', { name: 'Clear these test notes' })).toBeDisabled();
  await page.getByLabel('I have exported any notes I need.').check();
  await page.getByRole('button', { name: 'Clear these test notes' }).click();
  await expect(page.getByLabel('Observations for U04')).toHaveValue('');
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), untouched)).toEqual(['[]', '[]', '[]']);
});

test('invalid durable data is not silently replaced', async ({ page }) => {
  await offline(page); await page.goto('/test-lab'); await saved(page);
  await page.evaluate(key => localStorage.setItem(key, '{broken'), durable);
  await page.reload(); await expect(page.locator('.note-save-status')).toContainText('will not be overwritten');
  await openCase(page); await page.getByLabel('Observations for U04').fill('Working copy');
  expect(await page.evaluate(key => localStorage.getItem(key), durable)).toBe('{broken');
});

async function injectedWallet(page: Page, chain = '0xc4cf', reject = false) {
  await page.addInitScript(({ actor, chain, reject }) => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    Object.assign(window, { ethereum: { on: (event: string, fn: (...args: unknown[]) => void) => listeners.set(event, fn), removeListener: (event: string) => listeners.delete(event), request: async ({ method }: { method: string }) => {
      if (method === 'eth_requestAccounts') { if (reject) throw { code: 4001 }; return [actor]; }
      if (method === 'eth_chainId') return chain;
      throw new Error('Unexpected wallet request — no signing allowed in this test');
    } } });
  }, { actor: ACCOUNT_B, chain, reject });
}

test('wallet menu shows actual roles, gas, pool permission and explicit next step', async ({ page }) => {
  await offline(page); await mockReads(page, { permission: true, nativeBalance: '0x0' }); await injectedWallet(page);
  await page.goto('/'); await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await page.getByRole('button', { name: /Browser wallet/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Manage trading account' }).click();
  await page.getByLabel('Trading account address · saved for this signer').fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Use trading account', exact: true }).click();
  await page.locator('.header-wallet').click();
  await expect(dialog.getByText('Somnia testnet · 50383', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/0 STT · block/)).toBeVisible();
  await expect(dialog.getByText(/signing wallet needs testnet STT/)).toBeVisible();
  await expect(dialog.getByText(/Place allowed · Cancel allowed · Reduce allowed/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Copy trading account address' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('.header-wallet')).toBeFocused();
});

test('wallet rejection and wrong network have distinct useful messages', async ({ page, context }) => {
  await offline(page); await injectedWallet(page, '0xc4cf', true); await page.goto('/');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click(); await page.getByRole('button', { name: /Browser wallet/ }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('connection rejected');
  const other = await context.newPage(); await offline(other); await mockReads(other); await injectedWallet(other, '0x1'); await other.goto('/');
  await other.getByRole('button', { name: 'Connect wallet', exact: true }).click(); await other.getByRole('button', { name: /Browser wallet/ }).click();
  await expect(other.getByRole('dialog').getByText('Wrong network · 1', { exact: true })).toBeVisible();
  await expect(other.getByRole('dialog').getByRole('button', { name: 'Switch wallet to Somnia testnet' })).toBeVisible();
});

test('discovery timeout does not block manual selection or claim no linked accounts exist', async ({ page }) => {
  test.setTimeout(45000);
  await offline(page); await mockReads(page, { permission: false }); await injectedWallet(page);
  await page.route('https://indexer.hyperindex.xyz/**', () => {});
  await page.goto('/positions'); await page.getByRole('button', { name: 'Connect signing wallet', exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_B);
  await page.getByText('Set up or change account', { exact: true }).click();
  await page.getByLabel('Trading account address · saved for this signer').fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Use trading account', exact: true }).click();
  await expect(page.getByTestId('selected-account')).toHaveText(ACCOUNT_A);
  await page.getByText('Set up or change account', { exact: true }).click();
  await expect(page.getByText('Discovery is incomplete', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.locator('.header-wallet').click();
  await expect(page.getByRole('dialog').getByText(/Placement is not allowed for this market/)).toBeVisible();
});

test('market anchors follow late content and yield to deliberate scrolling', async ({ page }) => {
  await offline(page); await mockReads(page);
  await page.goto(`/markets?pool=${POOL}#selected-market`);
  await expect(page.getByRole('heading', { name: 'Resting bids' })).toBeVisible();
  await expect.poll(() => page.locator('#selected-market').evaluate(el => Math.abs(el.getBoundingClientRect().top - document.querySelector('main')!.getBoundingClientRect().top))).toBeLessThan(2);
  await page.getByRole('main').dispatchEvent('wheel');
  await page.getByRole('main').evaluate(el => { el.scrollTop = 0; });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect.poll(() => page.getByRole('main').evaluate(el => el.scrollTop)).toBe(0);
});

test('wallet dialog supports keyboard cycling and escape without losing the opener', async ({ page }) => {
  await offline(page); await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Connect wallet', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
});

test('200 percent zoom-equivalent layout keeps the dialog and primary controls reachable', async ({ browser }, info) => {
  // 1440x900 physical pixels at 2x: a 720x450 CSS viewport. This is layout
  // emulation, not a claim that a native browser zoom accelerator was exercised.
  const context = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
  const page = await context.newPage(); await offline(page);
  await page.goto('http://127.0.0.1:4173/test-lab');
  await openCase(page); await page.getByLabel('Observations for U04').fill('Zoom layout check');
  expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(450);
  await page.getByRole('button', { name: 'Use a public address' }).click();
  await expect(page.getByLabel('Trading account address · saved for this signer')).toBeFocused();
  await page.screenshot({ path: info.outputPath('zoom-equivalent.png') });
  await context.close();
});

for (const width of [320, 390, 768, 1440]) {
  test(`all pages keep populated cards and controls contained at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await offline(page); await mockReads(page);
    await page.addInitScript(({ key, owner }) => localStorage.setItem(key, owner), { key: viewKey, owner: ACCOUNT_A });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/', '/markets', `/trade/${POOL}`, '/executions', '/positions', '/positions/risk', '/positions/manage', '/history', '/test-lab', '/settings']) {
      await page.goto(path); await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (path === '/') await expect(page.locator('.positions-preview').getByText('MOCK', { exact: true })).toBeVisible();
      if (path === '/positions') await expect(page.locator('.positions-table').getByText('MOCK', { exact: true })).toBeVisible();
      if (path === '/positions/risk') await expect(page.getByText('Baseline reconciled exactly with on-chain health')).toBeVisible();
      if (path === '/test-lab') { await openCase(page); await page.getByLabel('Observations for U04').fill('LongReportValue'.repeat(100)); }
      expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), path).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      const clipped = await page.locator('main button:visible, main input:visible, main select:visible, main textarea:visible').evaluateAll(elements => elements.filter(el => !el.closest('.table-scroll')).filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(el => el.textContent?.slice(0, 60)));
      expect(clipped, path).toEqual([]);
      if (['/test-lab', '/positions', '/'].includes(path)) await page.screenshot({ path: info.outputPath(`${width}-${path === '/' ? 'overview' : path.slice(1)}.png`) });
    }
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: info.outputPath(`${width}-settings-light.png`) });
    expect(errors).toEqual([]);
  });
}
