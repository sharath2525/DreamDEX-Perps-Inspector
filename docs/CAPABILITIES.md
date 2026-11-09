# Capabilities, exact integration and missing-feature audit

This table preserves the original research baseline. Current implementation and acceptance status is in [FEATURE_AUDIT.md](FEATURE_AUDIT.md), [Part 8](PART8_HANDOFF.md), [Part 9](PART9_HANDOFF.md) and [release handoff](PART10_HANDOFF.md). SOURCE/GATED below does not mean a feature is still absent from application code; actual signed proof remains pending.

Evidence levels: **LIVE** means a read ran successfully; **SOURCE** means the package's types/implementation or official bot source was inspected; **GATED** means further integration/runtime proof is required. No write below has been executed.

All `client` methods belong to `SomniaMarkets.client`; all `trader` methods require a signer. Exact parameter types are in [SDK_VERIFIED_SIGNATURES.md](SDK_VERIFIED_SIGNATURES.md). `ref` means `{marginBank, account, pool}`. Prices/amounts are bigint raw units; indexer numerical strings must be parsed without floating point.

## Feature-to-source map

| Feature | Exact API and underlying data | State / implementation decision |
|---|---|---|
| Discovery | `client.listPerpMarkets({limit})`; indexer Market rows with PERP type | LIVE. Cross-check factory; do not trust a static market count |
| Registration/fallback discovery | `listPerpPoolStatuses({factory})`, `listTradeablePerpPools({factory})`, `isPerpPoolRegistered({marginBank,pool})`, `readPerpMarketFromChain({...})` | Status enumeration LIVE; factory `getPerpPoolStatuses`, registration reads. Chain reconstruction SOURCE |
| System addresses | `getPerpSystemConfig(marginBank)` → MarginBank `getSystemConfig()` | LIVE; compare metadata and allowlisted configuration |
| Market risk | `getPerpRiskParams(pool)` → `getPerpPoolParameters()`; `getPerpHealthSnapshot(pool)` → `tryGetHealthSnapshot()` | Risk LIVE, health SOURCE. Effective IMF may differ from static initial margin |
| Mark/index/funding | `getPerpState(pool)`; pool views listed below | LIVE. Never use stale indexed last trade as current mark |
| Feed health | `getPerpFeedStatus(pool)` → `tryGetMarkPrice`, `getOpenInterest`, best-effort `getIndexPrice` | LIVE on retry. A failed read is unknown, not a zero price |
| Order book | `getSpotOrderBook(perpPool,{depth,blockNumber?})` → shared order-book level reads | LIVE on a Perps pool despite its method name. Liquidity is indicative, not guaranteed fillable |
| Live book/events | `watchMarket(pool)`, `watchUser(account)`, `subscribeLive(listener)`, `getLiveSpotOrderBook(pool,{depth})`, `getLiveUserOrders(pool,account)`, `getWatchStatus(pool)` | SOURCE; hydration failed bounded live checks. Display degradation and poll bounded chain snapshots |
| Wallet STT/token balance | viem `getBalance({address})`; ERC-20 `balanceOf(address)`, `decimals()`, `allowance(owner,spender)` | SOURCE; wallet funds distinct from margin/voucher |
| Account overview | `getMarginAccount(marginBank,account)` → `getAccountState`, `getWithdrawableCollateral`, `getAccountHealth`, `getMarginStatus` | LIVE on empty diagnostic address. Returns activePerpPools and asOfBlock |
| All positions | `listPerpPositionAnalytics({marginBank,account})`, `getPerpPosition(ref)`, `listPerpPositions(account,{includeFlat,limit,offset})` | Empty analytics read LIVE; non-empty accounting GATED. Union active pools, indexed positions and open orders; never silently omit failed markets |
| Position analytics | `getPerpPositionAnalytics(ref)`, `getPerpLeverage(ref)`, pure `perpPositionAnalytics(inputs)` | SOURCE. Signed position, entry, notional, PnL, funding and margin metrics |
| Current health | `getAccountHealth(marginBank,account)`; `tryGetPerpAccountEquity(marginBank,account)` | SOURCE. Null/unpriceable ≠ zero equity |
| Margin mode | viem `readContract` against verified MarginBank ABI `isolated(address account) view returns (bool)`; `isolationAllowsMarket(account,pool)` | SOURCE. Read-only mode display; no verified user mode-switching write |
| Maximum order size | `getMaxPerpOrderSize({pool,marginBank,account,isBid,price,autoPull?,builderFeeBpsTimes1k?})` | LIVE on retry. `priceable` first, then `placeable`, `maxQuantity`, `limitedBy` |
| Requested-order preflight | `previewPerpOrderMargin({pool,marginBank,account,isBid,quantity,price,autoPull?,builderFeeBpsTimes1k?})` | LIVE unfunded case. Read restrictions, top-up, funding payer and initial-margin result |
| Voucher | `getPerpVoucherCampaign(bank)`, `getPerpVoucherEligibility(bank,account)`, `getPerpVoucher(bank,account)` | Campaign LIVE; eligibility/account SOURCE. `trader.claimPerpVoucher({marginBank})` → distributor `claim()`; owner opt-in only |
| Owner signer | `client.createTrader({walletClient,account})` or exchange walletClient config | SOURCE. External EOA signing supported; browser approval and chain switching GATED |
| Owner order | `trader.buildPlacePerpOrder(params)` / `trader.placePerpOrder(params)` → PerpPool `placeOrder(...)` | SOURCE. Build path enables simulation, explicit wallet send, early hash capture and decoding |
| Cancel resting order | `trader.cancelOrder({pool,orderId})`; `cancelOrders({pool,orderIds})`; `cancelAllOrders(pool,opts)` | SOURCE. Cancel outcome must reconcile races with fills |
| Resize resting order | `trader.reduceOrder({pool,orderId,newQuantityRemaining})` / `reduceOrders({pool,reductions})` | SOURCE. This shrinks an order; it does not close a position |
| Amend resting order | `trader.amendOrder({pool,oldOrderId,alwaysPlace?,newOrder})`, `amendOrders({pool,amendments})` | SOURCE. Defer until current pool replacement/atomicity behavior is tested |
| Delegated order | viem `simulateContract`, `estimateContractGas`, `writeContract` for `placeOrderFor`, `cancelOrderFor`, `reduceOrderFor` | Exact official bot ABI below. No equivalent named Perps SDK wrappers. Optional second signing mode |
| Grants | `client.isOperatorAuthorized({pool,owner,operator,selector})`; `trader.setOperatorApprovalForPool({pool,operator,selectors,approved})` | SOURCE. Prefer initial linking in official UI. Test every intended selector and market |
| Native TP/SL | `placePerpStopOrder({registry,pool,isBid,quantity,triggerPrice,triggerOperator,stopOrderType,intent?,pair?,...})`; `linkPerpStopOrders`; `cancelPerpStopOrder`; `cancelPerpStopOrders` | SOURCE, owner only. `intent:'reduceOnly'` is supported here. Separate owner action, not assumed atomic with opening order |
| Stop payment/status/refund | `getPerpStopOrderSomiPayment(registry)`; `getPerpStopOrder(ref)`; `getPerpStopOrders(refs)`; `listPerpStopOrders(opts)`; `getUnclaimedPerpStopSomi({registry,account})`; `claimPerpStopSomi({registry})` | SOURCE. Read deposit dynamically. Native stop liveness/drop reason governs interpretation |
| Margin funding/withdrawal | `depositMargin({marginBank,amount,autoApprove?})`, `buildDepositMargin(...)`, `withdrawMargin({marginBank,amount})`, `buildWithdrawMargin(...)` | SOURCE. Bank `deposit(uint256)`/`withdraw(uint256)`; exact token approval to bank may precede deposit. Optional explicit owner workflow |
| Leverage | `getPerpLeverage(ref)`, `getPerpMaxLeverage(ref)`, `trader.setPerpLeverage({pool,leverageX,marginBank?})` | SOURCE. Bank `setMaxLeverage`; blocked/restricted for voucher or delegated roles |
| Close estimate | `previewPerpClosePnl({pool,marginBank,account,quantity?,price?,asMaker?})` | SOURCE. A preview is not a no-flip execution guarantee |
| Liquidation estimate | `getLiquidationPrice(ref)`; `previewPerpLiquidationPrice({pool,marginBank,account,isBid,quantity,price,asMaker?})`; pure `perpLiquidationPrice(inputs)` | SOURCE. One-market shock with other state frozen; not a precise liquidation forecast |
| Risk scenarios | Pure app calculations over verified margin, position and health snapshots; reuse `perpPositionAnalytics` | App feature, no invented risk endpoint. Scenarios never write |
| Receipt/evidence | viem `getTransactionReceipt`, `waitForTransactionReceipt`, `getTransaction`, `getBlock`; SDK `decodePlaceOrder(receipt,pool)`, `decodeRevert`, `contractErrorsAbi`, `orderBookEventsAbi`, `perpPoolEventsAbi`, `marginBankEventsAbi` | SOURCE. Store tx and fill outcomes separately; mined return values are not present in receipts |
| Reconciliation | `getOrderOnchain(pool,orderId,{blockNumber?})`, `getOwnOpenOrdersOnchain(pool,owner,opts)`, `getOrder`, `getOrderFills`, account snapshots | SOURCE. Events and order state first; indexer eventual consistency second |
| Indexer lag | `getSyncStatus(50383)`, `getIndexerFreshness(50383)`, `waitForIndexedBlock(50383,block,{timeoutMs,pollMs,signal})` | Sync LIVE; independent freshness SOURCE. Self-reported head can freeze too |
| Order/fill history | `getPerpPortfolio(account,opts)`, `listPerpOrderHistory(account,{pool,status,orderBy,limit,offset})`, `getUserFillsPage(account,options)`, `getOrderFills(pool,orderId,opts)` | Empty portfolio/history LIVE; pagination and non-empty coverage GATED |
| Funding/PnL/fees | `getFundingPayments(account,opts)`, `listFundingRateHistory(pool,opts)`, `listPerpPositionChanges(opts)`, `listPerpPositionChangesForFills(account,fills)`, `listPerpFees(opts)`, `getMarginEvents(account,opts)` | SOURCE. Per-position realized PnL is not lifetime account PnL; preserve bounds |
| Rejections/liquidations | `listPerpOrderRejections({owner,pool,reason,limit,offset})`, `listLiquidations(opts)` | Rejection read LIVE; single reverts need receipt/revert evidence rather than expecting an indexed rejection |
| Reports/test lab/alerts/AI | Application-owned attempt store, deterministic rules, redacted exports; optional explanation service | No SDK report/AI/test API. No signer available to AI. Alerts only while app active unless a worker is added |

