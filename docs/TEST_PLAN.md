# End-to-end execution and diagnostic test plan

Status: application and automated tests are implemented. See the part handoffs and [BUILD_PARTS.md](BUILD_PARTS.md) for actual results; this document remains the acceptance matrix, not a claim that every live case passed. Real user-signed lifecycle tests remain BLOCKED by wallet readiness. Research probes are public reads, and no complete security audit is claimed.

## Evidence schema and outcome rules

Each test records test/run ID, git revision once available, SDK version and archive integrity, UTC time, chain/genesis, owner/actor, market/pool, baseline block, prerequisites, exact method and normalized raw arguments, expected behavior, observed behavior, sanitized errors, transaction/receipt/logs when present, final position/open orders, result and limitations.

Allowed results: PASS, FAIL, BLOCKED, NOT RUN, INCONCLUSIVE. A simulation is not a sent transaction. A rejection caught before broadcasting has no transaction hash. A mined receipt with success is not sufficient to declare a fill. A timeout is not proof of a failed order. External public fills/rejections observed during research are not PEI execution evidence.

## Test environments

1. Unit/property tests: deterministic fixtures labelled as fixtures; no network or signing.
2. Browser UI tests: mocked transport for errors/races and read-only real-endpoint smoke where available. Mocked passes never count as live trading proof.
3. Controlled Hideki tests: separate authorized wallet with small paper balance and enough STT. Specify per-run transaction count, notional and gas budgets. One pending intent at a time. Record every consumed nonce and resulting state.
4. Optional linked-bot tests: dedicated operator and account controlled by the tester. Link through official UI; no main-wallet key in app or repository. Testing revocation does not cancel previously resting orders automatically.

## Deterministic and integration matrix

| Area | Required cases and assertions |
|---|---|
| Network/config | Chain 50383 accepted only with verified deployment; reject 50312/5031 and mismatched genesis/indexer; missing code/wrong collateral/pool-bank mismatch disables writes |
| Market discovery | Compare indexed and factory pools; new/restricted/unregistered markets; missing metadata; pagination/truncation; unknown symbols never trigger 18-decimal fallback for signing |
| Decimal properties | Generate 6/7/8/9/18/24-decimal cases, especially NEAR; parse/format roundtrip, tick/lot alignment, exact min boundary, overprecision, zero/negative/overflow, no JS-number intermediary |
| Order semantics | GTC=0, FOK=1, IOC=2, ALO=3; valid future expiry in ns; explicit self-match policy; market orders always have a positive price bound |
| Capacity | `priceable:false`; `placeable:false`; requested quantity above/below max; collateral, initialMargin, maxPositionSize, voucher, restricted, isolated, allowance and linked-payer constraints |
| Payer/approval | Owner versus operator actor; correct ERC-20 spender; amount-limited approval; no silent unlimited approval; auto-pull preview reflects possible wallet/main funding; preview flags do not claim contract enforcement |
| Snapshot risk | Long/short/mixed positions, flat/negative equity, open-order-only pools, missing/unpriceable markets, varying IMF; same-block inputs; no collateral or funding double count |
| Rounding | Compare local pure functions with SDK kernels and integer expectations, including negative PnL/funding and ceil/floor asymmetry |
| UI authorization | Connect does not sign; chain/account change invalidates confirmation; rejected signature remains not-sent; double-click/reload never duplicates intent; keyboard/mobile confirmation works |
| Transaction state | Broadcast, included, reverted, replacement, wallet cancellation, timeout with/without hash, transport loss after broadcast; recover by hash/nonce without automatic resubmit |
| Evidence | Filter logs by emitting address, correlate IDs/fills, retain failed receipt, distinguish direct revert from batch per-item rejection, redaction and CSV formula-injection tests |
| History | Page boundaries, deduplication, ordering ties, changing offset pages, truncated history, reset/reindex, partial backfill, missing PnL fields and local-versus-chain attempt identity |
| Resilience | WS disabled, reconnect, duplicate/out-of-order logs, old chain/indexer snapshots, rate limit/backoff, cancellation on unmount, abort after broadcast, endpoint recovery |

## Controlled live lifecycle

