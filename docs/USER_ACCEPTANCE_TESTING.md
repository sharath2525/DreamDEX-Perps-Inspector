# Hands-on test guide — Perps Execution Inspector

Prepared 5 November 2026 IST against the current application source. These are instructions, not completed test results. The release's 62 automated tests include synthetic transaction fixtures; they do not replace your real wallet tests.

## Purpose and success criteria

PEI helps a trader check an order before signing, establish what really happened after it was sent, inspect remaining orders/exposure, and export reproducible evidence. It also offers frozen price-risk scenarios, bounded account history and read-only developer diagnostics. A useful submission demonstrates this workflow rather than only presenting screens.

An order is an instruction on the exchange. A position is exposure created by fills. A mined transaction may place a resting order without opening a position. A cancelled remainder does not undo fills or close an existing position. Post-only prevents taking liquidity at submission; it can still fill later. A successful placement receipt is not proof of a filled trade.

## Your current account setup

| Field | Value |
|---|---|
| Actor / connected browser signer | `0x9fb5B47901c9aD427b1eA9bb96c182eDD0EEAFc5` |
| Receiving owner / dreamDEX Wallet 1 | `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6` |
| Network | Official Perps Hideki testnet, chain 50383; announcement/UI region uses Tokyo |
| Verified BTC pool | `0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0`; revalidated by app reads |
| Last observed actor balance | 5 STT at block 42298938; historical observation, refresh before signing |
| Last observed owner margin | 1,000 USDso unlocked, 1,000 voucher floor, 0 withdrawable; refresh before signing |
| Last observed BTC permissions | Place/cancel/reduce true at block 42298962; rechecked before sends |
| Current route for writes | Account operations, `/positions/manage` |
| Receipt/evidence location for these writes | Account operation journal on that same page |

The actor has no trading collateral of its own. Its STT pays gas; the receiving owner's margin supports the trade. A zero wallet-token balance alongside 1,000 unlocked bank margin is expected. Do not deposit or move the voucher merely to make the token-balance field nonzero. The funding label does not independently establish Arena membership or bounty-grant category.

## Test rules and record format

Use one tab and one unresolved operation at a time. Do read-only tests first, then preflight failures, then one small placement/cancellation. Keep the same origin/browser profile for journal recovery. Never clear storage to bypass an unknown outcome. Never send a private key, seed phrase, signature, cookie or authentication header in a report.

Before a live order, explicitly choose a maximum notional, side, expiry and gas budget. The existing 0.01 STT field is a ceiling you can choose to retain, not a promise every transaction fits. Each cancellation/reduction has its own gas budget. Do not raise it silently to make a test pass. Use the smallest current grid-valid quantity within your chosen notional ceiling; if the minimum exceeds that ceiling, stop. No price or quantity from an old screenshot is a current trading recommendation.

Use **PASS / FAIL / BLOCKED / NOT RUN / INCONCLUSIVE / NOT APPLICABLE**. An expected rejection is PASS when testing that rejection. A network outage is not automatically a protocol bug. A read-only suite passing says nothing about whether a wallet transaction occurred.

Copy for each result:

```text
Test ID:
Date/time + timezone:
Browser / wallet extension:
App URL:
Wallet chain ID:
Actor / receiving owner:
Market / pool:
Exact inputs (side, decimal quantity, price, expiry, gas budget):
Steps performed:
Expected:
Actual (copy full error text):
Status:
Wallet opened? yes/no
Transaction hash: actual hash OR none (not sent/rejected)
Receipt status / order ID / actual fill evidence:
Remaining orders and positions:
Attachments: screenshot + exported JSON/Markdown if available
```

## Phase A — no signatures and no gas

### T00 — unblock the connection (do this first)

Your latest screenshot still shows a disabled Check operation button and the generic distinct-operator message. It does not prove which condition failed.

1. Open Positions using the app navigation in the browser containing your wallet extension.
2. Select the actor above in the extension. Confirm chain ID 50383; do not rely only on a network name or the app's network badge.
3. Select Disconnect, then Connect read-only. Approve account access only.
4. Capture the Connected wallet address and its network sentence. Expected: the actor above and “Wallet reports Hideki chain ID.”
5. Navigate through the app menu to Account operations. Avoid a full page reload or separately opening the URL: the signing session is held in memory.
6. Choose Operator: place post-only order, enter the receiving owner above, select BTC. Do not use Inspect address after connecting; public lookup intentionally revokes signing readiness. Reconnect after any account/network/lookup change.
7. Check operation should become available when identity, pool and storage requirements are satisfied; empty numeric inputs may then be rejected by validation.

