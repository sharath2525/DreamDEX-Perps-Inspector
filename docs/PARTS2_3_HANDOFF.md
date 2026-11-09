# Parts 2–3 — read-only markets and accounts

Implemented and verified 3 November 2026 IST. The user explicitly authorized proceeding through Part 3 after Part 1. No Part 4 order composer, signing, transactions or new contracts were introduced.

## Delivered

Markets discovers the current factory pool set and cross-checks each pool's registration, code, MarginBank, base token metadata and trading rules. Indexer rows supplement discovery, while factory-absent rows are excluded and reported. Failed metadata remains visible. Search by symbol or pool address; inspect one market's mark/index, funding window/cadence, book, open interest, fees and limits. The app never displays indexed funding-cadence mark values as current market prices.

Positions accepts a public account address or optional EIP-6963/injected wallet access. It shows STT and wallet tokens separately from Perps margin, account-wide equity/headroom, collateral lock, withdrawable amount, voucher floor/expiry, margin mode, current positions and pending orders. The owner being inspected and connected wallet are shown separately. Ownership and signing authority are never inferred from a login wallet or deployed bytecode.

Each chain snapshot verifies chain ID, genesis, fresh RPC head, contract-code presence and expected system addresses/wiring, then pins its component reads to one block. Account health can fail without removing readable balances or positions. Unpriceable and failed position rows remain visible. Bank-active pools, indexed position pools and order-bearing pools are combined. Shared collateral is counted once.

Account changes, chain changes, disconnect and lookup changes cancel/remove account queries. Old query data is never used as the new address's placeholder. Wallet discovery is passive; Connect read-only explicitly requests account access. Connection uses only `eth_requestAccounts` and `eth_chainId`. There are no network-switch requests, message signatures or broadcasts. Unsupported providers without account-change events are rejected in favor of address lookup.

## Transport decision and exact integration

The verified SDK uses WebSocket for its chain tier and has no native HTTP fallback. This implementation deliberately uses an application-owned **HTTP snapshot adapter** for pinned chain reads, plus the SDK's public indexer methods and pure position arithmetic. This is not a claim that SDK `getPerpState` or `getMarginAccount` ran over HTTP. Only public package exports are imported; minimal raw ABIs were transcribed from the pinned package's `dist/readsAbi.js` and checked against the live deployment.

| Feature | Implemented source |
|---|---|
| Network verification | viem `getChainId`, `getBlock({blockNumber:0n})`, latest `getBlock`, `getCode` for bank/factory/collateral |
| System wiring | MarginBank `getSystemConfig()`; expected bank, collateral, factory and `fullyWired` checked |
| Discovery | SDK `client.listPerpMarkets({limit:1000})`; factory `getPerpPoolStatuses()` |
| Pool verification/metadata | bank `isPerpPoolRegistered(pool)`; pool `marginBank`, `getOrderBookParameters`, `getPerpPoolParameters`; base/collateral ERC-20 `decimals`, `symbol`; pool code |
| Prices/funding/book | pool `tryGetMarkPrice`, `getIndexPrice`, `getCurrentFundingRate`, `getOpenInterest`, `getFundingParameters`, `getLastFundingUpdateTimestampNs`, `getBookLevels(true/false,10)` |
| Indexer health | SDK `client.getSyncStatus(50383)` compared with a fresh independent HTTP head sampled **after** the indexer replies; processed-block timestamp when available |
| WebSocket health | Bounded `eth_chainId` connectivity probe; connection closes after result/timeout/abort. No stream hydration or subscription claimed |
| Account state/health | bank `getAccountState`, `getAccountHealth`, `getMarginStatus`, `getWithdrawableCollateral`, `isolated` |
| Wallet funds | viem `getBalance`; collateral `balanceOf(owner)`; same pinned block |
| Voucher | bank `getCreditFloor`, `getCreditGranter`; discovered distributor `isClaimed`, `voucherExpiryOf`. Zero granter is reported as programme inactive |
| Position enumeration | bank active pools plus SDK `client.listPerpPositions(owner,{limit:500,offset:0})` plus order-bearing pools |
| Position calculation | bank `getPosition(owner,pool)` and pool `tryGetHealthSnapshot()` at the same block; public SDK `perpPositionAnalytics(inputs)` |
| Pending orders | pool `getOwnOpenOrders()` using `account: owner` as the `eth_call` sender, then `getOrder(id)` at that block. This is simulation context, not impersonated signing |
| Public test sample discovery only | bank `getSideHoldersPaginated(pool,true,0,1)` and pool `getAllOpenOrdersOffChain(true,1,0)`; these sample helpers are not application features |

