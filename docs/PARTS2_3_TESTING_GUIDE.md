# Test Part 2 and prepare Part 3 — one scenario at a time

Do the read-only scenarios first. Keep existing Developer Test Lab notes; export a backup before sharing. Record PASS, FAIL, INCONCLUSIVE or SKIPPED honestly. Do not place another order merely to obtain a prettier result.

## S01 — Connect and select the funded account (no trade)

1. Click **Connect wallet** in the header and select your browser extension.
2. Verify signer `0x9fb5B47901c9aD427b1eA9bb96c182eDD0EEAFc5` and chain 50383.
3. Review discovered accounts. Discovery may return several indexed owner/derived accounts, or none; it cannot enumerate every bot permission.
4. If the funded account is absent, enter `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6` once and select it as the trading account.
5. Compare Overview and Positions. Signer STT pays gas; trading-account margin, voucher floor and positions are separate.
6. Reload and reconnect. The saved public selection should return; a changed wallet/network still requires deliberate fresh setup.

Expected: consistent owner across account pages, preserved manual fallback, no automatic transaction. Save the two addresses, block/time and screenshots. Never report empty discovery as proof that no account exists.

## S02 — Inspect an existing transaction (no wallet required)

1. Obtain the actual hash from your PEI journal or wallet activity. Prefer the existing U10 attempt if available.
2. Open **Execution Inspector**. Paste the full hash into **Testnet transaction hash** and press **Inspect transaction**.
3. Read transaction status and execution outcome separately.
4. Compare signing actor, receiving account, registered pool, order ID, receipt fills and latest owned remainder with the explorer.
5. Note receipt block/time and current-state block/time. Do not interpret a smaller remainder as proof of later fills.
6. Download JSON and Markdown. Review public addresses before sharing.

Expected: a supported single pool call produces a report. Smart-account batches, routers and non-trading transactions are explicitly unsupported, not fake successful trades. A failure to read history is not a zero balance.

## S03 — Verify sharing independently

1. Press **Copy independent report link**.
2. Open the link in a fresh browser/profile with no PEI journal and no connected wallet.
3. If the host denies access, record **ACCESS BLOCKED**; owner-only access is not a public demo. Use an authorized accessible deployment or run the source locally.
4. Check the same transaction and receipt outcome; current state may have changed since the earlier read.
5. Export again. Confirm no personal Test Lab notes, keys or signatures are present.

Expected: chain/hash alone suffice for supported read-only inspection once site access is available. External transactions are never presented as PEI-created.

## S04 — Understand resulting exposure and risk

1. From a mined report click **Inspect resulting positions**. Confirm the receiving account, not the signer, is selected.
2. Return to the report and click **Explore this market’s risk**.
3. Wait for **Baseline reconciled exactly with on-chain health**. If totals are withheld, record the reason and stop comparisons.
4. Select **Focused 0%**. Baseline and scenario should agree.
5. Select **Focused +10%**, then **Focused -10%**. Check only that market's override changes; uniform shock stays 0%.
6. For a lone long, a positive price shock improves price PnL; for a short it worsens it. Portfolio equity also depends on other frozen inputs.
7. Try an invalid uniform value, then restore 0. Invalid/stale calculations cannot be exported as current.
8. Refresh live data: the frozen baseline must not move. Click **Use latest snapshot & reset scenarios** deliberately to replace it.

Expected: read-only context, no signing authority granted. Flat accounts have no open-position price-shock effect. Pending-order fills, future funding and liquidation timing are outside the model.

## S05 — Real PEI order, only if existing evidence is insufficient

1. Export the existing local attempt first. If it is pending/unknown, recover that attempt before considering another send.
2. Confirm the funding category (Arena or separate approved bounty grant) and correct linked permission for the chosen market.
3. Open Trade / Account operations for the linked account. Choose your intended side, grid-valid quantity and price using current market rules; this guide provides no invented price or size.
4. Run **Check operation — no signature**. Record owner, actor, pool, expiry, quantity, price, gas ceiling and snapshot time.
5. Read the final review and make the wallet decision yourself. A rejection is a valid test and must not be labelled a mined revert.
6. If you sign, save the actual hash immediately. Inspect the original journal receipt and the common report.
7. Record resting, partial/full fill, revert or unresolved exactly as evidenced. Post-only acceptance does not imply a fill.
8. Export the original journal plus independent report. Record remaining orders and positions; do not assume the account is flat.

Expected: no automatic retry or signing. For uncertain outcomes keep browser storage and use strict original-journal recovery. The public hash inspector intentionally cannot unlock that attempt.

## S06 — Cancel or reduce an existing remainder (separate authorization)

1. Refresh pending orders. If none remain, mark this live case SKIPPED and explain why.
2. Confirm the order ID, receiving account, pool and current remainder.
3. Select the permitted cancellation or reduction operation. Reduction means shrinking a resting order, not closing a filled position.
4. Run fresh checks and review the new gas ceiling and requested remainder. You decide whether to sign.
5. Inspect its separate hash. Expect a matching cancellation/expiry or reduction event, not merely receipt status success.
6. Refresh positions and pending orders. If a fill won the race, record the actual outcome and preserve the remaining exposure.

## S07 — Invalid inputs, read failures and navigation (no trade)

1. Enter an incomplete hash: input must reject it without claiming a transaction failure.
2. Open a report URL with chain 1: it must reject the unsupported chain.
3. Try a known non-trading transaction: unsupported must remain explicit.
4. Disconnect networking during a read: expect unresolved/unavailable, not a fabricated zero or fill. Restore networking and retry the read.
5. Test Overview, Trade, Inspector, Positions, Risk, History and Test Lab at desktop and narrow mobile widths.
6. Scroll, navigate away and use Back; check buttons/cards/tables and keyboard access. Confirm Test Lab notes survive reload.

## S08 — Three real people and final submission

1. Follow `PART3_USER_STUDY.md` with three actual participants; record raw observations before conclusions.
2. Re-run `node scripts/reproduce-feedback.mjs`; attach only reproduced non-sensitive upstream issues.
3. Confirm whitelist and exact extended UTC cutoff with the organizers. Registration alone does not prove whitelist status.
4. Verify GitHub, demo/recording, real PEI order evidence and 2–3 real X post URLs from a signed-out browser.
5. Use `SUBMISSION_CHECKLIST.md`; submit only after the remaining gates are satisfied. Save actual confirmation.

## Send a useful bug report

For EACH failure provide: scenario ID; build/browser; actor/owner/chain; exact numbered steps and values; expected; actual; screenshot; block/time; hash or “none”; JSON export if relevant. Do not send keys, seeds, raw signed transactions or session tokens. Developer Test Lab notes stay local until you export/share them; they are not automatically visible to the developer.
