# Perps Execution Inspector: step-by-step acceptance tests

These same numbered cases are in **Developer Test Lab → Guided scenarios**. Your previous U01–U12 notes remain saved. New cases start NOT RUN; software tests never mark your personal test results PASS.

## Start here: no new trade needed

1. Refresh the deployed app to load the update. Keep browser storage: it holds your journals and notes.
2. Connect your existing signing wallet. For your reported setup it ends in **AFc5**; the trading account holding perps margin ends in **0BC6**. Compare full addresses in the wallet/account panel.
3. Confirm chain **50383**. A connected signer does not automatically have every permission on every market.
4. Open Positions and record the snapshot block, position direction/size, equity and open orders.
5. Complete **U04, U05, U15 and U16 first** to retest Risk Lab against your existing position. No new order or signature is needed.
6. Continue through U01–U24. Use BLOCKED for a missing prerequisite, SKIPPED for an optional operation you deliberately did not exercise, and FAIL only for an observed wrong result.
7. In each case, record the exact inputs, expected vs actual, block/hash (or “none, not broadcast”), screenshot names and category. Click Capture environment, then export the test results.

## Understand the Risk Lab result

- **Baseline reconciled exactly:** SDK totals match all four chain-health values at the frozen block.
- **Scenario estimate · minor baseline discrepancy:** complete inputs and exact margin requirements, but SDK equity is higher within the specific negative fractional-PnL rounding envelope. The chain supplies baseline equity; the scenario adds the SDK price-change delta. The original difference and adjustment remain in the export. This does not prove the deployed rounding rule.
- **Portfolio totals withheld:** missing inputs or an unexplained mismatch. Refresh and reset; export if it persists. Blanks do not mean zero exposure.
- **Focused buttons disabled:** choose a position first. A single position is now preselected automatically. An account with no positions has nothing to focus.
- **No change at 0%:** expected. Baseline and scenario should be identical.
- **Only a pending order:** a risk scenario does not simulate its future fill, so it creates no hypothetical position.
- **Long vs short:** inspect price PnL per row. A price increase helps a long and hurts a short; portfolio equity can move differently when positions offset each other.
- **Refresh vs reset:** Refresh reads newer data; Use latest snapshot & reset scenarios deliberately replaces the frozen baseline and clears edits.
- **Displayed decimals:** long fractions are shortened with an ellipsis. Hover/accessibility text and JSON retain exact values. No floating-point conversion enters the model.

## Test cases

For actions involving a wallet, confirm only your intended testnet call after reviewing it. Reading, checking, inspecting, exporting and applying price shocks never require signing. Do not submit an order just to make a case show PASS.

## U01 — Select the funded account

Page: `/positions`. Read/check steps first; any optional write still needs separate confirmation.

1. Connect your signing wallet above and wait for account discovery.
2. Check the automatically selected or restored trading account. If selection is ambiguous, expand Set up or change account and choose a candidate; manual entry remains a fallback.
3. Compare both full addresses: signing wallet and funded trading account.
4. Expand linked permissions and choose your market.

**Expected:** Signer pays gas; trading account holds margin and positions. Discovery and saved addresses do not grant permission.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U02 — Navigation and reload

Page: `/`. Read/check steps first; any optional write still needs separate confirmation.

1. Complete U01.
2. Visit Overview, Positions, Risk Lab, Trade, Account operations and History.
3. Check the selected account on every page.
4. Reload, then reconnect the same wallet.

**Expected:** The saved selection returns. Reload starts read-only until connection. No automatic signing or resend.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U03 — Balances, positions and orders

Page: `/positions`. Read/check steps first; any optional write still needs separate confirmation.

1. Select your funded account and refresh Positions.
2. Record block, unlocked collateral, equity and voucher floor separately.
3. Record direction and size from Current positions.
4. Record Pending orders separately and compare Overview at its block.

**Expected:** Actual position rows appear in both views. Gas is not collateral. No pending orders does not mean no positions.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U04 — Risk baseline and shocks

Page: `/positions/risk`. Read/check steps first; any optional write still needs separate confirmation.

1. Open Risk Lab. Read whether the baseline matches exactly, has a bounded estimate, or is blocked.
2. Select 0% and compare baseline with scenario. A bounded estimate must disclose its adjustment.
3. Leave overrides blank. Select +10%, then -10%, then 0%.
4. Download evidence at the same frozen block.

