# SDK signatures verified from the published package

Date: 3 November 2026 IST. Package: @somnia-chain/markets-sdk 0.32.1. These are declarations extracted from the actual archive, not invented adapter APIs. Type availability is not proof of a successfully executed write.

Archive integrity checked: `sha512-RfshQP8X6m/wrE6TocmiOPajbw/Vstmkvn+AP/ztK19QgcrPn1lR7A4Pp8xVm6MuOXOpBwTBrFO0W34neQF0Og==`. Package license: MIT. [Official distribution](https://registry.npmjs.org/@somnia-chain/markets-sdk/-/markets-sdk-0.32.1.tgz).

## Client methods

Source: dist/somniaMarketsClient.d.ts. The receiver is `exchange.client`; these methods do not take the internal helper PublicClient argument.

```ts
    listPerpMarkets(opts?: PerpMarketFilter & {
        limit?: number;
    }): Promise<PerpMarket[]>;
    listPerpPoolStatuses(p: {
        factory: Address;
    }): Promise<PerpPoolStatus[]>;
    listTradeablePerpPools(p: {
        factory: Address;
    }): Promise<Address[]>;
    isPerpPoolRegistered(p: {
        marginBank: Address;
        pool: Address;
    }): Promise<boolean>;
    readPerpMarketFromChain(p: {
        status: PerpPoolStatus;
        collateralToken: Address;
        collateralDecimals: number;
        collateralSymbol: string | null;
        factory: Address;
    }): Promise<PerpMarket>;
    getPerpSystemConfig(marginBank: Address): Promise<PerpSystemConfig>;
    getPerpRiskParams(pool: Address): Promise<PerpRiskParams>;
    getPerpHealthSnapshot(pool: Address): Promise<PerpHealthSnapshot>;
    getPerpState(pool: Address): Promise<PerpStateOnchain>;
    getPerpFeedStatus(pool: Address): Promise<PerpFeedStatus>;
    getSpotOrderBook(pool: Address, opts?: GetSpotOrderBookOptions): Promise<SpotOrderBook>;
    watchMarket(pool: string, opts?: SeedOptions): Promise<WatchHandle>;
    watchUser(user: string): Promise<WatchHandle>;
    watchPerpMarkets(opts?: WatchPerpMarketsOptions): Promise<WatchHandle>;
    subscribeLive(listener: () => void): () => void;
    getLiveSpotOrderBook(pool: string, opts?: {
        depth?: number;
    }): SpotOrderBook;
    getLiveUserOrders(pool: string, user: string, opts?: {
        limit?: number;
    }): LiveOrder[];
    getWatchStatus(pool: string): WatchStatus;
    getLiveStatus(): TailStatus;
    getMarginAccount(marginBank: Address, account: Address): Promise<MarginAccount>;
    getAccountHealth(marginBank: Address, account: Address): Promise<AccountHealth>;
    tryGetPerpAccountEquity(marginBank: Address, account: Address): Promise<bigint | null>;
    getPerpPosition(ref: PerpPositionRef): Promise<PerpPosition>;
    listPerpPositions(account: string, opts?: {
        pool?: string;
        includeFlat?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<IndexedPerpPosition[]>;
    getPerpPositionAnalytics(ref: PerpPositionRef): Promise<PerpPositionAnalytics>;
    listPerpPositionAnalytics(p: {
        marginBank: Address;
        account: Address;
    }): Promise<PerpPositionAnalytics[]>;
    getPerpLeverage(ref: PerpPositionRef): Promise<PerpLeverage>;
    getPerpMaxLeverage(ref: PerpPositionRef, opts?: GetPerpMaxLeverageOptions): Promise<number>;
    getMaxPerpOrderSize(p: {
        pool: Address;
        marginBank: Address;
        account: Address;
        isBid: boolean;
        price: bigint;
        autoPull?: boolean;
        builderFeeBpsTimes1k?: bigint;
    }): Promise<PerpMaxOrderSize>;
    previewPerpOrderMargin(p: {
        pool: Address;
        marginBank: Address;
        account: Address;
        isBid: boolean;
        quantity: bigint;
        price: bigint;
        autoPull?: boolean;
        builderFeeBpsTimes1k?: bigint;
    }): Promise<PerpOrderMarginPreview>;
    previewPerpClosePnl(p: {
        pool: Address;
        marginBank: Address;
        account: Address;
        quantity?: bigint;
        price?: bigint;
        asMaker?: boolean;
    }): Promise<PerpClosePreview>;
    getLiquidationPrice(ref: PerpPositionRef): Promise<bigint | null>;
    previewPerpLiquidationPrice(p: {
        pool: Address;
        marginBank: Address;
        account: Address;
        isBid: boolean;
        quantity: bigint;
        price: bigint;
        asMaker?: boolean;
    }): Promise<PerpLiquidationPreview>;
    getPerpVoucherCampaign(marginBank: Address): Promise<PerpVoucherCampaign | null>;
    getPerpVoucherEligibility(marginBank: Address, account: Address): Promise<PerpVoucherEligibility>;
    getPerpVoucher(marginBank: Address, account: Address): Promise<PerpVoucher | null>;
    isOperatorAuthorized(p: IsOperatorAuthorizedParams): Promise<boolean>;
    getPerpStopOrderSomiPayment(registry: Address): Promise<bigint>;
    getPerpStopOrder(ref: PerpStopOrderRef): Promise<PerpStopOrderOnChain | null>;
    getPerpStopOrders(refs: readonly PerpStopOrderRef[]): Promise<readonly PerpStopOrderRead[]>;
    listPerpStopOrders(opts?: {
        account?: string;
        pool?: string;
        status?: StopOrderStatus[];
        limit?: number;
        offset?: number;
    }): Promise<PerpStopOrder[]>;
    getUnclaimedPerpStopSomi(ref: {
        registry: Address;
        account: Address;
    }): Promise<bigint>;
    getOrderOnchain(pool: Address, orderId: bigint, opts?: GetOrderOnchainOptions): Promise<OnchainOrder | null>;
    getOwnOpenOrdersOnchain(pool: Address, owner: Address, opts?: GetOwnOpenOrdersOnchainOptions): Promise<bigint[]>;
    getOpenOrdersOnchain(pools: Address[], owner: Address, opts?: GetOpenOrdersOnchainOptions): Promise<OpenOrdersOnchain>;
    getOrder(pool: string, orderId: bigint | string): Promise<OrderDetail | null>;
    getOrderFills(pool: string, orderId: bigint | string, opts?: {
        limit?: number;
    }): Promise<OrderFillRow[]>;
    getSyncStatus(chainId: number): Promise<IndexerSyncStatus | null>;
    getIndexerFreshness(chainId: number): Promise<IndexerFreshness | null>;
    waitForIndexedBlock(chainId: number, block: number | bigint, opts?: WaitForIndexedBlockOptions): Promise<IndexedBlockWait>;
    getPerpPortfolio(account: string, opts?: PortfolioOptions): Promise<PerpPortfolio>;
    listPerpOrderHistory(account: string, opts?: {
        pool?: string;
        status?: TerminalOrderStatus[];
        orderBy?: "ended" | "placed";
        limit?: number;
        offset?: number;
    }): Promise<PerpOrderHistoryRow[]>;
    getUserFillsPage(account: string, options?: GetUserFillsPageOptions): Promise<UserFillsPage>;
    getFundingPayments(account: string, opts?: {
        pool?: string;
        limit?: number;
        offset?: number;
    }): Promise<FundingPayment[]>;
    listFundingRateHistory(pool: string, opts?: {
        limit?: number;
        offset?: number;
        from?: number | bigint;
        to?: number | bigint;
        order?: "asc" | "desc";
    }): Promise<FundingRateUpdate[]>;
    listPerpPositionChanges(opts?: ListPerpPositionChangesOptions): Promise<PerpPositionChange[]>;
    listPerpPositionChangesForFills(account: string, fills: readonly FillRow[]): Promise<(PerpPositionChange | null)[]>;
    listPerpFees(opts?: {
        account?: string;
        pool?: string;
        builder?: string;
        kind?: string;
        limit?: number;
        offset?: number;
    }): Promise<PerpFeeRecord[]>;
    getMarginEvents(account: string, opts?: GetMarginEventsOptions): Promise<MarginEvent[]>;
    listPerpOrderRejections(opts?: {
        owner?: string;
        pool?: string;
        reason?: number;
        limit?: number;
        offset?: number;
    }): Promise<PerpOrderRejection[]>;
    listLiquidations(opts?: ListLiquidationsOptions): Promise<LiquidationEvent[]>;
    createTrader(traderConfig: TraderConfig): Trader;
```

## Trader methods

Source: dist/trade.d.ts.

```ts
    buildPlacePerpOrder(params: PlacePerpOrderParams): Promise<UnsignedOrder>;
    placePerpOrder(params: PlacePerpOrderParams): Promise<PlaceOrderResult>;
    cancelOrder(params: CancelOrderParams): Promise<TxResult>;
    cancelOrders(params: CancelOrdersParams): Promise<CancelOrdersResult>;
    cancelAllOrders(pool: Address, opts?: CancelAllOrdersOptions): Promise<CancelAllOrdersResult>;
    reduceOrder(params: ReduceOrderParams): Promise<TxResult>;
    reduceOrders(params: ReduceOrdersParams): Promise<TxResult>;
    amendOrder(params: AmendOrderParams): Promise<AmendOrderResult>;
    amendOrders(params: AmendOrdersParams): Promise<AmendOrdersResult>;
    claimPerpVoucher(params: ClaimPerpVoucherParams): Promise<TxResult>;
    depositMargin(params: DepositMarginParams): Promise<TxResult>;
    buildDepositMargin(params: DepositMarginParams): Promise<UnsignedMarginDeposit>;
    withdrawMargin(params: WithdrawMarginParams): Promise<TxResult>;
    buildWithdrawMargin(params: WithdrawMarginParams): Promise<UnsignedCall>;
    setPerpLeverage(params: SetPerpLeverageParams): Promise<TxResult>;
    setOperatorApprovalForPool(params: SetOperatorApprovalForPoolParams): Promise<TxResult>;
    placePerpStopOrder(params: PlacePerpStopOrderParams): Promise<PlacePerpStopOrderResult>;
    buildPlacePerpStopOrder(params: PlacePerpStopOrderParams): Promise<UnsignedPerpStopOrder>;
    linkPerpStopOrders(params: LinkPerpStopOrdersParams): Promise<TxResult>;
    cancelPerpStopOrder(params: CancelStopOrderParams): Promise<TxResult>;
    cancelPerpStopOrders(params: CancelPerpStopOrdersParams): Promise<TxResult>;
    claimPerpStopSomi(params: ClaimPerpStopSomiParams): Promise<TxResult>;
```

## dist/trade.d.ts

```ts
export interface TraderConfig {
    executor?: Executor;
    walletClient?: WalletClient;
    account?: Account | Address;
    privateKey?: `0x${string}`;
    publicClient?: PublicClient;
    decimals?: number;
    gas?: bigint;
}

export interface TxResult {
    hash: Hash;
    receipt: TransactionReceipt;
    executionTimeMicros?: number;
}

export interface OrderFill {
    takerOrderId: bigint;
    makerOrderId: bigint;
    quantityFilled: bigint;
    takerRemainingQuantity: bigint;
    makerRemainingQuantity: bigint;
    fillPrice: bigint;
}

export interface PlaceOrderResult extends TxResult {
    orderId?: bigint;
    fills: OrderFill[];
}

export interface PlacePerpOrderParams {
    pool: Address;
    isBid: boolean;
    price: bigint;
    quantity: bigint;
    expireTimestampNs?: bigint;
    orderType?: number;
    selfMatchingOption?: number;
    builder?: Address;
    builderFeeBpsTimes1k?: bigint;
    gas?: bigint;
}

export declare const ORDER_TYPE: {
    readonly LIMIT: 0;
    readonly FILL_OR_KILL: 1;
    readonly MARKET: 2;
    readonly POST_ONLY: 3;
};

export declare const SELF_MATCHING_OPTION: {
    readonly CANCEL_TAKER: 0;
    readonly CANCEL_MAKER: 1;
};

export interface CancelOrderParams {
    pool: Address;
    orderId: bigint | string;
    gas?: bigint;
}

export interface ReduceOrderParams {
    pool: Address;
    orderId: bigint | string;
    newQuantityRemaining: bigint;
    gas?: bigint;
}

export interface CancelOrdersParams {
    pool: Address;
    orderIds: (bigint | string)[];
    gas?: bigint;
}

export interface ReduceOrdersParams {
    pool: Address;
    reductions: ReduceOrderRequest[];
    gas?: bigint;
}

export interface ReduceOrderRequest {
    orderId: bigint | string;
    newQuantityRemaining: bigint;
}

export interface BatchOrderRequest {
    isBid: boolean;
    price: bigint;
    quantity: bigint;
    expireTimestampNs?: bigint;
    orderType?: number;
    selfMatchingOption?: number;
    builder?: Address;
    builderFeeBpsTimes1k?: bigint;
    userData?: bigint;
}

export interface AmendOrderParams {
    pool: Address;
    oldOrderId: bigint | string;
    alwaysPlace?: boolean;
    newOrder: BatchOrderRequest;
    gas?: bigint;
}

export interface AmendOrdersParams {
    pool: Address;
    amendments: {
        oldOrderId: bigint | string;
        alwaysPlace?: boolean;
        newOrder: BatchOrderRequest;
    }[];
    gas?: bigint;
}

export interface ClaimPerpVoucherParams {
    distributor?: Address;
    marginBank?: Address;
    pool?: Address;
    gas?: bigint;
}

export interface DepositMarginParams {
    marginBank?: Address;
    pool?: Address;
    amount: bigint;
    collateral?: Address;
    autoApprove?: boolean;
    gas?: bigint;
}

export interface WithdrawMarginParams {
    marginBank?: Address;
    pool?: Address;
    amount: bigint;
    gas?: bigint;
}

export interface SetPerpLeverageParams {
    pool: Address;
    leverageX: number;
    marginBank?: Address;
    gas?: bigint;
}

export type PerpStopIntent = "reduceOnly" | "opening";

export interface PerpStopOrderLeg {
    isBid: boolean;
    quantity: bigint;
    triggerPrice: bigint;
    triggerOperator: 0 | 1;
    stopOrderType: 0 | 1;
    limitPrice?: bigint;
    builder?: Address;
    builderFeeBpsTimes1k?: bigint;
}

export interface PlacePerpStopOrderParams extends PerpStopOrderLeg {
    registry: Address;
    pool: Address;
    operatorRegistry?: Address;
    intent?: PerpStopIntent;
    pair?: PerpStopOrderLeg;
    somiPayment?: bigint;
    skipOperatorApproval?: boolean;
    gas?: bigint;
}

export interface LinkPerpStopOrdersParams {
    registry: Address;
    orderIdA: bigint | string;
    orderIdB: bigint | string;
    gas?: bigint;
}

export interface CancelPerpStopOrdersParams {
    registry: Address;
    orderIds: (bigint | string)[];
    gas?: bigint;
}

export interface CancelStopOrderParams {
    registry: Address;
    orderId: bigint | string;
    gas?: bigint;
}

export interface ClaimPerpStopSomiParams {
    registry: Address;
    gas?: bigint;
}
```

## dist/perp/state.d.ts

```ts
export interface PerpPositionRef {
    marginBank: Address;
    account: Address;
    pool: Address;
}

export interface PerpPosition {
    size: bigint;
    avgEntryPrice: bigint;
    entryFundingIndex: bigint;
    lastUpdatedTimestampNs: bigint;
}

export interface PerpStateOnchain {
    markPrice: bigint;
    markPriceOk: boolean;
    indexPrice: bigint;
    indexUpdatedAt: bigint;
    fundingRate: bigint;
    cumulativeFundingPerUnit: bigint;
    projectedCumulativeFundingPerUnit: bigint;
    openInterest: bigint;
    fundingWindowSec: number;
    fundingIntervalSec: number;
    lastFundingUpdateAt: bigint;
    nextFundingAt: bigint;
    emaPremium: bigint;
    oracle: Address;
}
```

## dist/perp/margin.d.ts

```ts
export interface MarginAccount {
    unlockedCollateralBalance: bigint;
    lockedCollateral: bigint;
    activePerpPools: Address[];
    equity: bigint;
    withdrawable: bigint;
    imReq: bigint;
    mmReq: bigint;
    cmReq: bigint;
    marginStatus: MarginStatus;
    asOfBlock: bigint;
}

export interface AccountHealth {
    equity: bigint;
    imReq: bigint;
    mmReq: bigint;
    cmReq: bigint;
    marginStatus: MarginStatus;
}

export interface PerpRiskParams {
    initialMarginBps: bigint;
    maintenanceMarginBps: bigint;
    closeOutMarginBps: bigint;
    maxOpenInterest: bigint;
    maxPositionSize: bigint;
    takerFeeBpsTimes1k: bigint;
    makerFeeBpsTimes1k: bigint;
    insuranceFundShareBps: bigint;
}

export type PerpMaxOrderSizeLimit = 
"collateral"
 | "initialMargin"
 | "maxPositionSize"
 | "voucherBlocked"
 | "walletBalance"
 | "walletAllowance"
 | "mainWallet"
 | "mainFundingBlocked"
 | "restricted"
 | "isolated";

export type PerpMaxOrderSize = {
    priceable: false;
    asOfBlock: bigint;
} | {
    priceable: true;
    asOfBlock: bigint;
    maxQuantity: bigint;
    unalignedMaxQuantity: bigint;
    increasingQuantity: bigint;
    reducingQuantity: bigint;
    lockAmount: bigint;
    topUpRequired: bigint;
    wallet: {
        balance: bigint;
        allowance: bigint;
    } | null;
    fundingPayer: Address | null;
    mainWalletCapacity: bigint | null;
    mainFundingBlocked: boolean;
    ownWalletPull: bigint;
    mainWalletPull: bigint;
    placeable: boolean;
    limitedBy: PerpMaxOrderSizeLimit;
    lotSize: bigint;
    minQuantity: bigint;
    maxPositionSize: bigint;
    positionSize: bigint;
    markPrice: bigint;
    effectiveImfBps: bigint;
};

export type PerpOrderMarginPreview = {
    priceable: false;
    asOfBlock: bigint;
} | {
    priceable: true;
    asOfBlock: bigint;
    increasingQuantity: bigint;
    reducingQuantity: bigint;
    lockAmount: bigint;
    initialMarginPortion: bigint;
    adverseGapPortion: bigint;
    leverageSurcharge: bigint;
    effectiveImfBps: bigint;
    markPrice: bigint;
    unlockedCollateral: bigint;
    equity: bigint;
    imRequirement: bigint;
    feeHeadroom: bigint;
    topUpRequired: bigint;
    wallet: {
        balance: bigint;
        allowance: bigint;
    } | null;
    fundingPayer: Address | null;
    mainWalletCapacity: bigint | null;
    mainFundingBlocked: boolean;
    walletCoversTopUp: boolean;
    ownWalletPull: bigint;
    mainWalletPull: bigint;
    hasCollateralForLock: boolean;
    meetsInitialMargin: boolean;
    voucherBlocked: boolean;
    restrictedBlocked: boolean;
    isolationBlocked: boolean;
    sufficient: boolean;
};

export interface PerpPositionAnalyticsInputs {
    size: bigint;
    avgEntryPrice: bigint;
    entryFundingIndex: bigint;
    markPrice: bigint;
    projectedCumulativeFunding: bigint;
    oneBase: bigint;
    effectiveImfBps: bigint;
    maintenanceMarginBps: bigint;
    closeOutMarginBps: bigint;
}

export interface PerpPositionMetrics {
    size: bigint;
    notional: bigint;
    unrealizedPnl: bigint;
    accruedFunding: bigint;
    equityContribution: bigint;
    initialMarginRequirement: bigint;
    maintenanceMarginRequirement: bigint;
    closeOutMarginRequirement: bigint;
    returnOnMarginBps: bigint | null;
}

export interface PerpLiquidationPriceInputs {
    equity: bigint;
    mmReq: bigint;
    size: bigint;
    markPrice: bigint;
    maintenanceMarginBps: bigint;
    oneBase: bigint;
}
```

## dist/perp/stops.d.ts

```ts
export type PerpStopOrderRef = {
    registry: Address;
    orderId: bigint | string;
};
```

## dist/spot/poolReads.d.ts

```ts
export interface IsOperatorAuthorizedParams {
    pool: Address;
    owner: Address;
    operator: Address;
    selector: Hex;
}
```

## dist/writer.d.ts

```ts
export interface UnsignedCall {
    chainId: number;
    to: Address;
    data: Hex;
    value: bigint;
    description: string;
    functionName?: string;
}

export interface UnsignedOrder {
    order: UnsignedCall;
    approval?: UnsignedCall;
}
```

## Relevant raw read signatures

Extracted from src/readsAbi.ts and src/tradeAbi.ts. Raw fallbacks must keep these ABI shapes and be checked against the deployed contract; internal source paths are not public package exports.

```solidity
function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[]);
function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize));
function somiPaymentPerOrder() view returns (uint256);
function oracle() view returns (address);
function getIndexPrice() view returns (uint256 price, uint256 updatedAt);
function getCurrentFundingRate() view returns (int256);
function getCumulativeFundingPerUnit() view returns (int256);
function getProjectedCumulativeFundingPerUnit() view returns (int256);
function getOpenInterest() view returns (uint256 openInterest);
function getFundingParameters() view returns ((uint256 fundingCalculationWindowSec, uint256 fundingSettlementIntervalSec, int256 interestRatePerWindow, uint256 maxFundingRatePerWindow, uint256 dampener, uint256 emaSmoothingAlpha, uint256 maxOracleStalenessSec));
function getLastFundingUpdateTimestampNs() view returns (uint64);
function getEmaPremium() view returns (int256);
function tryGetMarkPrice() view returns (bool ok, uint256 price);
function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize));
function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps));
function tryGetHealthSnapshot() view returns (bool ok, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps) snapshot);
function getReducingCapacity(address account) view returns ((int128 positionSize, uint256 pendingBidQuantity, uint256 pendingAskQuantity, uint256 pendingOppositeQuantity, uint256 effectiveReducingCapacity) capacity);
function isRestricted() view returns (bool);
function getPerpPoolStatuses() view returns ((address perpPool, address baseToken, bool restricted)[] statuses);
function getSystemConfig() view returns ((address marginBank, address collateralToken, address perpPoolFactory, address liquidationEngine, address insuranceFund, address feeRecipient, uint16 maxLeverageLimit, bool fullyWired));
function getPosition(address account, address perpPool) view returns ((int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs));
function getAccountState(address account) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools));
function getWithdrawableCollateral(address account) view returns (uint256);
function getActivePerpPools(address account) view returns (address[]);
function getAccountHealth(address account) view returns (int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq);
function getMarginStatus(address account) view returns (uint8);
function isolationAllowsMarket(address account, address market) view returns (bool);
function isolated(address account) view returns (bool);
function getMaxLeverage(address account, address perpPool) view returns (uint16);
function getMaxLeverageLimit() view returns (uint16);
function getCreditFloor(address account) view returns (uint256);
function getVoucherLeverageCap() view returns (uint16);
function isVoucherMarketAllowed(address perpPool) view returns (bool);
function isPerpPoolRegistered(address perpPool) view returns (bool);
function somiPaymentPerOrder() view returns (uint256);
function getPendingOrder(uint128 orderId) view returns (bool live, (((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger, uint128 orderId, uint256 somiPaid, uint128 siblingOrderId, uint8 intent) order);
function somiPaymentPerOrder() view returns (uint256);
function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool);
```

Public SDK helpers also verified: `decodePlaceOrder(receipt, pool)`, `decodeRevert(caught, context?)`, `perpPositionAnalytics(inputs)`, `perpLiquidationPrice(inputs)`. Internal helper exports with an extra PublicClient parameter must not be confused with the client methods above.
