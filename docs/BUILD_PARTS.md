# Perps Execution Inspector — build in reviewable parts

This is the delivery sequence requested after the architecture review. It refines [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); the verified integration limits in [CAPABILITIES.md](CAPABILITIES.md) still apply.

Status (4 November 2026): Parts 1–9 code implemented. Parts 5–6 and 9 real signed acceptance remain BLOCKED by wallet readiness. Part 10 software verification and private deployment are complete; full trading acceptance still depends on those gates. See [release handoff](PART10_HANDOFF.md). The user authorized completing the remaining parts in sequence.

## Working agreement

Implement one part at a time. Within an authorized part, complete its code, relevant checks, documentation and fixes without repeatedly asking about routine implementation choices. At the end, provide a usable result and review checkpoint before advancing to the next part.

Each handoff reports: what works, files changed, checks actually run and their results, a short demo procedure, known limitations, and the next part. Record failed and blocked checks explicitly. A feature is complete only when its acceptance criteria have evidence; screenshots and mocked tests alone cannot prove live trading.

Keep changes scoped, preserve previously working behavior, and run focused regression checks at each dependency boundary. Recheck mutable network/contract parameters before integration and signing. Do not silently upgrade SDK 0.32.1. Public publishing, social posts and bounty submission remain separate actions.

## Sequence and checkpoints

| Part | Result to review | Depends on | Current status |
|---|---|---|---|
| 1 | Runnable application foundation | Existing research | IMPLEMENTED; 7 browser checks passed |
| 2 | Verified live markets and data health | 1 | IMPLEMENTED; live reads and failure recovery checked |
| 3 | Read-only wallet/account and positions | 2 | IMPLEMENTED; public live accounts and simulated wallet lifecycle checked |
| 4 | Precision-safe order composer and preflight | 3 | IMPLEMENTED; six live read/simulation checks passed |
| 5 | First real order, receipt inspection and cancellation | 4 | CODE IMPLEMENTED; LIVE ACCEPTANCE BLOCKED — user wallet not ready |
| 6 | Complete execution diagnostics and evidence export | 5 | CODE IMPLEMENTED; real signed execution demonstration BLOCKED by Part 5 |
| 7 | Portfolio Risk Lab | 3 and 6 | IMPLEMENTED; six-position live baseline exactly reconciled |
| 8 | History and Developer Test Lab | 6 and 7 | IMPLEMENTED; four live history probes passed |
| 9 | Individually gated owner/operator features | Relevant earlier parts | CODE IMPLEMENTED; 13 focused tests passed; signed acceptance BLOCKED |
| 10 | Release verification, deployment and handover | Core parts 1–8 | PRIVATE RELEASE DEPLOYED; clean build and 62 tests passed; real execution gate BLOCKED |

Part 5 is the first signed-trading milestone. Parts 1–4 never broadcast transactions. Part 9 is not mandatory for a useful initial release; each selected feature is its own reviewable increment. Optional AI and autonomous strategies stay outside this sequence.

## Part 1 — runnable foundation

**Build:** Vite/React/TypeScript app, minimal npm workspace, pinned SDK dependency and compatible locked dependencies, routing/providers, accessible responsive shell, network badge, error boundary and truthful empty/not-yet-implemented states. Add README setup, environment placeholders, ignore rules and lint/typecheck/build commands. Establish protocol-module boundaries without manufacturing unused packages.

**Files:** root manifests/configuration; `apps/web` bootstrap, shell and styles; initial `packages/perps-adapter` configuration/types; `.env.example`, `.gitignore`, README. Existing research docs remain intact.

**Acceptance:** reproducible install and production build; typecheck/lint pass; app launches and navigation, keyboard focus and small-screen layout work. No fake balances, prices, transactions or active controls suggesting unfinished functionality exists. Trading remains unavailable.

**Review demo:** launch locally, navigate the shell, resize the page, inspect the TESTNET label and empty states.

## Part 2 — live markets and connection health

**Build:** SDK client lifecycle, chain/genesis/config verification, indexed discovery cross-checked with factory status, dynamic precision/grid metadata, selected-market mark/index/funding/risk and book. Add source timestamps, independently measured indexer lag, partial/error states and bounded retries. Streaming is optional until demonstrated; selected verified HTTP reads provide explicit degraded-mode diagnostics.

**APIs:** `getPerpSystemConfig`, `listPerpMarkets`, `listPerpPoolStatuses`, `getPerpState`, `getPerpRiskParams`, `getSpotOrderBook`, `getIndexerFreshness`; viem chain/genesis/code reads. Use the exact signatures already inspected.

**Acceptance:** actual testnet data renders with provenance; observed pool registration and collateral match; no fixed market count or 18-decimal assumption. Wrong chain, bad configuration, unavailable WS and lagging indexer are visible. A failed request never becomes zero-valued market data. Polling and subscriptions stop correctly on navigation/disposal.