PASS: correct identities/network and enabled preflight, no transaction. BLOCKED: still disabled. Send Positions' identity/network screenshot and the Operations screenshot; do not guess inputs to work around it. The generic disabled explanation is an application UX limitation, not a dreamDEX SDK finding.

### T01 — distinguish wallet tokens from bank margin

Before reconnecting for writes, use Positions' public lookup for the owner. Record native gas, wallet tokens, unlocked/locked margin, floor, withdrawable, health and observation block. Compare with the same owner in dreamDEX, allowing for block differences and subsequent activity. Expected at the last verified starting state: wallet USDso zero, bank margin 1,000 and withdrawable zero. Actual current values govern. Inspecting the actor instead should not display the owner's 1,000 margin. Existing positions/orders must be recorded, not assumed absent.

### T02 — market discovery and rules

Markets → search BTC → Inspect. Record Price tick, Lot size, Minimum quantity, Base/quote decimals, mark/index, resting bids/asks, funding and source timestamp/lag. Refresh once. An unavailable price must remain unavailable rather than turning into zero. Search a nonexistent symbol: expect a clear empty result. No signatures. The book uses polling, not a streaming guarantee. Do not use Compose an order for the current linked-account write test; return to Account operations.

### T03 — owner/operator permission check

Reconnect as T00, select the operator action, owner and BTC. Click Check operator permissions. Expected place/cancel/reduce true for that owner/actor/pool, with an observation block. This is a read and should not open the wallet. A false value blocks the relevant write and may mean revocation or a different market; it is not proof of an app bug.

### T04 — Developer Test Lab

Select the owner through public lookup → Run read-only diagnostics. Record every result and source; download JSON and Markdown. Expect deployment/account/history checks or explicit failures, with signing cases not run. An empty history category can be valid. Cancel a run once and verify no false completed-success report. Public lookup means reconnect before later writes. The lab's generic direct-owner manual-case links are not the correct write route for your linked account; follow this guide's Account operations cases.

### T05 — History before trading

Inspect the owner in History; choose orders, fills, funding and margin separately. Record counts and coverage. Load older records only if enabled, then filter a pool and UTC dates. An inverted date range should show an error. Download visible CSV and JSON/Markdown. Expect unique loaded records and explicit loaded-window limits, not lifetime statistics. No funding rows immediately after a trade is not itself a bug. Reconnect before writes.

## Phase B — preflight validation (no broadcast)

### T06 — invalid quantity/price

After T00/T03, keep the correct identities/pool. Try quantity 0, then a positive quantity below the live minimum, then a quantity off the live lot grid; supply a valid grid price when isolating quantity errors. Separately try price 0 or a price off the live tick. Click Check operation — no signature. Expected validation error and no wallet prompt/hash. Change one input at a time and record it. For off-grid tests derive the invalid value from current market rules; do not assume all tokens have 18 decimals.

### T07 — gas and expiry limits

With otherwise valid small terms, set gas budget 0 and run the check: expect a budget rejection without signing if earlier validation passes. Separately use expiry 0 or 1441 minutes: expect range rejection. Restore the chosen gas budget and a short expiry afterward. A rejection for an earlier reason means the intended branch was not reached; mark that scenario INCONCLUSIVE rather than claiming its check passed.

### T08 — valid preflight, changed terms and expiry

Choose current grid-valid terms within your approved notional ceiling. For a post-only buy use a price below the current best ask; for a post-only sell use a price above the current best bid. Stay within live protocol price constraints; no invented fixed price is provided. Avoid crossing prices. Price movement can still invalidate a fresh simulation.

Run Check operation — no signature. Expected: review with correct owner/actor, decoded terms/exact unsigned call, native value and estimated maximum gas. There should be no wallet transaction request. Change quantity/price: prior confirmation must become unusable. Recheck, then let more than 30 seconds pass: review must expire. Recheck again only when ready. Record any margin, voucher, priceability or permission restriction verbatim; those may be expected protocol gates.

### T09 — wallet rejection

After a valid fresh review, review the exact operation and check its confirmation box. Select Confirm operation & open wallet, then choose Reject in the wallet. Expected: rejected attempt, no returned transaction hash and no automatic retry. If a hash exists, treat it as potentially sent and inspect it. Do not label a rejected prompt as a reverted transaction.

## Phase C — real testnet lifecycle (user signs each operation)

### T10 — place one small resting order through PEI

Prerequisites: T00/T03 passed; current margin and STT; agreed small notional and separate cancellation gas budget; no unresolved attempt. Do not trade through the official app and then call it a PEI-submitted order.