The SDK version remains 0.32.1. The official [developer documentation](https://app.testnet.dreamdex.io/docs/developers/perps-testnet) and [account/bot relationship guide](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot) were rechecked before integration. The ordinary SDK chain wrappers remain documented in `SDK_VERIFIED_SIGNATURES.md`; the table above records what this implementation actually calls.

## Validation and evidence

- Clean locked install was verified in Part 1. Package versions are unchanged in Parts 2–3; the web workspace now explicitly declares its existing viem dependency.
- Final ESLint, TypeScript and production build passed. Vite still reports a bundle-size warning: the lazily loaded SDK chunk is about 1.12 MB uncompressed / 267 KB gzip. This is a performance limitation for release optimization, not a suppressed warning.
- Final Chromium suite: **16 passed in 17.3 seconds**, including the opt-in live browser test. Default deterministic runs skip the one live test unless `PEI_LIVE_READS=1` is set.
- Shell checks cover routes, keyboard focus, mobile layout, themes, denied storage and clipboard behavior.
- Read checks cover chain/genesis/system mismatches, indexer outage fallback, dynamic 9/6 decimal fixtures, unavailable marks, HTTP outage/recovery, preserved unpriceable positions, unavailable health, pending orders, changed accounts, wrong wallet chain, disconnect, cancellation and polling disposal.
- The first combined run had 15 passed and one test-selector failure: the order ID was inside a cell containing the pool address. The locator was corrected, and the final complete run passed.
- Live browser reads succeeded against the real public endpoints, confirming browser access/CORS and actual rendering. Desktop and mobile screenshots are in `test-results/`; layouts were visually inspected.
- Local development server returned HTTP 200 at `http://127.0.0.1:5173/`; opening its review tab was queued by the app.

Saved public evidence: [`research/parts2-3-live.json`](research/parts2-3-live.json), generated by `scripts/verify-live.mjs`. Eight probe checks succeeded. These are observations at their recorded blocks, not permanent market counts or prices:

| Observation | Evidence |
|---|---|
| Discovery | 21 pools; all metadata verified at block 40301252 |
| Independent indexer lag | 17 blocks / 2 seconds against later head 40301280 |
| Selected market | SOL mark/index/funding/book reads succeeded; dynamic 9 base / 18 collateral decimals |
| Empty diagnostic address | `0x0000000000000000000000000000000000000001`; successful empty state, not the user's wallet |
| Non-empty public account | Six positions at block 40301309; all position reads and pricing available |
| Equity reconciliation | Bank equity and shared collateral plus six position contributions matched exactly: difference **0 raw collateral units** |
| Public resting-order account | 179 order IDs/details, 21 scanned pools, complete enumerated coverage at block 40301347 |

Public sample addresses are not associated with the user and are not prefilled into the application. No successful transaction or fill by this app is claimed. Real browser-wallet extension authorization was not exercised; lifecycle behavior was tested with a controlled EIP-1193 provider. Firefox, Safari and mobile wallet deep links remain unverified.

## Bounds and remaining limitations

Discovery refreshes every 60s, selected market every 15s, account every 30s. Hidden-tab polling is disabled. Navigating away aborts query work; SDK indexer clients close in `finally`. HTTP reads have a 12s request timeout and one retry; indexer operations have a combined 10s abort deadline and one attempt. Scan concurrency is three. WebSocket probe timeout is 5s.

Indexed discovery is limited to 1,000 rows and indexed active-position supplementation to 500 rows. Account scans cover at most 256 pools and expand at most 300 orders. Bounds/failures produce visible partial-coverage messages; omitted bank-active positions retain unknown rows. Historical completeness is not claimed. Rows with failed metadata retain addresses/raw quantities.

No stream subscription, historical PnL accounting, liquidation forecast, wallet ownership challenge, operator approval, order composer or trade execution exists yet. The app stores only theme preference persistently. Public address queries are sent to the fixed public RPC/indexer services. No backend or private API credentials are used.

The known moderate development-tool minimatch advisory remains documented in README; production-only npm audit was clear during Part 1. No blanket dependency override was introduced.

## Review and next step

Run `npm run dev`, open Markets, search SOL and select Inspect. Check metadata, freshness and the book. Open Positions, paste an account's public address, and inspect coverage and owner identity. Optional Connect read-only requests account access only. Use Settings to inspect the expected deployment. A page refresh clears inspected addresses.

Part 4 is next: precision-safe order composition and margin preflight, still without broadcasting. The likely first signed path remains a directly controlled EOA only if it is the actual funded Perps owner. An app smart account requires a separately verified owner/operator route; no account relationship has been assumed from these read-only tests.