**Review demo:** search a live market, inspect its metadata/book, and demonstrate a controlled connection failure and recovery. Fresh prices remain observations, not execution promises.

## Part 3 — read-only wallet, margin and positions

**Build:** public address lookup and optional wallet connection, owner/actor distinction, STT/token versus Perps balances, locked/unlocked collateral, voucher floor/withdrawable amounts, health, all active positions and pending orders. Preserve unknown/unpriceable rows and coverage indicators.

**APIs:** `getMarginAccount`, `getPerpVoucher`, `getPerpPosition`, `listPerpPositionAnalytics`, `listPerpPositions`, `getPerpPortfolio`, chain open-order reads; viem balances and verified token reads.

**Acceptance:** no signature on connection or lookup; changing/disconnecting accounts invalidates account caches and subscriptions; arbitrary addresses never inherit another account's data. Shared collateral counted once; empty, failed and partially loaded portfolios remain distinct. Actual non-empty position coverage must be checked before claiming it is demonstrated; fixtures alone are insufficient.

**Review demo:** look up an address, connect read-only, switch accounts and inspect portfolio coverage. Select the likely execution path for Part 5: directly owned EOA or separately authorized app-account operator. Never equate a login EOA with its app smart account.

## Part 4 — order composer and preflight

**Build:** buy/sell, limit/bounded-market and verified TIF mapping, exact decimal parsing, tick/lot/minimum validation, expiry, book-based estimates, capacity/margin preview, gas estimate and normalized unsigned intent. Clearly expose potential funding payer/allowance implications. No broadcast button yet.

**APIs:** `getMaxPerpOrderSize`, `previewPerpOrderMargin`, SDK order constants; `buildPlacePerpOrder` and viem simulation/estimation where a verified actor is available. Building/simulation must not request a signature.

**Acceptance:** meaningful unit/property checks across 6–24 base decimals; reject invalid grid, insufficient funds, stale required data and incompatible permissions. Handle `priceable` before accessing size fields. `limitedBy` is a size constraint, not automatically a rejected order. No unsupported ordinary `reduceOnly` switch. Changed input/account/network invalidates readiness.

**Review demo:** valid preflight plus invalid precision and insufficient-margin examples, with exact reasons and no transaction.

## Part 5 — first real order lifecycle

**Build:** explicit confirmation, wallet-authorized send of SDK-built calldata, immediate hash persistence, receipt/event decoding, minimal inspector, chain order/fill/position reconciliation and explicit cancellation of resting orders. Include local duplicate-click prevention and an outcome-unknown state from the first version; these cannot wait until Part 6.

**APIs:** `buildPlacePerpOrder`, wallet send, viem receipt/block reads, `decodePlaceOrder`, `getOrderOnchain`, position/account reads, `cancelOrder`. If the selected account needs delegation, include a narrowly scoped adapter using the exact official `placeOrderFor`/`cancelOrderFor` ABI and permission checks here rather than postponing the necessary signer route.

**Prerequisites:** user-selected authorized test account; actual paper collateral and STT; agreed small notional/gas budget; current allowed market. No private key needs to be shared with the chat. Routine code can be completed before the user signs the prepared test.

**Acceptance:** a real receipt and decoded outcome for the intended account. Filled-trade proof additionally requires actual fill evidence and reconciled position impact. Test a resting order and cancellation when liquidity permits. A reverted/unfilled attempt is diagnostic evidence, not successful fill proof. Record residual positions/orders honestly; no guaranteed no-flip close claim without a verified supporting operation.

**Review demo:** confirm a small real order, inspect actual receipt/fill/resting state, cancel any confirmed resting remainder, and show exposure afterward. If wallet/funds or liquidity block the run, label the live gate BLOCKED and do not mark Part 5 complete.

## Part 6 — execution diagnostics and exports

**Build:** full attempt timeline, deterministic error explanations, before/after evidence, transaction versus business outcome, bounded indexer reconciliation, reload recovery, replacement/cancellation handling and sanitized JSON/Markdown exports. Add useful next checks, not blind resubmit buttons.

**Acceptance:** demonstrate a real execution from Part 5 and a controlled expected rejection, clearly distinguishing simulated rejection from mined failure. Exercise transport loss after broadcast, unknown outcome, delayed indexing and duplicate events with appropriate fixtures. Exports retain precision and provenance and exclude credentials/session/signing material.

**Review demo:** inspect success/rejection, refresh during tracking, export evidence and inspect it as a labelled recorded run.

## Part 7 — Portfolio Risk Lab

**Build:** coherent account snapshots, per-position metrics, uniform/custom shocks, concentration and maintenance-headroom comparisons, optional hypothetical-order and funding scenarios. Reuse SDK pure analytics and verify required rounding. Risk scenarios never write.

**Acceptance:** baseline agrees with actual snapshot within explicitly documented rounding. Long, short, multi-market, zero/negative equity, funding and missing-market cases have meaningful tests. Count collateral and existing funding once. Label frozen prices/parameters/orders and incomplete coverage; never claim exact future liquidation or stop protection.