1. Account operations → Operator: place post-only order → owner → BTC.
2. Use the smallest allowed lot-aligned quantity within your chosen notional cap. Record decimal base quantity, limit price and quantity × price (notional, not margin). If also testing reduction, you need a larger initial remainder; skip reduction rather than increasing size without a new decision.
3. Choose side deliberately, a non-crossing grid price and a short expiry (for example 5 minutes). Either side can create exposure if later filled. Keep the selected gas ceiling.
4. Run Check operation. Verify actor/owner, chain, BTC pool, quantity, price, expiry and native/gas amount; inspect Exact unsigned call if needed. A preflight pass is not execution proof.
5. Confirm in PEI, then approve exactly that transaction in the extension yourself. Do not approve a different chain, recipient or unexpected token approval.
6. Copy the returned hash immediately. Do not resend if the UI is slow.
7. In Account operation journal click Verify actual receipt. Record hash, canonical block/status, order ID, decoded fill count and actual gas cost. Download JSON and Markdown.

PASS for placement: canonical matching successful transaction and actual decoded order/resting state. A successful receipt with missing business evidence is INCONCLUSIVE for that business outcome. Zero fill events on a post-only placement receipt is expected and is not a filled-trade claim. A later maker fill may be in a later transaction: inspect owner history/positions rather than expecting the placement receipt to change.

### T11 — cancel its actual resting remainder

Verify the order still belongs to the owner and has a nonzero remainder. In Account operations choose Operator: cancel resting order, same owner/BTC and the exact decoded order ID. Run check, review, then explicitly sign. Verify the cancellation receipt in the operation journal and export it. Inspect owner pending orders and positions afterward. Expected: cancelled remainder is no longer live; any previously filled exposure remains. If already filled/cancelled or expired, record the actual state; do not force a second cancellation. Expiry can leave an identifier on the book until cleanup, so do not confuse an expired row with a live order.

### T12 — optional reduction of an unfilled remainder

Only when the original remainder is large enough for a smaller valid quantity at or above the live minimum. Choose Operator: reduce resting remainder, exact order ID, and the new TOTAL remaining quantity, not the amount to subtract. The new remainder must be strictly smaller and lot-aligned. Check, review, sign, verify receipt, then check the on-chain remainder. Cancel any remaining live order separately. This does not reduce or close a filled position. Skip if the smallest test order cannot be reduced validly.

### T13 — actual fill and position evidence (conditional)

If the resting order fills naturally, record the actual fill transaction/history and matching owner position change. Distinguish partial and complete fills. Compare owner, market, side, quantity and prices in raw units. Do not repeatedly submit orders or use a second wallet to self-match just to manufacture evidence. Post-only mode cannot guarantee a fill. If there is no fill, record NOT RUN for filled-position proof; placement/cancellation evidence can still be real.

If a position exists, inspect/manage it in dreamDEX under the receiving owner as needed. Any separate position-close action needs its own review; closing in dreamDEX is cleanup, not PEI execution evidence. PEI's current delegated interface does not offer an ordinary no-flip reduce-only close or IOC route. Do not send an arbitrary opposite order and assume it safely closes exposure.

### T14 — refresh and recovery

After copying a known hash, reload the same app origin/browser. The journal should survive, although wallet session requires reconnecting. Verify the known receipt again. If a send outcome is already unknown, do not clear storage or repeat it: retrieve the real wallet activity hash and use the journal's hash field to verify it. An unrelated hash must not be accepted. Do not deliberately interrupt a live send, submit wallet replacements or disable network mid-signature just to create this case; unknown/replacement paths are covered by synthetic tests. The operator journal does not have the full direct-order inspector's replacement workflow.

## Phase D — post-trade reads and UI behavior

### T15 — history reconciliation

After T10/T11 inspect the RECEIVING OWNER in History. Restart from newest. Find the actual order ID/pool/hash, with indexer freshness noted. Placement's hash is not necessarily cancellation's hash. Filled rows appear only if real fills were indexed. Compare loaded rows and exported files; do not infer lifetime completeness. If absent, report the receipt block and processed indexer block; preserve chain receipt proof. An indexer processing past a block does not alone prove each row exists.

### T16 — frozen Risk Lab

Inspect owner → Freeze snapshot & analyze. Capture baseline block, equity, maintenance headroom, coverage and positions. Start with 0%, then -10% and +10%, and export scenarios. For a single long, higher price increases price PnL; for a short, lower price does. Whole-portfolio equity depends on all positions. A flat account can show no change under price shocks: PASS, not a broken simulator. Frozen baseline/time must not silently change with market polling. Choose Use latest snapshot & reset scenarios to update deliberately. Missing price/baseline mismatch should withhold aggregates. No signature should occur. This is not an exact liquidation predictor and excludes future fills/funding/fees.