**Expected:** For a lone short, higher prices worsen price PnL and lower prices improve it. Long exposure reverses this. Estimates never claim exact reconciliation. No orders are placed.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U05 — Invalid risk input and reset

Page: `/positions/risk`. Read/check steps first; any optional write still needs separate confirmation.

1. Enter non-numeric text in Uniform price shock.
2. Check validation and disabled export.
3. Restore 0 and wait for the result.
4. Refresh the snapshot, then click Use latest snapshot & reset scenarios.

**Expected:** Invalid edits cannot export stale values as current. Only explicit reset replaces the frozen baseline.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U06 — Public lookup and safe return

Page: `/positions`. Read/check steps first; any optional write still needs separate confirmation.

1. Connect and select a trading account.
2. Use Account to inspect for a different public address.
3. Open Trade and read why execution is blocked.
4. Click Return to trading account.

**Expected:** Wallet stays connected. Inspection is read-only. Returning invalidates old reviews and restores the trading account.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U07 — Network and signer changes

Page: `/trade`. Read/check steps first; any optional write still needs separate confirmation.

1. Prepare a checked order without signing.
2. Change wallet network and read the blocked reason.
3. Return to 50383 and resume the trading account.
4. Change wallet account and inspect the selection and old review.

**Expected:** Old reviews cannot be signed. Exact network/account reasons appear. No automatic transactions.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U08 — Check an order without signing

Page: `/trade`. Read/check steps first; any optional write still needs separate confirmation.

1. Select the correct account and market.
2. Read current tick, lot and minimum rules. Enter a small valid quantity.
3. Inspect current book. For post-only, choose a tick-aligned non-crossing limit; set expiry and gas budget.
4. Run the no-signature check and review the exact account, call and costs.
5. Edit quantity and confirm the review becomes invalid.

**Expected:** Checks do not sign. Invalid precision, permission, margin and gas produce actionable errors. Simulation is not fill proof.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U09 — Reject a wallet request

Page: `/trade`. **Write-capable case: a deliberate wallet confirmation may be required.**

1. Create a fresh valid U08 review.
2. Authorize the displayed operation and open the wallet.
3. Reject in the wallet.
4. Inspect local activity.

**Expected:** Rejected status; no fabricated hash or on-chain failure. No automatic retry.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U10 — One real testnet order

Page: `/trade`. **Write-capable case: a deliberate wallet confirmation may be required.**

1. Create a fresh valid U08 review and deliberately accept the test size.
2. Review the exact wallet transaction and confirm.
3. Save the returned hash; do not resend an uncertain outcome.
4. Verify the receipt in Execution Inspector or the linked operation journal.
5. Record order ID and fills; refresh orders and positions.

**Expected:** Submitted, mined, resting and filled remain distinct. Post-only can fill later. Evidence agrees with actual chain state.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U11 — Cancel a resting remainder

Page: `/positions/manage`. **Write-capable case: a deliberate wallet confirmation may be required.**

1. Find an actual remaining order; skip if none exists.
2. Use operator cancellation for a linked account or direct cancellation in its execution record.
3. Select the actual pool/order ID and run a fresh check.
4. Review and confirm cancellation, then verify its receipt.
5. Refresh orders and positions separately.

**Expected:** Cancellation removes the remainder, not an already-filled position. Report fill/cancel races from evidence.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U12 — Recovery, history and diagnostics

Page: `/history`. Read/check steps first; any optional write still needs separate confirmation.

1. Save hashes and export execution evidence.
2. Reload and select the same account.
3. Compare local activity with indexed history; recover a known hash if necessary.
4. Run the read-only suite in Developer Test Lab.
5. Record errors, blocks and screenshots in your report.

**Expected:** Journals survive. External trades are not labeled PEI attempts. RPC/indexer failures stay explicit.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U13 — Guided execution journey

Page: `/guide`. Read/check steps first; any optional write still needs separate confirmation.

1. Confirm the displayed signer and trading account.
2. Open Build and check an order, or Set up trading account if disconnected.
3. Return here and open Explain an existing transaction.
4. Inspect a real supported hash, follow its Positions/Risk links, then return to the same case.
5. Export the case; check its hash and observed outcome.

**Expected:** The guide connects existing tools into one evidence trail. Selecting an account never means an order passed preflight or filled.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U14 — Markets and live constraints

