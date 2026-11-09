# Part 1 improvement handoff

Updated 7 November 2026 IST. Scope: Part 1 of `THREE_PART_IMPROVEMENT_PLAN.md`. Parts 2 and 3 are not represented as implemented by this release.

## Delivered behavior

1. The global wallet menu shows the connected signing wallet, selected viewing/trading account, wallet network, testnet gas and per-market delegated permission. Copy controls expose full addresses. Rejected connections, unavailable extensions, wrong networks, missing gas and absent permissions have useful next steps. Keyboard focus stays inside the modal and Escape returns to its opener.
2. Account setup retains indexed discovery, one-time manual entry, saved public selections and all owner/operator controls. Discovery timeouts do not block manual selection. Selection never grants authority. Connection requests do not sign transactions.
3. Positions now identifies a selected trading account accurately instead of always calling it a separate viewer lookup. Native account funds, signing-wallet gas, wallet tokens, margin and voucher restrictions have separate explanations. Overview distinguishes loading from unavailable account data.
4. Narrow forms, long addresses, tables, test reports and dialogs are contained. Buttons wrap rather than clip. Navigation restores Back position and market anchors across late-loading content, then yields immediately to user interaction. Existing themes and manual workflows remain.
5. Guided Tests retains U01–U12 and the `pei-manual-tests-v1` export schema. Local backup uses a new versioned key per signer/account. Legacy session data is preserved, conflicts require a preview, and corrupt backup data is not overwritten silently. JSON import validates schema, chain, identity, scenario IDs, bounds and metadata. Concurrent tab writes are guarded with Web Locks and a storage comparison; conflicting drafts remain exportable.
6. Every guided case now includes prerequisites, numbered actions, expected behavior, evidence requirements and wallet-interaction labeling. Issue classification and explicit public environment capture are optional. Captured blocks are only included if an account snapshot is actually cached; no block or pass is invented.
7. Test Lab has an evidence checkpoint panel linking up to three existing direct/delegated trading hashes for the selected account. It asks the user to inspect U10 and canonical receipts before another trade. Local journal statuses are explicitly not independent proof.
8. Explicit clearing removes only the selected account context's test notes. Trading journals, account selections and other account notes are not cleared. Exports work even if local saving fails. Notes remain local to this browser/device and must be exported before clearing browser data.

## Preservation and security boundaries

- No changes to `send-order.ts`, `send-operation.ts`, direct/operation journal formats, contract configuration or the pinned SDK.
- No new dependencies, smart contracts, wallet custody, stored secrets or automatic writes.
- Existing direct and delegated trading, cancellation/reduction, owner stops, allowance/margin/voucher tools, risk controls, history and manual inputs remain available under their prior permissions.
- New note storage only writes `pei.manual-tests.v2.<chain>.<signer>.<owner>`; old session notes are left intact during migration. Explicit clearing also removes the matching legacy session key in the current tab.
- Notes are arbitrary user-entered text. Never enter secrets; review reports before sharing. Exports do not certify that a manually recorded PASS is correct.
- Independent hash inspection and unified direct/delegated execution results remain Part 2 work.

## Issue register

| ID | Finding and evidence | Resolution / validation |
|---|---|---|
| P1-01 | Guided test notes were session-only and lost when that session ended | Durable backup, migration preview, import/export, cross-tab conflict and storage-failure tests |
| P1-02 | Positions described selected trading accounts as separate public viewer lookups | State-aware identity labels; account and navigation regressions retained |
| P1-03 | Wallet menu lacked gas and per-market permission context | Explicit network/gas/permission reads, manual next actions, no automatic authorization |
| P1-04 | Overview used unavailable wording while the first read was loading | Distinct loading/failure/observed-zero states |
| P1-05 | Scroll restoration could run before asynchronously loaded content reached its final height | Bounded layout/DOM observation; user interaction stops restoration; anchor and Back tests |
| P1-06 | Keyboard cycling could leave the wallet dialog | Reproduced with Playwright; explicit focus cycling added; Escape/opener regression |
| P1-07 | Existing transaction tests matched the old network label | Assertions updated to the new label; signing/authorization expectations unchanged |
| P1-08 | User's newly updated real Test Lab observations are not available in this workspace | Pending user JSON/notes; no claim that these specific cases have been triaged or fixed |

## Verification

- TypeScript/production build: passed. Existing large SDK chunk warnings remain; they are not new build failures.
- Lint: passed. Full final Playwright regression: **90 passed**, including two live read-only browser checks, in 1.8 minutes. The added Part 1 suite contributes 17 cases. Source/bundle pattern scan: PASS, 74 source files checked, no findings. This limited scan is not a comprehensive security audit.
- Browser coverage includes migration, new-tab durability, conflict review, invalid import identity/duplicates, scoped clearing, invalid storage, export under quota failure, read-only identity changes, permission revocation, duplicate-send guards, receipts, recovery, risk and history.
- Ten pages checked at 320, 390, 768 and 1440 CSS pixels, including populated account data and both themes. A 720x450 viewport at 2x device scale checks a 200% zoom-equivalent layout; native browser zoom accelerators are not claimed as tested. Real hardware wallet/mobile-extension interaction remains separate.
- Synthetic transaction fixtures are isolated from application builds and cannot count as bounty transaction evidence.
- Live public read-only probe: `node scripts/verify-part1.mjs <trading-account> <signer> <pool>`; output in `research/part1-improvements-live.json`.