### T17 — identity and session invalidation

Only after all live orders are resolved: prepare an unsigned review, then change wallet account or network. Expected: old review cannot sign. Return to the correct actor/network and reconnect. Public lookup also invalidates signing by design. Sending with the wrong identity is FAIL; blocking it with a vague explanation is a PEI UX issue, not a protocol defect.

### T18 — presentation and exports

Check desktop and narrow/mobile layout, navigation, theme, readable long addresses/errors and keyboard focus. Inspect downloaded JSON/Markdown for exact hashes/raw amounts and provenance; no key/signature/session data should be included. CSV uses raw units as labelled, not human-scaled prices. Spreadsheet software may round big integers; inspect the raw CSV or import those columns as text. Test read failure using offline mode only when no wallet send or unresolved transaction is in progress; expect unavailable/stale labels rather than fabricated zero values, then explicit recovery after reconnecting.

## Separate-account and developer-only tests

These are not required on your current linked actor. Record NOT APPLICABLE instead of forcing them.

| ID | Feature | Correct prerequisite and test |
|---|---|---|
| X01 | Direct Trade and Execution Inspector | A directly funded EOA that is both owner and signer. Test supported limit/IOC/FOK/post-only paths, direct cancellation and rich execution exports there. Your linked actor's zero margin is not the smart account's margin. |
| X02 | Exact approval/deposit/withdrawal | Direct-owner EOA with actual wallet collateral. Separate exact bank approval, deposit, refresh; withdraw only current withdrawable amount. Existing nonzero allowance requires separate reset. Do not treat voucher credit as transferable tokens. |
| X03 | Voucher claim | Eligible direct owner, confirmed distributor/market rules, no unsupported linked funding. Already-claimed/ineligible rejection can be expected. No need to claim repeatedly or move Arena/bounty funds. |
| X04 | Owner native TP/SL | Direct owner with a compatible open position, separate registry permission and payment. Check current per-leg payment; create within position size, record IDs, check liveness, cancel, then claim only actual refund credit. Linked actor cannot arm owner-native stops. Cancelling one paired leg leaves its sibling. |
| X05 | Permission revocation | No unresolved sends/resting orders. User revokes via the owner app; PEI refresh should show absent permission and block preflight. Revocation does not cancel orders. Relink only if desired. |
| X06 | Ambiguous broadcast, duplicate logs, canonical replacement, storage failure | Existing controlled automated tests. Developer reproduces with fixtures; do not manufacture failures with live funds. |

## Submission requirements and how tests map to them

Per supplied bounty terms, the MVP must place real Perps orders on the accepted testnet, have a GitHub repo, a README explaining what/who/how, and links to 2–3 real X posts tagging @DreamDEXSomnia. Evaluation considers useful product scope, execution quality, transaction evidence, demo/repository and accurate communication. Somnia primitives are a bonus, not a reason to add unrelated code. Placement evidence must show your application actually sent it; filled-trade claims additionally need genuine fills. A short demo and actual cancellation/exposure evidence strengthen the story.

Current blockers: official current window/late-entry permission and whitelist unconfirmed; GitHub publication not completed; deployed preview owner-private; posts remain drafts; PEI-signed trading evidence not yet supplied. Supplied November 1 deadline has passed; official page still returned HTTP 405 on the check. Do not infer an extension or prize eligibility. Confirm the organizer's accepted chain naming (guide says Hideki 50383, announcement says Tokyo).

Feedback track: one file per reproducible issue under feedback/ with severity, area, steps, expected, actual, evidence and environment. Our two reports are a normal documentation inconsistency and normal SDK convenience request, both unsent/unaccepted. Test failures in PEI are fixed in PEI first. Only independent SDK/API/docs behavior becomes a candidate organizer report. Security findings stay out of the public repo. First valid reports only, duplicates rejected, payment subject to remaining budget; no guaranteed payout.

Supplied awards: MVP three $500 awards, $300 at announcement plus $200 conditional on eligible mainnet execution within 30 days after launch. Feedback $40 accepted critical/major or $15 other accepted reports until the track budget is exhausted. This testnet build does not authorize mainnet trading.

Official references: [developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet), [Link a Bot](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot), [bounty page](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail). Current program acceptance is not verified.

## What to send first

Send T00 identity/network evidence, T01 owner balances/positions, T02 current BTC tick/lot/minimum/book and T03 permissions. Then choose a small maximum notional and gas ceiling before T10. Do not run every write in one session merely to tick boxes. Send each live hash/export after the action so the next action uses verified state.