1. Verify package and chain/genesis/config. Read a candidate allowed market, actual lot/minimum/tick, fresh marks and usable book. Verify selected owner/actor and funding; never assume weekly Arena funds or voucher grants are present.
2. Capture baseline margin, position, open orders, voucher and STT. Use a pre-approved tiny budget and size respecting the current minimum. If minimum exceeds the test budget, mark BLOCKED instead of silently increasing exposure.
3. Preflight an intentionally malformed local decimal/grid input; assert no signature or broadcast occurs. Exercise an unfunded read-only capacity check separately.
4. Place one small non-crossing GTC/ALO order using current book data and explicit owner authorization. It can still fill if the market moves. Record wallet result, hash, receipt, decoded order ID/fills and chain order state.
5. Query resting remainder and margin lock. Cancel if still open. If it already filled, report that race and inspect the real position; do not report cancellation success. Reconcile released lock only after actual cancel evidence.
6. Place a separately approved small bounded IOC in a voucher-allowed market. Acceptance criteria for trade execution proof: actual fill event(s), receipt, correct pool/owner and position change. If no fill occurs, that is valid diagnostic evidence but not a filled-trade success.
7. Test partial fill only if organic testnet liquidity permits within budget. Never trade against unrelated controlled assumptions, manufacture competition wash trades or exceed funds to force a fill. Otherwise INCONCLUSIVE.
8. Reduce exposure using only an explicitly reviewed supported path. Plain opposite-side IOC lacks a verified no-flip flag and must not be called guaranteed reduce-only. Guaranteed reduce-only tests remain BLOCKED until a corresponding execution path is established; native reduce-only stop behavior is tested separately.
9. Confirm final open orders and exposure. Cancel leftover test orders within the authorized test scope. If cleanup cannot finish, show remaining orders/positions and exact user action needed; never declare the account clean from an indexer empty list alone.
10. Export the evidence bundle and replay its inspection offline with a prominent recorded/replay label. Obtain a working explorer route for actual hashes, or report the explorer blocker explicitly.

## Expected rejection and special-feature tests

| Scenario | Safe execution and expected diagnostic |
|---|---|
| IOC no fill | First simulate a non-crossing bounded IOC; expect ImmediateOrCancelNoFill. A mined failure requires separate deliberate test authorization and gas budget; simulation alone must be labelled as such |
| ALO crosses | Simulate against an observed opposing level; expect PostOnlyWouldCross. Market movement can change the result; use snapshot/time evidence |
| FOK insufficient depth | Simulate within funds; expect no partial fill when full size unavailable. Avoid confusing insufficient collateral with liquidity rejection |
| Voucher-blocked increase | Read-only preview/simulation on a disallowed market. Distinguish reduction exemptions from isolation rules |
| Position cap | Boundary math and simulation; do not build a large real position merely to hit a cap |
| Isolation | Use existing authorized isolated account if available; otherwise fixtures/simulation and NOT RUN live. Do not invent a mode-changing method |
| Bot unauthorized/revoked | Simulate before grant and after revoke; verify selectors per pool. Never call owner-only margin withdrawal or native stops via bot as an expected supported feature |
| Native stops | Read current payment; explicitly create small owner TP/SL, verify ID/liveness, cancel and verify refund or credited unclaimed amount. Trigger behavior only under controlled conditions; no price manipulation. Pair creation and order opening are separate transactions unless proven otherwise |
| Batch mixed outcome | Deferred until exact deployed batch ABI is verified. Reconstruct per-request outcomes from events; receipt success never means every request succeeded |
| Funding | Observe actual window/interval and lazy settlement over time; compare funding indices, payment records and position changes without double counting. Time-window dependency may require a longer test session |
| Stale mark | Use fixtures or an observed outage; do not manipulate oracle. Increasing-order preflight blocks; protocol-supported reducing exits must be distinguished from preview inability |

## Release gates

Required: clean install, lint/typecheck/build, precision/risk/state-machine tests, critical browser workflows, secret/export checks, real funded order lifecycle, a truthful controlled rejection diagnostic, account coverage and failure recovery. Test sizes and request concurrency remain bounded. Broader load testing needs a separate agreed scope.

Re-run only affected tests after changes, plus the essential release smoke. Record exact outcomes in TESTNET_EVIDENCE and FEATURE_AUDIT when they exist; do not fill these documents with hypothetical transaction hashes.
