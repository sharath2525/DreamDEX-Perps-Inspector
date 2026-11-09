# Part 9 — owner and operator operations

Code implemented 4 November 2026; **real signed acceptance remains BLOCKED by wallet readiness**. The app adds Account operations at `/positions/manage`. No live claim, approval, deposit, withdrawal, stop, operator grant or delegated order was sent during development.

## 9A: owner-native stops

Discover the stop registry from factory `getStopOrderRegistry(pool)` after verifying the market. Read `somiPaymentPerOrder`, `unclaimedSomi`, the owner's position and effective placement permission. A separate pool-scoped grant authorizes only `placeOrderFor` for that registry. SDK `buildPlacePerpStopOrder` builds fixed-size reduce-only LIMIT stops or a linked pair, with independently encoded calldata comparison, exact tick/lot checks, actual native payment and no hidden approval. The pair uses the reviewed limit on both legs. Opening stops, whole-position sentinel sizing and attaching stops before an order fills are not offered.

`listPerpStopOrders` shows up to 50 pending/terminal records with drop/cancel reasons. Listing is indexed and cannot prove complete coverage. A known-ID read uses `getPerpStopOrder`; its live result, not leftover storage, gates cancellation. `buildCancelPerpStopOrder` cancels one live owned leg; its sibling remains armed. Raw `claimSomi()` recovers an observed nonzero refund credit. `decodePerpStopOrderIds` recovers actual creation IDs from receipts. A trigger does not guarantee a fill, and the trigger payment is consumed when it fires.

## 9B: margin and voucher

Read bank state, withdrawable balance, voucher floor, collateral wallet balance/allowance, credit granter and linked-main funding state. `getPerpVoucherEligibility` gates SDK `buildClaimPerpVoucher`; the target must still match the bank's live distributor and contain code. Eligibility alone does not replace simulation.

ERC-20 `approve(verifiedMarginBank, exactAmount)` is a separate transaction; existing nonzero allowances must first be reset to zero. SDK `buildDepositMargin({autoApprove:false})` never embeds the SDK's broad default approval. SDK `buildWithdrawMargin` is bounded by the fresh withdrawable balance. Both builders are checked against independent exact calldata. Linked-main-funded margin flows are blocked pending a dedicated repayment/payer UX. Only directly signing EOAs may use these owner actions; no forwarding to project wallets exists.

## 9C: delegated trading

The pool's `getOperatorPermissionsRegistry` must equal the verified deployment. Effective `isOperatorAuthorized(owner,operator,selector)` is read per selector and pool. Owners can explicitly grant/revoke only place/cancel/reduce for that pool using `setOperatorApprovalForPool`; no global grants, withdrawal permissions or delegated owner-stop flow is exposed.

Distinct connected actor and receiving owner are required for raw `placeOrderFor`, `cancelOrderFor` and `reduceOrderFor`. These exact ABIs were verified against the official bot integration and installed package constants; no invented SDK convenience methods are used. Placement is post-only, exact-grid, time-bounded and simulated with the actual operator, using prefunded owner margin (`previewPerpOrderMargin` with `autoPull:false`, no top-up/main payer). Reduce changes an existing order's remainder; it is not a guaranteed no-flip position close.

## Signing and evidence

`send-operation.ts` and the existing direct-order sender share identity locks and unresolved-journal checks. Owner and actor locks are sorted to prevent deadlock. A fresh preflight rechecks identity/genesis, permissions, target, calldata, native value, nonce and gas ceiling. The exact nonce is saved before signing and included in the request; recovery cannot use an older identical approval/deposit with a different nonce. Storage failure blocks signing. Wallet rejection is separate from unknown outcome. No automatic retry or batch send exists.

The operation journal stores public call metadata, never keys/signatures. Explicit receipt inspection checks sender, nonce, target, calldata, value, chain and canonical block. It displays actual stop IDs/delegated fill events and subsequent account observations. A successful receipt is not automatically a successful business outcome. Different-call wallet replacements remain unresolved in the operation journal; the earlier order inspector's replacement workflow is separate.

## Verification

The 25-test operation/direct-trading regression passed, followed by 13 focused Part 9 checks including nonce-bound recovery, revoked permissions, wrong owner, exact approvals, insufficient native payment, linked pair encoding, liveness and delegated placement/reduction. Final release regression is recorded in the Part 10 handoff.

Four live public read checks passed: margin state, factory-derived stop context/payment, indexed stop listing and an unauthorized operator's effective permissions. Evidence: [part9-live.json](research/part9-live.json). Empty indexed stops do not demonstrate a real stop lifecycle. Actual owner signatures, create/cancel/refund and authorized delegated execution/revocation tests remain unperformed.

Review with your own wallet only when ready: connect actor in Positions → Account operations → select receiving owner/action/market → check → review exact terms/native payment/gas/nonce → explicitly confirm in wallet → verify actual receipt → inspect current permissions, liveness or residual orders/exposure. Never paste private keys into the app or chat.