**Review demo:** inspect actual positions, compare three shocks, change one market scenario and explain the resulting equity/headroom differences and assumptions.

## Part 8 — history and Developer Test Lab

**Build:** bounded order/fill/funding/margin history, filters/pagination, disclosed coverage, CSV/report exports and a read-only diagnostic suite. Add opt-in controlled transaction cases using the existing execution path, prerequisites and per-run budget.

**Acceptance:** no duplicate records across pages, no lifetime metrics inferred from a partial window, no batch-wide success inferred from a successful receipt. Reports show exact inputs, expected/actual, sources and PASS/FAIL/BLOCKED/NOT RUN/INCONCLUSIVE. Expected protocol restrictions are not labelled bugs. Test CSV injection and export sanitization.

**Review demo:** filter actual account history, inspect a record, run a bounded diagnostic suite and export its results.

## Part 9 — conditional features, one at a time

Choose each increment separately; none may bypass its protocol/signing gate:

| Increment | Deliverable | Required proof |
|---|---|---|
| 9A Native owner TP/SL | Payment display, creation, liveness/drop reasons, cancel/refund; pairing where supported | Actual registry/payment/grant checks, owner signature and real create/cancel evidence; no bot-native-stop promise |
| 9B Voucher and margin management | Eligibility/claim, explicit deposit/withdrawal, verified amount-limited approvals | Correct token/spender/payer, voucher restrictions, actual receipt/state proof; no transfers to project wallets |
| 9C Expanded delegated mode | Per-pool place/cancel/reduce permissions, status and revocation handling | Correct receiving owner, distinct gas payer, authorized account tests; no withdrawal/owner-stop authority |

Defer ordinary no-flip reduce-only, isolated-mode switching and batch placement unless a supported deployed ABI/path is independently established. New contracts are not part of the solution.

## Part 10 — release and handover

**Build:** final responsive/accessibility/error-recovery polish, dependency/configuration and secret checks, clean-checkout setup/runbook, feature audit, actual test evidence, testnet deployment and a concise demo. Prepare submission materials using current eligibility information.

**Acceptance:** required typecheck/lint/build and relevant unit/property/browser checks pass; real execution and recovery gates have evidence; demo/deployment links work; remaining limits are visible. Explorer deep links must be verified, never guessed. Recheck organizer deadline/whitelist before claiming bounty eligibility. X posts and public submission require genuine user-authorized publication.

**Review demo:** a new user follows README setup and completes discovery → preflight → explicit order → actual outcome → risk inspection → evidence export.

## Completion record for each part

Append the actual record here after its reviewable work is finished:

```text
Part:
Status: IN PROGRESS | READY FOR REVIEW | COMPLETE | BLOCKED
Working behavior:
Files changed:
Checks run and actual results:
Live evidence (if applicable):
Demo steps:
Limitations / required user action:
Next part:
```

No part is complete merely because its UI exists. Research and all future code stay auditable against the existing source, capability, security and test documents.

## Parts 4–5 delivery record — 3 November 2026

- Part 4: IMPLEMENTED / READY FOR REVIEW. Exact composer, real SDK sizing/margin/build path and actual-actor simulation; six live read/simulation checks passed.
- Part 5: CODE READY FOR REVIEW; LIVE ACCEPTANCE BLOCKED. Direct-wallet submission, persistence/deduplication, basic receipt inspection, verified hash recovery and resting cancellation implemented. User requested code/tests first because their wallet is not ready.
- Final verification: lint/build/typecheck passed; 31 Playwright checks passed, including live public reads, synthetic wallet lifecycle and responsive order/inspector checks. No live signature or transaction was performed.
- Detailed behavior, test evidence, demo and limits: [PARTS4_5_HANDOFF.md](PARTS4_5_HANDOFF.md).

## Parts 6–7 delivery record — 4 November 2026

- Part 6: CODE READY FOR REVIEW; real signed lifecycle acceptance remains BLOCKED by the Part 5 wallet gate. Timeline, receipt diagnostics, bounded indexer checks, same-nonce replacement verification and sanitized JSON/Markdown downloads are implemented.
- Part 7: IMPLEMENTED / READY FOR REVIEW. Frozen portfolio snapshots, SDK-based uniform/per-market shocks, concentration, headroom and scenario exports are implemented. Incomplete coverage and baseline mismatches withhold totals.
- Verification: production build, final TypeScript checks and lint passed; all 44 Playwright tests passed with live reads enabled. Six independent live probe checks passed; six positions reconstructed equity and all three margin requirements with zero raw-unit difference. Desktop/mobile screenshots were inspected; the local development server returned HTTP 200.
- No wallet signing, on-chain write, feedback submission or public deployment occurred. Parts 8–10 remain later increments.
- Detailed integration map, evidence, demo and limits: [PARTS6_7_HANDOFF.md](PARTS6_7_HANDOFF.md).
