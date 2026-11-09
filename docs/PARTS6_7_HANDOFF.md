# Parts 6–7 handoff — 4 November 2026 IST

Part 6 code is implemented; its required demonstration using a real application-signed execution is **BLOCKED by the Part 5 wallet gate**. Part 7 is implemented and independently verified with a six-position public testnet account. The user authorized these parts and asked to finish their remaining work. No wallet signing, on-chain write, feedback submission, vulnerability disclosure or social publication occurred.

## Part 6: execution diagnostics

The inspector now displays the persisted preflight/review/wallet/hash/receipt timeline. Legacy records remain readable and explicitly lack timestamps that were never recorded. Journal writes merge event identities under the existing browser lock. Original intent, local journal status, actual receipt outcome, current order remainder and block-level margin/position changes remain separate.

The adapter deduplicates logs by block hash, transaction hash and log index, rejecting conflicting duplicates. A successful receipt without fill events is not promoted to a fill. Margin and position observations at the parent/receipt block are labelled whole-block comparisons; other transactions may contribute.

Indexer reconciliation uses the pinned SDK's real `getSyncStatus(chainId)` and `getOrder(pool,orderId)` methods, with at most three watermark observations, an eight-second abort budget and no automatic retries. A current watermark only establishes block processing, not that a matching order exists. Chain receipt evidence is kept when indexing is delayed, missing or unavailable.

A mined revert can be replayed using read-only `eth_call` at the parent block. SDK `decodeRevert` feeds a deterministic explanation and next check. The app labels replay as approximate: parent-block state differs from the exact pre-transaction state, and a successful replay does not invalidate the receipt's revert. Preflight failures can be downloaded as explicitly unbroadcast local diagnostics.

Known missing hashes still require full owner/pool/calldata/value verification. Speed-ups, wallet self-cancellations and different-call replacements are now handled by a separate candidate-hash flow. The original transaction must be retrievable from the RPC; the candidate must share its sender and nonce, name chain 50383 and have a canonical mined receipt. A repriced identical intent uses the new receipt; different calls are labelled replacements and never inferred to fill the original order. An unavailable original or mismatching nonce remains unresolved. This flow does not broadcast cancellation transactions or automatically resubmit anything.

JSON and Markdown exports contain allowlisted intent, public provenance, preflight fields, timeline, actual receipt/fills, before/after observations and indexer results. Raw errors, credentials, wallet sessions, private keys, signatures and signed transactions are not copied. Bigints become exact decimal strings. Markdown escapes code-block delimiters and markup characters inside its data block. Downloads are deliberate local actions; they do not create bounty reports or send them anywhere.

## Part 7: Portfolio Risk Lab

The account reader now retains the exact `PerpPositionAnalyticsInputs` from the same pinned block as each position. The Risk Lab freezes a selected snapshot, then calls SDK `perpPositionAnalytics` for baseline and shocked marks. No new contracts or transaction paths were introduced.

Supported controls: uniform presets −20%, −10%, 0%, +10%, +20%; manually entered percentages from −95% to +300% with two decimal places; individual market overrides; explicit refresh/reset; JSON/Markdown scenario downloads. Blank market overrides inherit the uniform setting. Invalid/currently calculating edits keep the last valid calculation visibly labelled and disable exports until current.

Outputs: baseline/scenario equity, initial and maintenance headroom, initial/maintenance/close-out requirements in the export, gross/net notional, gross leverage when equity is positive, per-position PnL and accrued funding, and gross-notional concentration. Shared unlocked plus locked collateral is counted once. Existing funding is subtracted once via SDK equity contribution. Zero/negative equity yields undefined leverage, not infinity or a fabricated risk score.

Before aggregate results are exposed, all required position/precision/price inputs must exist and reconstructed equity/IM/MM/CM must exactly equal the observed account health. Tolerance is zero raw quote units. Unknown rows remain visible; missing data and baseline mismatches withhold totals. A test found stale results when a refreshed snapshot reused the same block; query identity now includes its observation time, and the refresh regression is covered.

Model assumptions: frozen position sizes, collateral, funding indices and margin parameters; hypothetical marks rounded down to raw quote units; PnL truncation toward zero, funding rounding toward positive infinity, margin rounding up as implemented by SDK 0.32.1. Resting orders do not fill or cancel. Fees, future funding, new orders, transfers and liquidation actions are excluded. Scenario headroom is not an exact liquidation price, future prediction or stop protection. Optional future funding and hypothetical-order scenarios are outside this increment.

## Exact sources and methods

| Behavior | Verified implementation source |
|---|---|
| Network/deployment/current account | Existing HTTP `verifyDeployment`, bank `getAccountState`, `getAccountHealth`, `getPosition`, pool `tryGetHealthSnapshot` at the same block |
| Risk arithmetic | SDK 0.32.1 `perpPositionAnalytics(inputs)`; inspected `dist/perp/margin.js` rounding and outputs |
| Receipt/fills | viem `getTransactionReceipt`, `getTransaction`, `getBlock`; SDK `decodePlaceOrder(receipt,pool)`, `orderBookEventsAbi` |
| Indexer | SDK `getSyncStatus(chainId)` and `getOrder(pool,orderId)`; no invented HTTP API |
| Revert diagnostics | viem `call` at parent block; SDK `decodeRevert` |
| Replacement verification | viem original/candidate transaction reads, candidate receipt and canonical block; same sender/nonce/chain |
| Evidence exports | Application-owned allowlist and exact decimal serialization; no remote write |

[Official developer documentation](https://app.testnet.dreamdex.io/docs/developers/perps-testnet) was checked alongside the pinned installed SDK. No dependency version changes were made.

## Live evidence

`node scripts/verify-risk.mjs` produced [parts6-7-live.json](research/parts6-7-live.json) at 2026-11-04T06:21:27Z. All six checks passed: account read, baseline, −20%, +20%, custom-market shock and indexer watermark observation. The public sample had six positions at block **41194437**; equity, IM, MM and CM reconstruction differences were all **0**. The indexer reported processed block **41194467**, beyond the target block. No order row was claimed in that watermark-only check.

The public account is a protocol observation, not the user's wallet. No source in this evidence proves the app has placed a real order. Synthetic receipts and replacements are only in tests.

## Verification and demo

The complete Playwright suite passed **44/44 tests** with `PEI_LIVE_READS=1` on 4 November 2026 (2.9 minutes). This includes the live public-account Risk Lab browser flow; transaction/replacement tests use explicitly synthetic fixtures. The production build, final TypeScript checks (including tests) and lint all passed. Desktop and mobile live Risk Lab screenshots were visually inspected, and the existing development server returned HTTP 200 at `http://127.0.0.1:5173/`.

The suite covers independent expected long/short multi-market totals, negative/zero equity, funding/margin rounding, missing prices, baseline mismatches, refresh invalidation, malformed shock recovery, sanitized exports, duplicate events, delayed/caught-up indexers, unknown originals, nonce mismatch, repricing, wallet cancellation, different-call replacement, live account reads and mobile layout.

To review Part 6, open an existing local attempt in Execution Inspector, review the timeline and indexer distinction, and download JSON/Markdown. An empty journal is truthful until an order is attempted. To review Part 7 without a wallet, enter a public account in Risk Lab, freeze the snapshot, compare three presets, override one market and export the scenario. Refreshing live account data does not silently replace the frozen scenario.

Pending acceptance: the user's funded testnet wallet must execute the small real-order/cancellation run in Part 5 before Part 6 can demonstrate its real signed lifecycle. Do not claim bounty execution evidence until actual hashes and residual exposure exist. Parts 8–10 remain separate work; no public deployment or submission was performed.
