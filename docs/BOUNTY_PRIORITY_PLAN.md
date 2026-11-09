# Bounty priorities for Perps Execution Inspector

The strongest entry is a trader tool for answering one question: **what happened to my order and how did it change my exposure?** A trader can use it before every signature, revisit an uncertain hash, and return after a fill to inspect risk. Demonstrate that loop on one account and one order.

## Work in this order

1. **Use the extension.** The supplied event screenshot shows **Extended · 8 days left**. Use the live DoraHacks countdown to schedule submission. The exact revised UTC cutoff and this builder’s email whitelist status are separate checks. Check submission access now while collecting evidence. [Bounty listing](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail)
2. **Collect verifiable MVP evidence.** Select the funded receiving account and its linked signer. Record the owner, pool, block, starting position and pending orders. Run U08, review a small testnet order, and personally confirm U10 if the displayed terms match your intent. Save the actual hash, canonical receipt, decoded order ID/fills, and a later account snapshot. If a live remainder exists, run U11 and save its cancellation evidence. Describe precisely whether it rested, filled, reverted or is unresolved. Keep Arena funds and separate bounty-grant accounts separate under the supplied rules.
3. **Make it reproducible by a judge.** Provide a GitHub repository URL, who the tool helps, setup commands, pinned SDK version, evidence files with public explorer links, and a demo the judge can access. Current hosting is owner-private. Share an accessible recording or arrange authorized demo access before submission. The [demo script](DEMO_SCRIPT.md) follows the actual app. Lead with the blocker or uncertain order, then show what the receipt and position tell the trader.
4. **Publish the required communication when ready.** Write two or three accurate X posts tagging `@DreamDEXSomnia` and add the actual post URLs to the README. One can explain the signer/trading account distinction with a screenshot. A second can explain the verified outcome of the real order. An optional third can show the same account's risk scenario. Check links from a judge's perspective. [Submission drafts](SUBMISSION_DRAFT.md)
5. **Submit Feedback separately if eligible.** Prioritize the [funding documentation mismatch](../feedback/001-perp-funding-docs.md). Run `node scripts/reproduce-feedback.mjs`, compare the pinned declarations with the current developer guide, and include expected/actual behavior and environment. The [delegated wrapper request](../feedback/002-delegated-perps-wrappers.md) is a convenience feature proposal. Contract-level delegated trading already works. Keep severity proportional to impact. The organizer determines duplicates, acceptance, and payouts. Security findings go privately to `security@dreamdex.io`.

## Use your saved Test Lab work

1. In the same browser tab, select the same signer and trading account you used for testing.
2. Open **Developer Test Lab → Guided tests → Show scenarios → Failed or blocked**. Review **With notes** as well.
3. Download JSON from the guided tests section. The report includes all cases, even with a filter active. Updated results have durable local backup scoped to signer/account on this browser/device. Earlier session notes migrate from their original tab with conflict review; do not close the original tab before migration/export. Reports can be imported into the same account context with a merge preview.
4. For each failure, include the scenario ID, exact actions, error, owner/signer, snapshot block, expected result, and screenshot. Include a real hash only if a transaction was broadcast.
5. Classify what failed: PEI UI behavior, expected permission or market restriction, service outage, or a reproducible upstream defect. Fix local UI issues in PEI. Use upstream reports for findings that reproduce independently against the SDK, API, docs or contracts.

## Evidence status

The implementation and automated read-only checks are available. A PEI-signed testnet order, its verified evidence, a GitHub Build URL, judge-accessible demo, published X links, and organizer confirmation remain submission gates. Accepted reports and awards can only be confirmed by dreamDEX.
