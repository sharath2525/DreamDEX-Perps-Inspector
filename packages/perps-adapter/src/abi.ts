import { parseAbi } from 'viem';

// Minimal read-only ABI, transcribed from markets-sdk 0.32.1 dist/readsAbi.js.
// These are application-owned HTTP reads; SDK internal modules are not imported.
export const bankAbi = parseAbi([
  'function getSystemConfig() view returns ((address marginBank, address collateralToken, address perpPoolFactory, address liquidationEngine, address insuranceFund, address feeRecipient, uint16 maxLeverageLimit, bool fullyWired))',
  'function isPerpPoolRegistered(address perpPool) view returns (bool)',
  'function getAccountState(address account) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools))',
  'function getAccountHealth(address account) view returns (int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq)',
  'function getMarginStatus(address account) view returns (uint8)',
  'function getWithdrawableCollateral(address account) view returns (uint256)',
  'function getPosition(address account, address perpPool) view returns ((int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs))',
  'function isolated(address account) view returns (bool)',
  'function getCreditFloor(address account) view returns (uint256)',
  'function getCreditGranter() view returns (address)',
]);
export const factoryAbi = parseAbi([
  'function getPerpPoolStatuses() view returns ((address perpPool, address baseToken, bool restricted)[] statuses)',
]);
export const poolAbi = parseAbi([
  'function marginBank() view returns (address)',
  'function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))',
  'function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps))',
  'function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[])',
  'function tryGetMarkPrice() view returns (bool ok, uint256 price)',
  'function getIndexPrice() view returns (uint256 price, uint256 updatedAt)',
  'function getCurrentFundingRate() view returns (int256)',
  'function getOpenInterest() view returns (uint256)',
  'function getFundingParameters() view returns ((uint256 fundingCalculationWindowSec, uint256 fundingSettlementIntervalSec, int256 interestRatePerWindow, uint256 maxFundingRatePerWindow, uint256 dampener, uint256 emaSmoothingAlpha, uint256 maxOracleStalenessSec))',
  'function getLastFundingUpdateTimestampNs() view returns (uint64)',
  'function tryGetHealthSnapshot() view returns (bool ok, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps) snapshot)',
  'function getOwnOpenOrders() view returns (uint128[])',
  'function getOrder(uint128 orderId) view returns ((uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs))',
]);
export const voucherAbi = parseAbi([
  'function isClaimed(address claimant) view returns (bool)',
  'function voucherExpiryOf(address account) view returns (uint64)',
]);