## Exact order contract paths

Owner SDK encoding:

```solidity
placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity,
  uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption,
  address builder, uint96 builderFeeBpsTimes1k)
```

SDK sets `userData = 0`. Documented contract placement returns `(bool success, uint128 orderId)`; SDK reconstructs outcome from receipt events. Native value is zero for ordinary Perps orders.

Delegated ABI verified in official bot source:

```solidity
function placeOrderFor(address owner, bool isBid, uint64 userData,
  uint256 price, uint256 quantity, uint64 expireTimestampNs,
  uint8 orderType, uint8 selfMatchingOption, address builder,
  uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId);
function cancelOrderFor(address owner, uint128 orderId);
function reduceOrderFor(address owner, uint128 orderId, uint256 newQuantityRemaining);
function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool);
```

Selectors respectively: `0x80054449`, `0xe37b444b`, `0x364c2587`. Keep owner and transaction payer separate. No delegated collateral auto-pull assumption.

Order type mapping proven by SDK constants/source: GTC=`ORDER_TYPE.LIMIT` (0); FOK=`FILL_OR_KILL` (1); IOC/market=`MARKET` (2); ALO=`POST_ONLY` (3). Market execution still requires a positive bounded price; never send a made-up zero market price. Self-match policies: CANCEL_TAKER=0, CANCEL_MAKER=1. Expiry uses nanoseconds.

