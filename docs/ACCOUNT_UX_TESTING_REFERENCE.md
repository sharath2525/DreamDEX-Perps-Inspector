# Account UX update — your testing reference

Implemented 6 November 2026. Test results below begin NOT RUN; automated fixture tests are separate from real wallet evidence.

## What this solves

- Signer gas and trading-account funds have separate labels.
- Select your funded account once; it follows you across pages and restores on reconnect.
- Public inspection preserves the wallet connection while disabling signing.
- Discovery offers supported indexed candidates, with an honest manual fallback for linked bot accounts.
- Overview shows real position rows and combined direct/delegated local activity.
- Trade opens the linked operator workflow for a different trading account.
- Risk Lab starts its baseline automatically and retains manual overrides/reset/export.
- Exact network/account/input errors replace the generic disabled-operator message.
- Account/network changes invalidate reviews. Returning never reuses the old review.
- Developer Test Lab contains numbered cards and exportable manual results. The November 7 update adds durable browser/device backup per signer/account, preserves earlier tab notes during migration and previews import conflicts. Export for a portable copy; recorded PASS results remain user observations.
- Existing journals, manual lookup, owner operations, stops, precision controls and diagnostic exports remain available.

## Your first setup

1. Open the updated app and refresh the browser.
2. In the shared account setup, connect signing wallet `0x9fb5B47901c9aD427b1eA9bb96c182eDD0EEAFc5`.
3. Select Somnia testnet, chain 50383. If a network change invalidated readiness, click **Return to trading account**.
4. Expand **Set up or change account**.
5. Enter trading account `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6`.
6. Click **Use trading account**.
7. Check that the signer ends AFc5 and trading account ends 0BC6.
8. Open Positions, then Risk Lab. No new trade is needed if an existing position remains.
9. In Developer Test Lab, run U01–U05 first and record the actual results.

Selecting an account is not authorization. Pool permissions, current balances, deployment identity and the exact operation are checked again before signing. No private key is required.

## Scenarios

### U01 — Select the funded account

Status: NOT RUN. Read-only unless explicitly stated.

1. Connect your signing wallet above.
2. Expand Set up or change account. Choose a candidate, or paste the dreamDEX app wallet address once.
3. Click Use trading account. Compare the two full addresses.
4. Expand linked permissions and choose your market.

**Expected:** Signer pays gas; trading account holds margin and positions. Discovery and saved addresses do not grant permission.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U02 — Navigation and reload

Status: NOT RUN. Read-only unless explicitly stated.

1. Complete U01.
2. Visit Overview, Positions, Risk Lab, Trade, Account operations and History.
3. Check the selected account on every page.
4. Reload, then reconnect the same wallet.

**Expected:** The saved selection returns. Reload starts read-only until connection. No automatic signing or resend.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U03 — Balances, positions and orders

Status: NOT RUN. Read-only unless explicitly stated.

1. Select your funded account and refresh Positions.
2. Record block, unlocked collateral, equity and voucher floor separately.
3. Record direction and size from Current positions.
4. Record Pending orders separately and compare Overview at its block.

**Expected:** Actual position rows appear in both views. Gas is not collateral. No pending orders does not mean no positions.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U04 — Risk baseline and shocks

Status: NOT RUN. Read-only unless explicitly stated.

1. Open Risk Lab and wait for automatic baseline reconciliation.
2. Select 0% and compare baseline with scenario.
3. Leave overrides blank. Select +10%, then -10%, then 0%.
4. Download evidence at the same frozen block.

**Expected:** For a lone short, higher prices worsen price PnL and lower prices improve it. Long exposure reverses this. No orders are placed.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U05 — Invalid risk input and reset

Status: NOT RUN. Read-only unless explicitly stated.

1. Enter non-numeric text in Uniform price shock.
2. Check validation and disabled export.
3. Restore 0 and wait for the result.
4. Refresh the snapshot, then click Use latest snapshot & reset scenarios.

**Expected:** Invalid edits cannot export stale values as current. Only explicit reset replaces the frozen baseline.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U06 — Public lookup and safe return

Status: NOT RUN. Read-only unless explicitly stated.

1. Connect and select a trading account.
2. Use Account to inspect for a different public address.
3. Open Trade and read why execution is blocked.
4. Click Return to trading account.

**Expected:** Wallet stays connected. Inspection is read-only. Returning invalidates old reviews and restores the trading account.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U07 — Network and signer changes

Status: NOT RUN. Read-only unless explicitly stated.

1. Prepare a checked order without signing.
2. Change wallet network and read the blocked reason.
3. Return to 50383 and resume the trading account.
4. Change wallet account and inspect the selection and old review.

**Expected:** Old reviews cannot be signed. Exact network/account reasons appear. No automatic transactions.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U08 — Check an order without signing

Status: NOT RUN. Read-only unless explicitly stated.