## Actual live observations, not order-origin proof

Probe started 7 November 2026 at 09:53:15 UTC (15:23:15 IST).

- Signer `0x9fb5B47901c9aD427b1eA9bb96c182eDD0EEAFc5`: 5 STT at block 43912520.
- Trading account `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6`: account snapshot block 43912522.
- BTC position: short 0.00596 BTC. ETH position: long 0.0243 ETH. These are observations at that block, not guaranteed current amounts.
- No pending identifiers observed within the account reader's reported complete coverage at that snapshot.
- Zero-shock reconstruction matched on-chain equity and all margin requirements exactly.
- BTC place/cancel/reduce permissions for the signer were all true at block 43912534.
- Indexed owner/derived discovery returned no candidates for this signer, confirming why the one-time manual fallback remains necessary. It does not establish that no linked accounts exist.
- The probe has no wallet or signer and cannot broadcast. Existing positions do not prove they originated in PEI.

## Part 1 plan coverage

| Plan area | Delivery | Remaining external acceptance |
|---|---|---|
| 1.1 Preserve and triage existing work | Migration/import/export, issue register, manual/automatic evidence separation | User's actual updated scenario JSON/notes and U10 hash are not yet supplied |
| 1.2 Wallet and account onboarding | Header/menu, full-address copy, gas/network/permission checks, discovery/manual fallback, saved context, existing invalidation | User checks their real extension on the hosted origin |
| 1.3 All pages and navigation | Responsive controls, state labels, late-loading scroll restoration, keyboard/focus, viewport checks | Additional browser/hardware combinations may reveal further defects |
| 1.4 Dependable Test Lab | Durable versioned notes, conflict-safe migration/import, scope checks, clear control, environment capture, all-case exports | The original tab must be opened once to migrate its session-only legacy notes |
| 1.5 Evidence and eligibility | Existing-hash checkpoints, live public reads, documented signing/cancel workflow and funding separation | PEI-origin hash/receipt review, user signature if needed, exact cutoff, whitelist and funding category |

Engineering completion does not imply those external gates are complete. No new real order, message, X post, feedback submission or bounty submission was made in this work. The extension is acknowledged; its exact revised cutoff and whitelist are still unconfirmed.

## User acceptance — perform in this order

### A. Preserve your existing test results

1. Keep the original browser tab where you entered your notes open.
2. If it is still running the older build, download Guided Tests JSON before reloading.
3. Reload the updated app on the same origin. Reconnect the same signer and select the same trading account.
4. Open Developer Test Lab. Review any earlier-note conflict preview; choose which version to keep for each difference.
5. Wait for the local-save confirmation, then export JSON again.
6. If notes appear empty, verify signer/account context. Import the saved JSON into its matching context instead of re-entering or discarding it.

Expected: original observations survive and all 12 cases export, even when a filter is active.

### B. Verify wallet and account roles

1. Open the header wallet menu.
2. Confirm signer `0x9fb5…AFc5` and trading account `0xdd4d…0BC6` against their full addresses.
3. Confirm wallet network 50383 and the freshly observed signer gas.
4. Select BTC in the permission check and review its observation block.
5. Open Overview, Positions, Risk Lab and Trade. Verify the same trading account is used throughout.

Expected: signer gas and trading margin are distinct; displayed balances and positions follow the trading account. A permission observation is still followed by fresh order preflight.

### C. Test recovery of notes and layout

1. Add an innocuous note to U02 and wait for the saved message.
2. Open the app in another tab, reconnect/select the same context and confirm the note is present.
3. Export before editing the same report in two tabs. A conflict warning should protect against silent overwrites.
4. Import an exported report and review the merge before applying it.
5. Visit every page at narrow width; test sidebar, wallet dialog, tables, Back and market detail links.
6. Navigate the wallet dialog with Tab/Shift+Tab, then Escape. Focus should return to the wallet button.

Expected: reports remain recoverable, controls are reachable and navigation does not unexpectedly pull the page away after you begin scrolling.

### D. Review real-order evidence before another signature

1. Review U10 notes and the new evidence checkpoint panel.
2. Open any existing recorded hash and verify its canonical receipt through the existing inspector/journal.
3. Save the export and report what actually happened: resting, filled, reverted or unresolved.
4. If no qualifying evidence exists, run U08 with current market rules and your intentionally chosen test terms. You review and sign any U10 order yourself.
5. Run U11 only if a remainder exists; a cancellation does not close an already-filled position.
6. Provide the exact revised bounty cutoff, whitelist confirmation and whether this account uses Arena funds or a separate grant.

Expected: no duplicate order just to test the UI, no fabricated fill, and no automatic submission.

For each failure, return the case ID, exact steps, expected/actual, screenshot, account context, block/time and hash or explicitly no transaction. Private keys and seed phrases must never be included.