Page: `/markets`. Read/check steps first; any optional write still needs separate confirmation.

1. Refresh Markets and record its block/time.
2. Choose a market with Inspect.
3. Read mark, index, tick, lot, minimum quantity, funding and book sides.
4. Open its Trade action and check the selected pool.
5. Repeat for another market; check that data and units change together.

**Expected:** Market data is sourced, unavailable values stay explicit, and constraints belong to the selected market. Mark price is not a guaranteed fill price.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U15 — Focused risk and overrides

Page: `/positions/risk`. Read/check steps first; any optional write still needs separate confirmation.

1. Use latest snapshot and reset.
2. Choose a position in Focus one market; a single position is preselected.
3. Click Focused +5%, then Focused -5%.
4. Verify other markets remain at 0% and the baseline block stays unchanged.
5. Type a per-market override, then click a uniform preset to clear overrides.

**Expected:** Focused and uniform controls have different scope. Blank override inherits uniform. No wallet request or trade occurs.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U16 — Risk bounds and unavailable data

Page: `/positions/risk`. Read/check steps first; any optional write still needs separate confirmation.

1. Enter -95, then 300: these are valid model bounds.
2. Enter -96, 301 and 1.001 separately: each should show validation.
3. Restore 0. If a real read fails, record the warning and do not label it zero risk.
4. For a persistent baseline mismatch, export its raw comparison.

**Expected:** Incomplete or unexplained mismatches withhold totals. A minor compatible discrepancy is labeled an estimate with the original difference retained.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U17 — Owner funds and voucher controls

Page: `/positions/manage`. Read/check steps first; any optional write still needs separate confirmation.

1. Read signer and receiving owner before selecting any operation.
2. With a different linked operator, select Deposit or Withdraw and verify owner-only blocking.
3. Inspect balance, allowance, unlocked margin, withdrawable and floor separately.
4. Only with a separately funded owner-signing test account: test exact allowance, deposit, eligible withdrawal, then reset allowance, one review/signature at a time.
5. For voucher claims, check eligibility first; skip if already claimed or ineligible.

**Expected:** Trading permission does not authorize treasury operations. Voucher floor is not withdrawable cash. Do not move bounty funds into an Arena account.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U18 — Owner stop orders

Page: `/positions/manage`. **Write-capable case: a deliberate wallet confirmation may be required.**

1. Use a controlled owner-signing test account; skip if you only have an operator.
2. Select Create owner TP/SL and an actual position market.
3. Check registry payment & permission and inspect trigger, side, quantity and expiry.
4. Grant only if required, then separately review and create the stop.
5. Verify actual stop IDs; cancel one live stop and claim a refund only if the registry reports one.

**Expected:** A registered stop is not a guaranteed executed close. Gas/payment, permission, live state and refund availability are checked separately.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U19 — Operator permissions by market

Page: `/positions/manage`. Read/check steps first; any optional write still needs separate confirmation.

1. Inspect the linked signer permissions for one market, then another.
2. Check place, cancel and reduce separately.
3. On a disposable owner-signing test setup only, grant one pool then revoke it with separate confirmations.
4. Reconnect the operator and rerun the relevant check.
5. Do not revoke the only working permission on your active demo account merely to complete this case.

**Expected:** An indexed link is not current write permission. Revocation blocks the relevant operation even if the account remains discoverable.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U20 — Reduce a resting order

Page: `/positions/manage`. **Write-capable case: a deliberate wallet confirmation may be required.**

1. Choose a real open order and record its remaining quantity.
2. Select Operator: reduce resting remainder for a linked operator.
3. Enter a valid smaller remaining quantity aligned to the market lot.
4. Run a new check, inspect calldata, and confirm only the intended reduction.
5. Verify receipt and refresh order remainder and positions separately.

**Expected:** The resting order shrinks. This action does not reduce an already-filled position; fill races may change the observed remainder.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U21 — History filters and export

Page: `/history`. Read/check steps first; any optional write still needs separate confirmation.

1. Choose orders, fills, funding, then margin.
2. Load an older page when available and check the loaded-record count.
3. Filter by an actual pool and UTC date range.
4. Try From later than Through, then correct it.
5. Download visible CSV and JSON; compare rows and hashes with the screen.

