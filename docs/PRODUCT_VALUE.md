# What PEI does, and what makes a credible submission

PEI is an execution diagnostic tool for dreamDEX traders and builders. Its useful loop is: select the correct account → check a specific order → sign deliberately → verify its actual outcome → examine exposure → export reproducible evidence.

## Order-to-evidence workflow: start in Trade

- Trade opens the order form directly; the redundant guide landing page has been removed. The old `/guide` link redirects to Trade.
- Four main areas organize the workflow: Overview, Trade (with Markets), Execution Inspector (with History), and Positions (with Risk Lab).
- Account setup is behind a compact Manage account disclosure; advanced Account operations and Developer Test Lab remain under Tools.
- It distinguishes your signing wallet from the trading account holding margin.
- It sends you to order checks, then receipt evidence, Positions and Risk Lab.
- It retains the transaction context when you move to exposure analysis and back.
- It also supports inspecting an existing supported transaction without connecting a wallet.
- It does not choose a trading strategy, automatically submit orders or guarantee fills.

**Why it matters:** a user who sees a failed check or a mined transaction needs the next useful action. A structured route reduces wrong-account mistakes and dead ends. The guide itself is navigation, not a new protocol feature or sufficient reason to win.

## Account operations: advanced controls

| Controls | Purpose | Who needs them |
| --- | --- | --- |
| Exact allowance, deposit, withdrawal, voucher | Manage supported collateral funding paths | A wallet able to sign as the owner; eligibility still applies |
| Operator grant/revoke | Manage per-pool trading access | Owner-signing account |
| Operator post-only place, cancel, reduce | Act for a separate linked trading account | Currently authorized operator |
| Stop permission, create, cancel, refund | Manage supported owner TP/SL registry calls | Owner-signing account with required state/permission/payment |

Every write needs fresh checks, review and a separate wallet confirmation. Connecting a bot/operator does not make it the owner. “Reduce resting remainder” changes an unfilled order; it does not close a filled position. An owner-only action blocked for your operator is expected behavior, not a broken feature.

**Why it matters:** these controls let a trader diagnose permission/funding problems and inspect the evidence of the operation. They are supporting tools, not the homepage's main selling point. Some inputs remain manual because the user must choose the intended amount, price, trigger, expiry and permission scope. Account discovery can reduce address entry; it cannot make those decisions for the user.

## What can distinguish the product

| Demonstrable value | Evidence a judge can verify | Honest limit |
| --- | --- | --- |
| Correct account selection after connecting a linked signer | Both addresses, indexed provenance, current permissions and margin | Discovery is bounded and index-dependent; multiple candidates require choice |
| Explain an unsuccessful or partial execution | Input checks, canonical receipt, matched fill events, order ID, remaining order | A successful receipt is not always a fill; arbitrary router/batch calls are unsupported |
| Understand exposure after an order | Positions at a known block, frozen price scenarios, coverage and baseline comparison | Hypothetical risk model; no exact liquidation or profit prediction |
| Turn a problem into a reproducible report | Export containing environment, inputs, block/hash and observed discrepancy | Our application bugs and expected restrictions are not automatically upstream bounty issues |
| Revisit and share a case | Saved local attempt plus portable evidence export | Browser journals are local; external transactions cannot be claimed as PEI-originated |

The new Risk Lab finding is a concrete example: the screenshot led to a pinned-block reproduction of a one-raw-unit SDK/contract equity discrepancy. It supports a **normal-severity draft report**, not a claim of a vulnerability, lost funds, guaranteed payment or organizer acceptance.

## Compare with the bounty rules supplied by the user

1. **Useful MVP:** demonstrate one real trader task completed end to end. Extra pages do not substitute for this.
2. **Real orders:** provide an order actually submitted by this application, its hash and decoded outcome. A public read, simulation, existing external trade or mock test does not prove this.
3. **Reproducible feedback:** one Markdown file per distinct upstream issue, expected vs actual, environment and evidence. Keep security-sensitive findings private under the organizer's rules. Do not pad the feedback count with duplicate symptoms.
4. **Repository and README:** make the reviewable source, setup instructions and exact tested version available.
5. **Demo access:** the currently owner-private hosted app is not a judge-accessible demo. Arrange suitable access before submitting; do not assume a URL is public.
6. **Communication:** add links to 2–3 real X posts tagging `@DreamDEXSomnia`; draft text is not a posted link.
7. **Eligibility:** obtain organizer confirmation of the actual extension deadline and whitelist for the DoraHacks email. A previous “8 days left” screenshot is not current confirmation.
8. **Funds:** follow the Arena/separate-bounty-wallet restriction. Do not move bounty USDso into an Arena account.
9. **Prize terms:** selection and feedback acceptance belong to the organizers. The supplied MVP rules split payment between selection and a later mainnet requirement; current testnet functionality does not fulfill that later gate.

## Strong three-minute demonstration

1. Show the connected signer and discovered funded trading account.
2. Show one understandable no-signature failure, such as invalid tick precision, and correct it.
3. Review and sign one deliberately sized testnet order. If demonstrating a previously recorded PEI order, identify it as recorded footage/evidence.
4. Explain the actual receipt: filled, resting, partial or rejected. Show the order/position effect rather than calling every mined transaction a success.
5. Apply one Risk Lab price shock; distinguish exact reconciliation from a disclosed estimate.
6. Download the evidence and show one reproducible feedback report.

This is stronger than claiming the app is “100/10.” It proves user value, execution, diagnostic honesty and a repeat-use reason: explaining the next difficult trade. Its weakest points remain unproven live user outcomes, incomplete discovery in some environments, private demo access and any unresolved upstream behavior.