`getPerpState` reads `tryGetMarkPrice`, `getIndexPrice`, `getCurrentFundingRate`, `getCumulativeFundingPerUnit`, `getProjectedCumulativeFundingPerUnit`, `getOpenInterest`, `getFundingParameters`, `getLastFundingUpdateTimestampNs`, `getEmaPremium`, `oracle`.

Margin previews additionally inspect `getReducingCapacity`, `getAccountState`, `getAccountHealth`, `getMaxLeverage`, `getMaxLeverageLimit`, `getCreditFloor`, `getVoucherLeverageCap`, `isVoucherMarketAllowed`, `isRestricted`, `isolationAllowsMarket`, `getPerpPoolParameters`; maximum sizing also reads `getOrderBookParameters`. With auto-pull modelling enabled, token balance/allowance and linked funding-payer capacity are added. These are SDK computations using contract reads, not a fictional single preflight contract method.

## Missing-feature claim verdict

| Claim | Verdict |
|---|---|
| No real order trading, book or positions API | False: typed APIs and live read results exist; signed trading still requires a funded test |
| No margin preflight, account health, funding or liquidation estimate | False: existing methods above cover these |
| No native TP/SL | False for owner signing; true restriction for ordinary linked bots |
| No ordinary-order reduceOnly argument | Confirmed for the inspected 0.32.1 convenience surface; protocol-wide impossibility is not established |
| No delegated Perps convenience writes | Confirmed; officially demonstrated direct viem ABI route exists |
| No `placePerpOrders` batch wrapper | No such method in the inspected Trader interface. Do not invent it or misuse spot auto-approval. Raw batch support needs an exact ABI/behavior gate before implementation |
| No SDK-native HTTP fallback | Confirmed. HTTP fallback must be a separate explicit read adapter |
| No isolated-mode selector | No supported user-facing setter established here; preflight can detect isolation restrictions. Exclude mode switching |
| No reliable complete historical coverage | Complete coverage unproven; APIs exist but truncation, pagination, older indexers and indexing lag matter |
| No inspector, risk scenarios, export or diagnostic UX | Application opportunity, not proof of a protocol defect |
| Maker/funding/starter/guard/TWAP are novel | False: official bot kit already has these categories; TWAP in its general strategy set is not automatically a verified Perps implementation |

Do not file these as accepted bounty issues. Known restrictions and wrapper gaps are not vulnerabilities. Reproducible runtime discrepancies require a separate report and organizer deduplication.
