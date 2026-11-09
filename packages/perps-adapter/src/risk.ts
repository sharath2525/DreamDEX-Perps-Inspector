import type { PerpPositionMetrics } from '@somnia-chain/markets-sdk';
import type { AccountSnapshot } from './read';
import { PERPS_CONFIG } from './config';

export function shockBps(text: string): bigint {
  if (!/^-?(0|[1-9]\d{0,3})(\.\d{1,2})?$/.test(text)) throw new Error('Use a percentage with at most two decimal places.');
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.');
  const value = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  const signed = negative ? -value : value;
  if (signed < -9500n || signed > 30000n) throw new Error('Price shocks must be between −95% and +300%.');
  return signed;
}
function totals(metrics: PerpPositionMetrics[], collateral: bigint) {
  const equity = metrics.reduce((sum, row) => sum + row.equityContribution, collateral);
  const initialMargin = metrics.reduce((sum, row) => sum + row.initialMarginRequirement, 0n);
  const maintenanceMargin = metrics.reduce((sum, row) => sum + row.maintenanceMarginRequirement, 0n);
  const closeOutMargin = metrics.reduce((sum, row) => sum + row.closeOutMarginRequirement, 0n);
  const grossNotional = metrics.reduce((sum, row) => sum + row.notional, 0n);
  const netNotional = metrics.reduce((sum, row) => sum + (row.size < 0n ? -row.notional : row.notional), 0n);
  return { equity, initialMargin, maintenanceMargin, closeOutMargin, grossNotional, netNotional,
    maintenanceHeadroom: equity - maintenanceMargin, initialHeadroom: equity - initialMargin,
    grossLeverageBps: equity > 0n ? grossNotional * 10000n / equity : null };
}
/** Frozen-snapshot scenario; no reads/writes, price prediction or liquidation promise. */
export type RiskSnapshot = Pick<AccountSnapshot, 'owner' | 'blockNumber' | 'observedAt' | 'decimals' | 'symbol' | 'state' | 'health' | 'positions' | 'positionCoverageComplete' | 'analyticsComplete' | 'orderCount' | 'orderCoverageComplete'>;
export async function calculateRisk(snapshot: RiskSnapshot, uniformBps = 0n, custom: Record<string, bigint> = {}) {
  if (uniformBps < -9500n || uniformBps > 30000n || Object.values(custom).some(bps => bps < -9500n || bps > 30000n)) throw new Error('Shock outside supported bounds.');
  const { perpPositionAnalytics } = await import('@somnia-chain/markets-sdk');
  const rows = snapshot.positions.map(row => {
    const bps = custom[row.pool.toLowerCase()] ?? uniformBps;
    if (!row.position.ok || !row.analytics.ok || !row.analytics.value.inputs || !row.metadata.ok) return { pool: row.pool, symbol: row.metadata.ok ? row.metadata.value.baseSymbol : 'Unknown market', bps, known: false as const, reason: 'Position, metadata or price inputs unavailable.' };
    const inputs = row.analytics.value.inputs;
    if (inputs.oneBase !== 10n ** BigInt(row.metadata.value.baseDecimals) || inputs.size !== row.position.value.size || inputs.markPrice <= 0n) return { pool: row.pool, symbol: row.metadata.value.baseSymbol, bps, known: false as const, reason: 'Snapshot precision or position inputs disagree.' };
    const price = inputs.markPrice * (10000n + bps) / 10000n;
    if (price <= 0n) return { pool: row.pool, symbol: row.metadata.value.baseSymbol, bps, known: false as const, reason: 'Shocked price is below one raw quote unit.' };
    const baseline = perpPositionAnalytics(inputs);
    const scenario = perpPositionAnalytics({ ...inputs, markPrice: price });
    return { pool: row.pool, symbol: row.metadata.value.baseSymbol, baseDecimals: row.metadata.value.baseDecimals, bps, known: true as const,
      basePrice: inputs.markPrice, scenarioPrice: price, baseline, scenario };
  });
  const known = rows.filter(row => row.known);
  const collateral = snapshot.state.unlockedCollateralBalance + snapshot.state.lockedCollateral;
  const reconstructed = totals(known.map(row => row.baseline), collateral);
  const projected = totals(known.map(row => row.scenario), collateral);
  const coverageComplete = snapshot.positionCoverageComplete && snapshot.analyticsComplete && rows.every(row => row.known);
  const difference = snapshot.health.ok && coverageComplete ? {
    equity: reconstructed.equity - snapshot.health.value[0], initialMargin: reconstructed.initialMargin - snapshot.health.value[1],
    maintenanceMargin: reconstructed.maintenanceMargin - snapshot.health.value[2], closeOutMargin: reconstructed.closeOutMargin - snapshot.health.value[3],
  } : null;
  const reconciled = !!difference && Object.values(difference).every(value => value === 0n);
  const ready = coverageComplete && reconciled;
  return { owner: snapshot.owner, blockNumber: snapshot.blockNumber, observedAt: snapshot.observedAt, decimals: snapshot.decimals, symbol: snapshot.symbol,
    collateral, uniformBps, rows: rows.map(row => ({ ...row, concentrationBps: row.known && ready && reconstructed.grossNotional > 0n ? row.baseline.notional * 10000n / reconstructed.grossNotional : null })),
    coverageComplete, reconciled, difference, ready, baseline: ready ? reconstructed : null, scenario: ready ? projected : null,
    orderCount: snapshot.orderCount, orderCoverageComplete: snapshot.orderCoverageComplete,
    assumptions: ['Snapshot positions, collateral, funding indices and margin rates are frozen.', 'Shared unlocked plus locked collateral is counted once; accrued funding is subtracted once through SDK equity contribution.', 'PnL truncates toward zero; funding rounds toward positive infinity; margin requirements round up, matching SDK 0.32.1.', 'Shocked prices round down to raw quote units and are hypothetical marks, not executable limit prices.', 'Resting orders are not filled or cancelled in this scenario. Fees, slippage, future funding, deposits, withdrawals and liquidation actions are excluded.', 'Maintenance headroom is a frozen-model comparison, not an exact liquidation price or protection guarantee.'],
  };
}
export type RiskReport = Awaited<ReturnType<typeof calculateRisk>>;
export function riskEvidence(report: RiskReport) {
  return { schema: 'pei.risk-scenario.v1', chainId: PERPS_CONFIG.chainId, genesis: PERPS_CONFIG.genesisHash, sdkVersion: PERPS_CONFIG.sdkVersion,
    mode: 'FROZEN_SNAPSHOT_HYPOTHETICAL_NO_TRANSACTIONS', ...report };
}