1. Select the correct account and market.
2. Read current tick, lot and minimum rules. Enter a small valid quantity.
3. Inspect current book. For post-only, choose a tick-aligned non-crossing limit; set expiry and gas budget.
4. Run the no-signature check and review the exact account, call and costs.
5. Edit quantity and confirm the review becomes invalid.

**Expected:** Checks do not sign. Invalid precision, permission, margin and gas produce actionable errors. Simulation is not fill proof.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U09 — Reject a wallet request

Status: NOT RUN. Wallet interaction required; confirm only your intended small testnet operation.

1. Create a fresh valid U08 review.
2. Authorize the displayed operation and open the wallet.
3. Reject in the wallet.
4. Inspect local activity.

**Expected:** Rejected status; no fabricated hash or on-chain failure. No automatic retry.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U10 — One real testnet order

Status: NOT RUN. Wallet interaction required; confirm only your intended small testnet operation.

1. Create a fresh valid U08 review and deliberately accept the test size.
2. Review the exact wallet transaction and confirm.
3. Save the returned hash; do not resend an uncertain outcome.
4. Verify the receipt in Execution Inspector or the linked operation journal.
5. Record order ID and fills; refresh orders and positions.

**Expected:** Submitted, mined, resting and filled remain distinct. Post-only can fill later. Evidence agrees with actual chain state.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U11 — Cancel a resting remainder

Status: NOT RUN. Wallet interaction required; confirm only your intended small testnet operation.

1. Find an actual remaining order; skip if none exists.
2. Use operator cancellation for a linked account or direct cancellation in its execution record.
3. Select the actual pool/order ID and run a fresh check.
4. Review and confirm cancellation, then verify its receipt.
5. Refresh orders and positions separately.

**Expected:** Cancellation removes the remainder, not an already-filled position. Report fill/cancel races from evidence.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

### U12 — Recovery, history and diagnostics

Status: NOT RUN. Read-only unless explicitly stated.

1. Save hashes and export execution evidence.
2. Reload and select the same account.
3. Compare local activity with indexed history; recover a known hash if necessary.
4. Run the read-only suite in Developer Test Lab.
5. Record errors, blocks and screenshots in your report.

**Expected:** Journals survive. External trades are not labeled PEI attempts. RPC/indexer failures stay explicit.

**Send:** selected signer/account, chain ID, block/time, exact inputs, actual result or error, screenshots, and exported evidence. Include a real hash only if one exists.

## Additional retained-feature checks

1. **Market reads:** open Markets, select a market, compare tick/lot/minimum and bid/ask data at the displayed block; failed prices remain unavailable.
2. **Permission revocation:** optional, only on your own account after resolving orders; remove access in dreamDEX, refresh permissions, and verify PEI preflight blocks the revoked action. Restore access deliberately if needed.
3. **Remainder reduction:** use an actual resting order and a smaller valid remaining quantity, run the operator reduction check, review/sign, verify receipt and remaining amount. Skip if there is no remainder.
4. **Direct-owner trading:** use a separately funded EOA as both signer and trading account, then follow U08–U12. Do not treat the linked operator as owner.
5. **Allowance/deposit/withdrawal:** direct-owner EOA only; review exact allowance separately, test preflight rejection for insufficient funds/allowance or excess withdrawal, and verify any authorized transfer from receipts and balances. Voucher floor is not withdrawable cash.
6. **Owner stops:** owner-supported setup only; inspect registry and payment, verify permission, review trigger/limit/quantity, and verify actual stop ID/liveness after a deliberate send. A linked bot cannot arm owner-native stops.
7. **Voucher claim:** test eligibility with the appropriate account. Already claimed/inactive is an expected restriction, not automatically a bug.
8. **Unavailable services:** disconnect internet temporarily after loading an account, refresh, verify an unavailable/stale indication, reconnect and refresh. Do not interpret retained observations as current balances.
9. **Mobile:** at narrow width, navigate every page, expand account setup and test cards, and confirm forms/tables remain usable without page overflow.
10. **Journal recovery:** do not delete browser data to clear an unresolved order; recover its actual wallet hash and verify the receipt. Clearing site data erases local evidence.

## Report template

```text
Scenario ID:
Status: PASS / FAIL / BLOCKED / SKIPPED
Date/time + timezone:
App URL:
Signer / trading account:
Chain ID / snapshot block:
1. Action taken:
2. Action taken:
Exact inputs:
Expected:
Actual / exact error:
Wallet: no prompt / rejected / confirmed
Hash: real hash OR none + reason
Evidence filenames:
Remaining orders / positions:
```

## Limits and submission

- Indexed discovery cannot guarantee finding every operator-linked account. One-time address entry remains necessary for some users.
- Live chain data changes; old screenshots are not fixed expected balances.
- Automated wallet fixtures do not prove a real PEI order. Real signed acceptance is still separate.
- Existing app bugs are fixed as app bugs, not claimed as payable dreamDEX reports. SDK/API reports need independent reproduction.
- The supplied event screenshot shows an extension. Confirm the exact revised cutoff and email whitelist separately; budget and report acceptance remain organizer decisions. No posts or reports were submitted by this update.
