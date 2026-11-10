import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';

// Keep the numbered in-app cases and the printable checklist in sync.
const file = ts.createSourceFile('GuidedTests.tsx', await readFile('apps/web/src/components/GuidedTests.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let scenarios;
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p)) throw Error('Unsupported scenario property');
    return [p.name.getText(file).replace(/^['"]|['"]$/g, ''), literal(p.initializer)];
  }));
  throw Error('Unsupported scenario literal');
}
file.forEachChild(node => {
  if (!ts.isVariableStatement(node)) return;
  for (const declaration of node.declarationList.declarations) if (declaration.name.getText(file) === 'guidedScenarios') {
    const initializer = declaration.initializer;
    scenarios = literal(ts.isAsExpression(initializer) ? initializer.expression : initializer);
  }
});
if (!scenarios || scenarios.length !== 24) throw Error('Expected all 24 current cases');
const intro = `# Perps Execution Inspector: step-by-step acceptance tests

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
`;
const cases = scenarios.map(s => `## ${s.id} — ${s.title}\n\nPage: \`${s.path}\`. ${s.signing ? '**Write-capable case: a deliberate wallet confirmation may be required.**' : 'Read/check steps first; any optional write still needs separate confirmation.'}\n\n${s.steps.map((step,i)=>`${i+1}. ${step}`).join('\n')}\n\n**Expected:** ${s.expected}\n\n**Record:** PASS / FAIL / BLOCKED / SKIPPED, exact inputs, screenshot, block and transaction hash if one exists.\n`).join('\n');
const appendix = `
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

\`\`\`text
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
\`\`\`

Export test notes before clearing browser storage. Redact credentials, private keys and seed phrases; none are needed. Include the original one-unit discrepancy export even if the estimate works. A reproducible SDK discrepancy can become feedback; a bug in PEI should first be fixed here. A failed test is not automatically a vulnerability.

## Ready for submission means evidence, not all-green checkboxes

1. Main account discovery, unsigned checks, one actual PEI order, receipt inspection, exposure and evidence export work for your setup.
2. All failures are fixed or documented with a clear limitation; optional cases without prerequisites are SKIPPED/BLOCKED honestly.
3. Review the [product value and bounty checklist](PRODUCT_VALUE.md): repository, accessible demo, README, real order hashes, actual X links, current whitelist and deadline confirmation remain separate gates.
4. No report or X post has been sent merely by exporting it. Organizer acceptance and any prize are not guaranteed.
`;
await writeFile('docs/USER_ACCEPTANCE_GUIDE.md', intro + '\n' + cases + appendix);
console.log('Updated docs/USER_ACCEPTANCE_GUIDE.md with all 24 in-app cases and advanced operation checks.');
