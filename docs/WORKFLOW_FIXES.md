# Order workflow fixes — 10 November 2026

This update reduces repeated setup without removing trading modes, manual controls, diagnostics or saved notes.

## Changes

- Direct and linked Trade use a compact input grid. Market and order terms come before expanded account details.
- Linked Trade keeps the receiving address available under **Signing and trading account details**. It remains read-only here; Account operations still permits deliberate account entry.
- Blocked forms offer the appropriate wallet picker, network switch or explicit session-resume action. Switching networks still invalidates the previous review; none of these recovery buttons sends an order.
- Precision/liquidity diagnostics carry the selected market into Markets.
- Incomplete account discovery is distinguished from a completed empty result.
- Order activity uses the filtered account/order list for its empty state, so another account's records cannot hide the empty-state message.
- The submission checklist now matches the three unsent feedback drafts. No acceptance or security finding is implied.

## Acceptance steps

1. Open Trade disconnected. Click **Choose signing wallet**. Expect the existing wallet picker, not a signing request.
2. Connect your signer and select the intended trading account. On linked Trade, expect the market selector before the full address details.
3. Expand **Signing and trading account details**. Compare both full addresses. Collapse it again; selected account must remain unchanged.
4. At phone width, enter quantity, side and price. Expect contained controls, not overlapping inputs or horizontal page scrolling.
5. On direct Trade, enter an invalid quantity precision. Follow **Inspect market rules & book**. Expect the same market to be selected.
6. Change the wallet to another network. Use **Switch network to 50383**. Expect any old order review to stay invalid.
7. Use **Resume selected trading account** when offered. Expect a deliberate return to the saved trading account; no automatic preflight or order.
8. Check a new order with valid market terms. Verify full identity, price, quantity and gas information in the signing review before any intended wallet confirmation.
9. Open Account operations. Expect all previous administrative, cancellation/reduction and stop controls to remain present and permission-gated.
10. Export Developer Test Lab notes and verify your existing observations remain. This update changes no storage keys or note schema.

## Remaining submission work

Real user-signed PEI order evidence, judge access, repository availability, organizer deadline/whitelist confirmation and genuine X post links remain separate acceptance gates. Automated fixtures and read-only probes do not satisfy the real-order requirement. See USER_ACCEPTANCE_GUIDE.md for all feature scenarios.