**Expected:** Filters cover loaded pages only. Empty results are not proof of no lifetime activity. Errors and indexer lag remain visible.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U22 — Diagnostics and test-note backup

Page: `/test-lab`. Read/check steps first; any optional write still needs separate confirmation.

1. Run read-only diagnostics for the selected account; no wallet should open.
2. Capture the environment and record one observed result with evidence.
3. Export your manual-test backup, reload, and confirm notes remain.
4. Import the backup and resolve any conflicts deliberately.
5. Try Cancel run on a new diagnostic run; no success should be inferred.

**Expected:** Notes stay scoped to the account and signer. Existing U01–U12 results survive this update. A failing check is classified before being called an upstream bug.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U23 — Settings and responsive navigation

Page: `/settings`. Read/check steps first; any optional write still needs separate confirmation.

1. Read configured chain, SDK version and storage/privacy disclosures.
2. Visit every sidebar page at desktop width and then a narrow phone-sized width.
3. Scroll long pages and tables, then navigate to a different page.
4. Use the wallet button and keyboard navigation; verify controls remain reachable.
5. Reload a nested page directly.

**Expected:** No overlapping cards or page-wide horizontal overflow. Wide data tables scroll inside their container. Navigation and theme changes preserve account selection and notes.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## U24 — Receipt meaning and safe recovery

Page: `/executions`. Read/check steps first; any optional write still needs separate confirmation.

1. Inspect an actual supported placement, cancellation or reduction hash.
2. Compare receipt status, matched fill events, order ID and current remainder.
3. Try an invalid hash: expect validation; never invent a hash for success.
4. If you have a real replacement hash, verify its sender and nonce relationship.
5. Export observed facts and unknowns; return through Positions/Risk to the same hash.

**Expected:** Mined success is separate from filled/resting/rejected behavior. Unrelated hashes and unsupported calls cannot become successful PEI executions. Never resend merely because the outcome is unknown.

**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.

## Exact order-testing sequence

### A. Unsigned checks (do these first)
1. Open Trade and select the account and market you intend to use.
2. Read that market's current minimum quantity, lot size and price tick. Do not copy BTC units into another market.
3. Enter zero, then a quantity below the minimum, then a quantity off the lot grid. Run the check each time. Expect rejection before a wallet request.
4. Restore a valid quantity you deliberately accept. Test a price off the tick grid. Expect rejection before signing.
5. Restore valid inputs and run the no-signature check. Read account, actor, side, quantity, price, expiry, permissions, margin and gas.
6. Change one field. The previous prepared review must no longer authorize the edited order.
7. If liquidity, gas, voucher restrictions, stale prices or permissions block the check, record the actual reason. Do not bypass it to obtain a screenshot.

### B. First real order (only when ready)
1. Use a permitted market and a deliberately accepted test size meeting its current constraints. No fixed size or market price is prescribed here.
2. A post-only order must not cross the current opposite book. Use the current live book and a tick-aligned limit; the book may change before mining.
3. Recheck immediately, review the displayed call, and confirm in your wallet only if every field matches your intent.
4. Record the returned hash immediately. If the UI times out, inspect/recover that hash; do not blindly resend.
5. Verify the receipt and decode actual order/fill events. Record whether it rested, filled, partially filled, or was rejected. A mined success alone is insufficient.
6. Refresh Positions and open orders. A resting order is not an open position; a position can remain after cancelling the rest.
7. Cancel a remaining order only if that is your intention, with a separate fresh check and signature. Confirm the remaining exposure afterwards.

### C. Supported direct order modes
1. With an owner-signing account, exercise Limit, post-only, bounded IOC and FOK separately only if each is available in the composer.
2. Keep price, quantity and gas explicit for each test; read live liquidity first.
3. Limit may rest or execute. Post-only must not immediately take liquidity. IOC may fill partially and leave no resting remainder. FOK requires the full fill condition; insufficient liquidity is not a bug by itself.
4. For each outcome, inspect actual receipt events and quantities. Do not force all modes to fill or count a simulation as a real fill.
5. A linked operator currently uses the supported post-only placement path under Account operations. Do not infer that every direct order mode is available through delegation.

### D. Reducing exposure vs reducing an order
1. “Reduce resting remainder” changes the unfilled order quantity. It does not close a filled position.
2. To test a position reduction/close, use the supported trade/reducing controls available for your account and inspect fresh reducing capacity, side, quantity and permissions. If your operator path cannot perform the desired close, mark that test BLOCKED instead of guessing another call.
3. Verify the filled change in position size. Merely submitting an opposite resting order does not prove a close.

