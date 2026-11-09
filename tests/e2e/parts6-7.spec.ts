import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { encodeFunctionData, zeroAddress, type Address } from 'viem';
import { perpPositionAnalytics } from '@somnia-chain/markets-sdk';
import { calculateRisk, shockBps, type RiskSnapshot } from '../../packages/perps-adapter/src/risk';
import { executionEvidence, evidenceJson, evidenceMarkdown } from '../../packages/perps-adapter/src/evidence';
import { diagnoseFailure } from '../../packages/perps-adapter/src/diagnostics';
import { orderWriteAbi } from '../../packages/perps-adapter/src/trade';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';
import { ACCOUNT_A, ACCOUNT_B, POOL, TX_HASH, REPLACEMENT_HASH, mockReads, type FixtureOptions } from './rpc-fixture';

const unit = 1000000n;
function riskFixture(): RiskSnapshot {
  const positions = [[POOL, 1n, 120n], [ACCOUNT_B, -2n, 90n]].map(([pool, size, mark]) => {
    const inputs = { size: size as bigint * unit, avgEntryPrice: 100n * unit, entryFundingIndex: 0n, markPrice: mark as bigint * unit, projectedCumulativeFunding: unit * 10n ** 18n, oneBase: unit, effectiveImfBps: 500n, maintenanceMarginBps: 250n, closeOutMarginBps: 125n };
    return { pool: pool as Address, position: { ok: true as const, value: { size: inputs.size, avgEntryPrice: inputs.avgEntryPrice, entryFundingIndex: 0n, lastUpdatedTimestampNs: 0n } },
      analytics: { ok: true as const, value: { markPrice: inputs.markPrice, inputs, metrics: perpPositionAnalytics(inputs) } },
      metadata: { ok: true as const, value: { baseDecimals: 6, baseSymbol: 'TEST', tickSize: 1n, lotSize: 1n, minQuantity: 1n, initialMarginBps: 500n, maintenanceMarginBps: 250n, closeOutMarginBps: 125n, maxOpenInterest: 0n, maxPositionSize: 0n, takerFeeBpsTimes1k: 0n, makerFeeBpsTimes1k: 0n } } };
  });
  return { owner: ACCOUNT_A, blockNumber: 100n, observedAt: 1, decimals: 6, symbol: 'TESTUSD', state: { unlockedCollateralBalance: 90n * unit, lockedCollateral: 10n * unit, activePerpPools: [POOL, ACCOUNT_B] }, health: { ok: true, value: [141n * unit, 15n * unit, 7500000n, 3750000n] }, positions, positionCoverageComplete: true, analyticsComplete: true, orderCount: 2, orderCoverageComplete: true };
}
test('risk long/short portfolio counts shared collateral and funding once with independent expected totals', async () => {
  const snapshot = riskFixture();
  const baseline = await calculateRisk(snapshot);
  expect(baseline.ready).toBe(true);
  expect(baseline.baseline?.equity).toBe(141n * unit);
  expect(baseline.rows.map(row => row.concentrationBps)).toEqual([4000n, 6000n]);
  const up = await calculateRisk(snapshot, 1000n);
  expect(up.scenario?.equity).toBe(135n * unit);
  expect(up.scenario?.maintenanceMargin).toBe(8250000n);
  const custom = await calculateRisk(snapshot, 1000n, { [ACCOUNT_B.toLowerCase()]: 2000n });
  expect(custom.scenario?.equity).toBe(117n * unit);
  expect((await calculateRisk(snapshot, -1000n)).scenario?.equity).toBe(147n * unit);
});
test('risk zero/negative equity, missing positions and baseline mismatches remain explicit', async () => {
  for (const collateral of [-41n, -100n]) {
    const snapshot = riskFixture(); snapshot.state = { ...snapshot.state, unlockedCollateralBalance: collateral * unit, lockedCollateral: 0n };
    snapshot.health = { ok: true, value: [(collateral + 41n) * unit, 15n * unit, 7500000n, 3750000n] };
    expect((await calculateRisk(snapshot)).scenario?.grossLeverageBps).toBeNull();
  }
  const missing = riskFixture(); missing.positions[0]!.analytics = { ok: false, error: 'Feed stale' }; missing.analyticsComplete = false;
  expect((await calculateRisk(missing)).scenario).toBeNull();
  const mismatch = riskFixture(); mismatch.health = { ok: true, value: [140n * unit, 15n * unit, 7500000n, 3750000n] };
  expect((await calculateRisk(mismatch)).ready).toBe(false);
  expect((await calculateRisk(mismatch)).difference?.equity).toBe(unit);
  for (const invalid of ['1e2', '1.001', '-96', '301', 'NaN']) expect(() => shockBps(invalid)).toThrow();
  expect(shockBps('-12.25')).toBe(-1225n);
});
test('SDK risk rounding preserves tiny positive/negative funding and ceil margin', () => {
  const inputs = { size: 1n, avgEntryPrice: 10n, markPrice: 11n, entryFundingIndex: 0n, projectedCumulativeFunding: 1n, oneBase: 10n, effectiveImfBps: 500n, maintenanceMarginBps: 250n, closeOutMarginBps: 125n };
  expect(perpPositionAnalytics(inputs)).toMatchObject({ unrealizedPnl: 0n, accruedFunding: 1n, maintenanceMarginRequirement: 1n });
  expect(perpPositionAnalytics({ ...inputs, size: -1n }).accruedFunding).toBe(0n);
});
const attemptId = '12345678-1234-1234-1234-123456789012';
function attemptData() {
  const data = encodeFunctionData({ abi: orderWriteAbi, functionName: 'placeOrder', args: [true, 0n, 12000000n, 1000000000n, 1900000000000000000n, 0, 0, zeroAddress, 0n] });
  return { id: attemptId, createdAt: Date.now(), kind: 'place' as const, owner: ACCOUNT_A, pool: POOL, data, status: 'submitted', hash: TX_HASH, positionBefore: '0', gasLimit: '130000', gasPrice: '2000000000', timeline: [{ stage: 'hash-returned' as const, at: Date.now(), hash: TX_HASH }] };
}
async function execution(page: Page, options: FixtureOptions = {}) {
  const record = attemptData(); options.sent = { from: ACCOUNT_A, to: POOL, data: record.data };
  await mockReads(page, options);
  await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: `pei.attempts.v1.${PERPS_CONFIG.chainId}.${PERPS_CONFIG.genesisHash}`, value: JSON.stringify([record]) });
  await page.goto(`/executions/${attemptId}`);
}
test('execution export omits credentials and Markdown cannot escape its data block', () => {
  const record = { ...attemptData(), secret: 'DO_NOT_EXPORT', error: 'https://rpc.invalid/?token=DO_NOT_EXPORT', wallet: { privateKey: 'DO_NOT_EXPORT' } };
  expect(evidenceJson(executionEvidence(record))).not.toContain('DO_NOT_EXPORT');
  const markdown = evidenceMarkdown({ note: '```\n<script>attack</script>' });
  expect(markdown.match(/```/g)).toHaveLength(2); expect(markdown).not.toContain('<script>');
  expect(diagnoseFailure(new Error('InsufficientCollateral DO_NOT_EXPORT')).code).toBe('collateral');
  expect(evidenceJson(diagnoseFailure(new Error('secret=DO_NOT_EXPORT')))).not.toContain('DO_NOT_EXPORT');
});
test('duplicate fill logs are counted once and delayed indexer never suppresses receipt exports', async ({ page }) => {
  await execution(page, { duplicateLogs: true, receiptMode: 'filled', indexedBlock: 99 });
  await page.getByText('Journal details and raw observations', { exact: true }).click(); await expect(page.getByText('Fully filled in this receipt', { exact: true })).toBeVisible();
  await expect(page.getByText(/Indexer: delayed/)).toBeVisible();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download JSON evidence' }).click();
  const path = await (await pending).path(); const exported = JSON.parse(await readFile(path!, 'utf8'));
  expect(exported.chain.filledQuantity).toBe('1000000000'); expect(exported.chain.fills).toHaveLength(1);
  expect(exported.indexer.state).toBe('delayed'); expect(exported.chain.accountBeforeBlock.state).toBe('observed');
  await page.reload(); await expect(page.getByText('receipt verified', { exact: true })).toBeVisible();
});
for (const kind of ['repriced', 'wallet-cancelled', 'different-call'] as const) {
  test(`same-nonce replacement: ${kind}`, async ({ page }) => {
    await execution(page, { originalPending: true, replacement: kind, receiptMode: 'filled' });
    await page.getByText('Wallet sped up, cancelled or replaced this transaction?').click();
    await page.getByLabel('Replacement transaction hash').fill(REPLACEMENT_HASH);
    await page.getByRole('button', { name: 'Verify replacement', exact: true }).click();
    await expect(page.getByText(`Verified replacement: ${kind}`, { exact: true })).toBeVisible();
    if (kind === 'repriced') { await page.getByText('Journal details and raw observations', { exact: true }).click(); await expect(page.getByText('Fully filled in this receipt', { exact: true })).toBeVisible(); }
    else await expect(page.getByText('Fully filled in this receipt', { exact: true })).toHaveCount(0);
  });
}
test('unrelated nonce cannot resolve an unknown attempt', async ({ page }) => {
  await execution(page, { originalPending: true, replacement: 'repriced', wrongNonce: true });
  await page.getByText('Wallet sped up, cancelled or replaced this transaction?').click();
  await page.getByLabel('Replacement transaction hash').fill(REPLACEMENT_HASH);
  await page.getByRole('button', { name: 'Verify replacement', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Replacement not verified' })).toContainText('nonce');
});
test('unavailable original transaction leaves replacement unresolved', async ({ page }) => {
  await execution(page, { originalPending: true, originalMissing: true, replacement: 'repriced' });
  await page.getByText('Wallet sped up, cancelled or replaced this transaction?').click();
  await page.getByLabel('Replacement transaction hash').fill(REPLACEMENT_HASH);
  await page.getByRole('button', { name: 'Verify replacement', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Replacement not verified' })).toBeVisible();
  await expect(page.getByText('Verified replacement: repriced', { exact: true })).toHaveCount(0);
});
test('caught-up indexer without a row and approximate revert replay make no fill claim', async ({ page }) => {
  await execution(page, { receiptMode: 'reverted', indexedBlock: 100, revertSimulation: true });
  await expect(page.getByText(/Indexer: caught-up/)).toBeVisible();
  await expect(page.getByText(/Block processed, but no matching order row observed/)).toBeVisible();
  await page.getByRole('button', { name: 'Replay read-only at parent block' }).click();
  await expect(page.getByText(/Replay: unavailable/)).toBeVisible();
  await page.getByText('Journal details and raw observations', { exact: true }).click();
  await expect(page.getByText('Reverted; no order execution from this transaction', { exact: true })).toBeVisible();
});
test('frozen risk scenario supports overrides, invalid input recovery and sanitized downloads', async ({ page }, testInfo) => {
  await mockReads(page);
  await page.goto('/positions/risk');
  await page.getByLabel('Account to analyze').fill(ACCOUNT_A);
  await page.getByRole('button', { name: 'Inspect risk account' }).click();
  await expect(page.getByRole('button', { name: 'Use latest snapshot & reset scenarios' })).toBeVisible();
  await expect(page.getByText('Baseline reconciled exactly with on-chain health')).toBeVisible();
  await page.getByRole('button', { name: '-10%', exact: true }).click();
  await page.getByLabel('Shock for MOCK', { exact: true }).fill('20');
  await expect(page.getByText(/last valid calculation/)).toHaveCount(0);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download JSON evidence' }).click();
  const report = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(report.scenario.equity).toBe('106600000'); expect(report.rows[0].bps).toBe('2000');
  await page.getByLabel('Shock for MOCK', { exact: true }).fill('bad'); await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Shock for MOCK', { exact: true }).fill('0'); await expect(page.getByRole('alert')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole('main').evaluate(element => element.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('risk-mobile.png') });
});
test('unpriceable risk data and mismatched health withhold totals', async ({ page }) => {
  const options: FixtureOptions = { healthOffset: 1n }; await mockReads(page, options);
  await page.goto('/positions/risk'); await page.getByLabel('Account to analyze').fill(ACCOUNT_A); await page.getByRole('button', { name: 'Inspect risk account' }).click();
  await expect(page.getByRole('button', { name: 'Use latest snapshot & reset scenarios' })).toBeVisible();
  await expect(page.getByText('Portfolio totals withheld · incomplete or mismatched baseline')).toBeVisible();
  options.unpriceable = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Use latest snapshot & reset scenarios' }).click();
  await expect(page.getByText(/No zero value is substituted/)).toBeVisible();
});
