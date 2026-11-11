# Compact workspace acceptance — 10 November 2026

## Why the layout changed

The previous Guided execution page mainly linked to Trade or Execution Inspector. It was navigation, not an additional execution capability. Repeating the full account setup and six-step explanation on several pages made the product harder to use. The useful product is the order-to-evidence workflow, not the number of screens.

## Where features live

| Main area | Task | Related tab |
| --- | --- | --- |
| Overview | Review the selected account and recent activity | — |
| Trade | Compose, check and explicitly review an order | Markets |
| Execution Inspector | Explain an existing transaction or local attempt; export evidence | History |
| Positions | Review exposure and existing orders | Risk Lab |

Account operations, Developer Test Lab and Settings remain in Tools. All existing routes continue to work; `/guide` redirects to `/trade`. The shared account row stays visible, while the full setup opens through Manage account. Positions initially expands setup. The wallet button remains available on every page.

For a linked trading account, Trade now shows an order form rather than the full administrative operation selector. Cancel/reduce, collateral, permission and stop controls remain in Account operations. This does not add support for order modes the linked adapter does not implement. A current permission check and explicit wallet review are still required.

## Check the new layout

1. Refresh the application, then open Trade directly.
2. Expected: Order and Markets tabs; a compact account row; no separate Guided execution sidebar item.
3. Connect your existing browser wallet. Confirm the intended trading account in the wallet dialog. If several candidates are found, choose deliberately; bounded discovery is not guaranteed to find every account.
4. Choose Manage trading account in the wallet dialog.
5. Expected: the account setup opens and its address field receives focus. Close the account disclosure again.
6. For a linked account, confirm Trade shows “Post-only limit · linked account” and the receiving address is read-only. Change the account using Manage account, not by editing the order's recipient.
7. Choose a market, enter an intended valid quantity and limit price, and run Check operation. This check does not sign.
8. Expected: review shows the exact selected account, signer, terms and gas ceiling. Changing inputs or wallet network invalidates it. Do not sign merely to test layout.
9. Open “Manage existing orders, collateral and permissions.” Expected: the full operation selector remains available. Owner-only restrictions still apply.
10. Open Execution Inspector, then its History tab. Return to Inspector and inspect a known supported hash. Expected: its receipt outcome is distinguished from a fill.
11. Open Positions, then Risk Lab. Expected: the same selected account is retained; model coverage and any rounding estimate stay disclosed.
12. Open Developer Test Lab. Expected: full account setup is collapsed; existing U01–U24 results and notes are retained. Export your notes before clearing browser storage.
13. Repeat navigation at phone width. Expected: the wallet button and menu work, tabs fit, and the main page has no horizontal overflow. New routes start at the top; browser Back restores the previous scroll position.

See [the complete acceptance guide](USER_ACCEPTANCE_GUIDE.md) for order, permission, risk and evidence scenarios. Automated wallet/receipt fixtures are synthetic and do not establish a real submitted trade.

## Submission positioning

Demonstrate one real PEI order, its actual receipt/fill/resting outcome, one useful risk scenario and a reproducible exported case. The cleaner layout supports that demonstration; it is not itself the winning innovation. Keep upstream feedback separate from our own application bugs. The owner-private demo still needs appropriate judge access, and organizer eligibility plus published social links still need confirmation before submission.
