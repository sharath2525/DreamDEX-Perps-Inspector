# Historical acceptance plan — November 5

For the implemented interface, use the [November 6 testing reference](ACCOUNT_UX_TESTING_REFERENCE.md).

Date: 2026-11-05. No scenario is pre-marked PASS.

**Section A works with the current UI. Section B describes acceptance tests for the proposed improvements; those controls are not implemented yet.**

## Test setup

- Network: Somnia testnet, chain ID `50383` (SDK name Hideki; dreamDEX app region Tokyo).
- Signing wallet / gas payer: `0x9fb5B47901c9aD427b1eA9bb96c182eDD0EEAFc5`.
- Trading account / receiving owner: `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6`.
- A prior live read found a 0.005 BTC short. Compare fresh data: the position may change after that observation.
- Never paste a seed phrase or private key. Read-only tests below need no wallet signature.

## Section A — checks you can run now

### A1 — Show the funded account and existing position

1. Open **Positions**.
2. Find **Account to inspect** (scroll to the account access form if needed).
3. Paste `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6`.
4. Click **Inspect address**.
5. Wait for the snapshot to finish loading. Record its block number.
6. Read **Unlocked / locked**, **Equity**, and **Non-withdrawable voucher floor** separately.
7. Scroll to **Current positions**. Record BTC direction and size.
8. Scroll to **Pending orders**. Record the count separately from positions.

**Expected:** the inspected address ends `0BC6`. At the earlier verified block it had 1,000 USDso unlocked, one 0.005 BTC short, and no pending orders. Fresh equity/PnL may differ. Gas is not perps collateral. An unfilled order is not a position.

**Send:** screenshot showing selected account/block plus the Current positions table; exact error text if any.

**Current limitation:** public inspection clears the application's signing session. Use this sequence for read-only checks; do not interpret it as execution readiness.

### A2 — Check Overview's balance selection

1. Finish A1 successfully.
2. Open **Overview** without reconnecting the wallet.
3. Confirm the inspected address still ends `0BC6`.
4. Refresh and record the account equity and block.
5. Compare with Positions, allowing for different observation blocks and changing marks.

**Expected:** Overview now reads the funded account. Its existing position-summary placeholder is a confirmed UI limitation; this test does not require that placeholder to contain full rows yet.

**Send:** Overview screenshot with the address, block, and metrics. If it changes back to `AFc5`, record the exact navigation/reconnection steps.

### A3 — Run a 0% Risk Lab baseline

1. Open **Risk Lab** after A1.
2. Confirm the account ends `0BC6`. If necessary paste the full trading address into **Account to analyze**, then click **Inspect risk account**.
3. Wait until the snapshot finishes loading.
4. Click **Freeze snapshot & analyze**.
5. Select **0%**.
6. Wait for calculation to finish.
7. Read the reconciliation message and BTC position row.
8. Download the risk evidence using the available evidence download control.

**Expected:** baseline and 0% scenario match. A complete valid baseline says **Baseline reconciled exactly with on-chain health**. If the message says incomplete/mismatched, report it rather than interpreting withheld totals as zero.

**Send:** reconciliation message, frozen block, selected owner, screenshot, and exported evidence.

### A4 — Test price shocks without placing a trade

1. Keep the same frozen snapshot from A3.
2. Leave per-market override fields blank.
3. Select **+10%** and wait for completion.
4. Record BTC price PnL and scenario equity.
5. Select **-10%** and wait for completion.
6. Record the same values.
7. Select **0%** again.

**Expected:** for the observed lone BTC short, +10% worsens price PnL and -10% improves it. Returning to 0% restores the baseline. No wallet request, transaction, order, or actual position change occurs. These scenarios hold other modeled inputs fixed.

**Send:** one screenshot/export per shock with the same frozen block. A per-market override can replace the uniform shock; include its value if used.

### A5 — Check validation and retained results

1. Start with the valid frozen calculation from A3.
2. Enter non-numeric text in **Uniform price shock · %**.
3. Check the validation message and evidence export availability.
4. Restore `0` and wait for a valid calculation.

**Expected:** invalid input is rejected; retained old values are labeled as old, and export is disabled until the current result is valid. No signing occurs.

**Send:** exact validation message and screenshot if stale values look current or can be exported as the new result.

## Section B — run after the proposed UX changes are implemented

### B1 — Connect and select the trading account once

1. Connect the browser wallet ending `AFc5` on chain 50383.
2. Wait for account discovery to finish.
3. If no linked account is discoverable, enter the trading address ending `0BC6` once.
4. Select it as the active trading account and run the permission check.
5. Read the account strip.

**Expected:** signer `AFc5`, trading account `0BC6`, gas and margin separately labeled. Discovery failure has a clear fallback. No transaction on connect. Any execution-ready label is supported by current operation-specific checks.

**Send:** discovery outcome, selected addresses, capability status.

### B2 — Keep the account across navigation and reload

1. Complete B1.
2. Visit Overview → Positions → Risk Lab → Account operations → History.
3. Check the trading account on every page.
4. Reload the browser.
5. Reconnect if the wallet session requires it.

**Expected:** the remembered selection remains `0BC6`; the application rechecks readiness. Reload never signs, retries a write, or treats saved data as authorization.

**Send:** first page where selection differs and whether reload/reconnect occurred.

### B3 — Wrong network and wallet changes

1. Complete B1, but do not submit an order.
2. Change the wallet to a different network.
3. Inspect the readiness message and write controls.
4. Return to chain 50383.
5. Change the connected wallet account, then switch back.