## Advanced Account operations: test each action separately

These cases are optional for a trader who only needs the main execution/inspection flow. Your linked operator cannot act as the owner merely because the wallet is connected. Use a separate controlled owner-signing test setup for owner actions; never move a separate bounty grant into an Arena account.

| Action | Steps | Expected evidence |
| --- | --- | --- |
| Set exact bank allowance | Read token balance and current allowance → enter the intended exact amount → check → review → sign → verify receipt → refresh | Allowance equals intended amount; no margin deposit is claimed from approval alone |
| Reset allowance | Select reset → check owner and bank → review/sign → refresh | Allowance is zero; deposited collateral is not withdrawn |
| Deposit | Ensure spendable wallet USDso and allowance → enter amount → check → review/sign → verify → refresh | Wallet token and bank collateral change consistently, subject to other account activity |
| Withdraw | Read withdrawable amount and floor → choose permitted amount → check → review/sign → verify → refresh | Withdrawal respects actual eligibility; voucher floor is not withdrawable |
| Claim voucher | Check eligibility → skip if already claimed/ineligible → review/sign only if eligible → refresh | Claimed status and credited margin/floor reflect actual contract state |
| Grant/revoke trading operator | Owner selects actual pool and intended operator → inspect scope → check → review/sign → reread place/cancel/reduce permissions | Only actual granted selectors/pools are claimed; indexed history does not override current revocation |
| Operator post-only place | Select receiving owner and market → choose valid non-crossing price/size → check → review/sign → inspect order/fills | Signer and receiving owner remain distinct in the evidence |
| Operator cancel | Select actual resting order → check → review/sign → inspect receipt → refresh remainder | Remaining order cancelled or a documented fill/cancel race; position unchanged unless fills occurred |
| Operator reduce | Select actual remaining order → choose valid smaller remainder → check → review/sign → refresh | Smaller remainder; no claim of closing a filled position |
| Grant/revoke stop registry | Owner selects pool → check discovered registry and scope → review/sign → reread permission | Exact registry authorization is reflected; revocation is not presented as canceling an existing position |
| Create owner TP/SL | Use eligible owner/position → check registry/payment → set side, quantity, trigger(s), expiry → review each leg/payment → sign → verify IDs | Actual registered stop IDs, not a guaranteed future close |
| Cancel live stop | Read actual live stop ID → check owner/state → review/sign → reread | That stop is no longer live if cancellation succeeded |
| Claim stop refund | Read actual unclaimed refund → skip zero/ineligible → check → review/sign → refresh | Actual refund receipt and changed refund balance; no invented refund |

For each write, reject one wallet request when practical and verify that rejection is not shown as a mined failure or successful transaction. Never grant/revoke your working account's permissions merely to satisfy a checklist.

## What to send back

Copy this for each FAIL or BLOCKED result:

```text
Case ID:
Status: FAIL / BLOCKED
Category: PEI application / Expected restriction / Service failure / Possible upstream issue
Page and browser:
Signing address:
Trading account:
Chain ID:
Snapshot block / baseline block:
Exact input values:
Steps performed (1, 2, 3...):
Expected:
Actual:
Exact error text:
Transaction hash: <actual hash, or none/not broadcast>
Evidence JSON filename:
Screenshots:
Does it reproduce after Refresh + reset/recheck?:
```

Export test notes before clearing browser storage. Redact credentials, private keys and seed phrases; none are needed. Include the original one-unit discrepancy export even if the estimate works. A reproducible SDK discrepancy can become feedback; a bug in PEI should first be fixed here. A failed test is not automatically a vulnerability.

## Ready for submission means evidence, not all-green checkboxes

1. Main account discovery, unsigned checks, one actual PEI order, receipt inspection, exposure and evidence export work for your setup.
2. All failures are fixed or documented with a clear limitation; optional cases without prerequisites are SKIPPED/BLOCKED honestly.
3. Review the [product value and bounty checklist](PRODUCT_VALUE.md): repository, accessible demo, README, real order hashes, actual X links, current whitelist and deadline confirmation remain separate gates.
4. No report or X post has been sent merely by exporting it. Organizer acceptance and any prize are not guaranteed.