**Expected:** exact wrong-network/account-change reasons, invalidated reviews, no write on the wrong chain, and fresh permission checks before execution. Previous account data cannot appear under the new account label.

**Send:** screenshots of each blocked state. No transaction hash should exist.

### B4 — Display the existing position everywhere

1. Select the funded account.
2. Refresh Positions and record the observed block and BTC row.
3. Open Overview and inspect its position rows.
4. Open Risk Lab and inspect its automatically prepared baseline.

**Expected:** all three pages identify the same account and position. Different live marks must show their own timestamps. Risk calculations use one frozen snapshot. Resting orders have their own section.

**Send:** each page's account, block, size, and direction. Do not require exact equity equality across different blocks.

### B5 — Keep read-only inspection and manual features

1. With the wallet connected, open manual public-address inspection.
2. Inspect a different public address you control.
3. Read the viewing-mode label.
4. Try to proceed to an execution review for that viewed address without selecting it as an authorized trading account.
5. Return explicitly to the saved trading account.
6. Expand advanced controls and compare their availability with the original app.

**Expected:** provider connection remains; viewing does not grant authority; unauthorized writes are blocked. Manual address inputs, order controls, risk overrides, diagnostics, and exports remain available where applicable.

**Send:** viewed account, active trading account, readiness reason, and any missing manual control.

### B6 — Check a valid order without signing

1. Complete B1 and confirm permissions for BTC.
2. Choose the supported operator **post-only** placement route.
3. Read current tick size, lot size, minimum constraints, and best bid/ask.
4. Enter the smallest quantity satisfying the current rules and the agreed test size.
5. Enter a tick-aligned non-crossing limit price: a bid below the current best ask, or an ask above the current best bid. Recheck because the book can move.
6. Enter a valid expiry and gas budget based on the fresh estimate.
7. Run the no-signature check.
8. Inspect owner, signer, market, side, quantity, price, gas, permissions, and simulation result.
9. Edit one input and check whether the review becomes invalid.

**Expected:** check itself does not open a signing request. Editing invalidates it. Do not invent a fixed BTC price or quantity from an old screenshot.

**Send:** exact inputs, current rules/book timestamp, check result, and any validation error. Do not proceed if the review differs from the intended order.

### B7 — Wallet rejection

1. Produce a fresh valid review as in B6.
2. Open the wallet confirmation from the reviewed operation.
3. Click **Reject** in the wallet.
4. Inspect the application's status and history.

**Expected:** user rejection is recorded without a fabricated transaction hash, fill, or position change. The app does not automatically retry.

**Send:** rejection status and local evidence. Transaction hash: `none — user rejected`.

### B8 — One real placement and evidence capture

Only run after account/read-only checks pass and you deliberately accept a small testnet order. A post-only order can still fill later.

1. Produce a new valid review as in B6.
2. Review the transaction in your wallet and confirm only the intended testnet operation.
3. Wait for the receipt; record hash and receipt status.
4. Open the execution evidence and record decoded owner, pool, order ID, and any fill events.
5. Refresh Pending orders and Current positions for the trading account.
6. Check whether the result is resting, partially filled, fully filled, rejected/reverted, or still uncertain.

**Expected:** UI state agrees with receipt/events/current state. A mined transaction alone must not be labeled a filled trade. Never submit again merely because the first request is slow; reconcile its hash first.

**Send:** exported evidence, hash, order ID, before/after position and pending-order screenshots.

### B9 — Cancel the remaining resting order

1. Use B8's actual observed resting order ID; skip if no remainder exists.
2. Select the same owner, pool, and cancellation route.
3. Run a fresh permission/simulation check.
4. Review and confirm cancellation in your wallet.
5. Record the receipt and refresh the order state.
6. Check positions separately.

**Expected:** the remaining order is removed if cancellation succeeds. Any already-filled position remains; cancellation does not close a position. If a fill raced with cancellation, evidence explains the outcome rather than claiming an impossible cancellation.

**Send:** placement and cancellation hashes, order ID, final remaining size and position. If nothing is cancellable, report SKIPPED with the observed reason.

### B10 — Recover evidence after reload and report failures

1. Save the hash from B8/B9.
2. Reload the app and restore the same trading account.
3. Open History/Execution Inspector and locate the attempt or use supported known-hash recovery.
4. Compare receipt, order identifiers, and status with the earlier export.
5. Export the final report.

**Expected:** historical attempts remain available, no duplicate write occurs, and externally observed history is distinguished from PEI-created attempts. RPC/indexer failures say unavailable/partial, not zero balances or no positions.

**Send:** before/after exports and any missing record. Do not publish a security-sensitive finding in the public feedback folder.

## Copy this report for each scenario

```text
Scenario ID:
Status: PASS / FAIL / BLOCKED / SKIPPED
Date/time + timezone:
App URL:
Signer address:
Trading / inspected account:
Chain ID and snapshot block:
1. Action I took:
2. Action I took:
Exact inputs:
Expected result:
Actual result / exact error:
Wallet prompt: none / rejected / confirmed
Transaction hash: actual hash OR none + reason
Screenshots / exported files:
Remaining orders and positions (if a write occurred):
```

Start with **A1**, then **A3**, then **A4**. Those three results isolate account selection and risk behavior without another trade. The post-fix scenarios are a reviewable specification, not a claim that the improved UX is already deployed.
