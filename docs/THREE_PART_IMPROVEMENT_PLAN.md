# Three-part product and bounty improvement plan

Prepared 7 November 2026 IST. Status: planning only. No application code is changed by this plan.

Implementation update: Part 1 engineering and validation are recorded in [the Part 1 handoff](PART1_IMPROVEMENT_HANDOFF.md). User-supplied test observations, real-order provenance and organizer eligibility checks retain their separate acceptance status.

## Product decision

Build a trader tool that answers: **What happened to my dreamDEX order, what evidence proves it, and what exposure remains?**

Primary user: a trader or bot operator investigating a failed, uncertain, resting or partially filled order. Secondary users: builders preparing reproducible reports and reviewers verifying a submission.

The product's value must be demonstrated against the official trading app and explorer. More pages, an AI label or a polished dashboard alone do not establish differentiation. A useful repeat-use loop is check an order, inspect the result, understand remaining exposure, and share evidence when help is needed.

### Current baseline and evidence limits

- Keep the existing React/TypeScript application, pinned SDK 0.32.1, adapter, wallet boundaries and manual features. No new contracts are required for this plan.
- A global browser-wallet connection button, shared account selection, route/scroll fixes, guided tests and frozen risk calculations already exist. Audit and improve them; do not count them as new deliveries.
- Direct orders have richer execution inspection than linked-operator orders. Linked records currently expose a canonical receipt, decoded order/fill data and a later account read through a separate operation journal.
- Existing transaction inspection relies on local attempt records. Independent hash inspection is new work.
- Test Lab notes currently use session storage scoped to account and signer. The user's actual updated entries have not been reviewed. U10 may already contain a real transaction hash; check before requesting another order.
- Source documents contain older test counts and pending-evidence claims. Reconcile these with actual artifacts, rather than copying historical claims into the submission.
- The user's screenshot establishes an extension and showed eight days left when captured. It does not establish the exact revised UTC cutoff. Whitelist status remains a separate check. Do not infer a new date from the screenshot.
- Official developer docs checked for this plan still describe chain 50383 and SDK 0.32.1. Official bot guidance distinguishes the gas-paying bot from the account whose margin it trades. Bounty terms are from the supplied announcement; automated access to DoraHacks returned HTTP 405.

## Part 1 — Reliable onboarding, usable pages and trustworthy testing

Priority: HIGH. Suggested effort: first two working days, adjusted for the actual submission cutoff.

### 1.1 Establish what is broken and preserve user work

1. Export the user's existing Guided Tests JSON from the same browser/account context; inspect U10 and all FAIL/BLOCKED entries first.
2. Preserve existing execution journals, operation journals, account selections and test notes. Record storage schema versions before changing persistence.
3. Reproduce reported failures with exact steps, inputs, route, browser, signer/account, network, snapshot block and error. Classify each as a PEI defect, expected protocol restriction, service failure or possible upstream issue.
4. Keep automatic test results, user-marked results and real-chain evidence distinct. No manual PASS becomes independently verified evidence automatically.
5. Build a short issue register with severity, reproduction, expected behavior, fix and retest evidence. Prioritize wrong-account behavior, lost evidence and unusable order flows before cosmetics.

### 1.2 Finish wallet and account onboarding

1. Keep Connect wallet visible on every page and at mobile widths. Show connecting, rejection, disconnected, wrong network and no-provider states clearly.
2. Make the connected menu show signing wallet, trading account, STT gas, current network and permission readiness. Use full-address copy controls and explicit labels.
3. Guide the first connection through choose provider, verify network, discover/select trading account and check permissions. Connecting alone performs no transaction.
4. Try the verified indexed discovery methods. If incomplete or empty, explain the limitation and offer the existing one-time manual trading address input. Never silently select the largest balance.
5. Remember public selections per chain and signer, then revalidate permissions. Discovery, balance and stored selection are never proof of authorization.
6. Maintain a separate public read-only inspection context. Returning to trading requires deliberate selection and a fresh review. Changing signer, chain, owner, order terms or permission invalidates the previous review.
7. Explain disabled actions with the exact blocker and one next step. Distinguish missing gas, missing margin, absent permission, unsupported operation and unavailable network data.
8. Retain all manual and advanced controls. Hide complexity behind expandable details where useful, without removing functionality.
9. Do not advertise WalletConnect QR/mobile pairing unless separately implemented and verified. The current connection component supports browser-injected wallets.

Impact: prevents the user's gas-only signer from being mistaken for the funded trading account and makes setup understandable without technical help.

### 1.3 Audit every page and navigation state

Pages: Overview, Markets, Trade, Execution Inspector, Positions, Risk Lab, Account operations, History, Developer Test Lab and Settings, including direct-link detail routes.

1. Standardize page width, headings, cards, form spacing, button alignment, error placement and loading states.
2. Use one main vertical page scroller; contain wide tables horizontally. Check sidebar, dialogs and sticky elements independently.
3. Test 320, 390, 768 and 1440 pixel viewports, browser zoom, long addresses, large numbers, empty data, errors and pending results.
4. New navigation starts at the correct page position; Back restores previous position; market/result deep links survive reload. Focus is visible and does not jump behind overlays.
5. Verify keyboard navigation, dialog focus/escape, labels, touch targets and status text beyond color alone.
6. Keep signer/account context stable across every page. Explain wallet tokens, gas, perps equity, unlocked/locked collateral and non-withdrawable voucher credit separately.
7. Distinguish genuine zero from loading, stale, partial and unavailable. Positions and resting orders remain separate.
8. Preserve existing dark/light themes and useful layouts. No wholesale visual redesign is required.

Impact: removes friction that previously prevented testing and makes a judge's first visit credible.

### 1.4 Make Test Lab a dependable testing workspace

1. Preserve U01–U12 IDs, existing notes and current export format compatibility.
2. Add a durable, versioned local backup and validated JSON import/export. Migrate session notes without overwriting newer saved notes; show a merge preview for conflicts.
3. Label notes as local to the browser/device. Provide explicit export and clear-data controls. Never store wallet secrets, signatures or signed transaction payloads.
4. Each scenario shows prerequisites, numbered actions, expected result, evidence to save and whether it needs a wallet signature.
5. Capture public environment metadata and references to snapshots/hashes where available, without treating notes as proof.
6. Keep filters for failures and notes. Exports include all scenarios regardless of the visible filter. Storage failures warn immediately and preserve an export option.

Impact: preserves the user's work and turns vague bug reports into reproducible cases.

### 1.5 Start real evidence and submission access checks early

1. Review any existing U10 hash against the original app attempt, sender, recipient, calldata and canonical receipt. An unrelated dreamDEX transaction can be inspected but cannot be relabeled as PEI-created.
2. If no qualifying evidence exists, prepare one user-reviewed testnet order using the supported account route and live constraints. The user chooses acceptable terms and signs personally.
3. Save actual outcome, hash, receipt, decoded events and subsequent account/order observations. A resting order is reported as resting. A fill is only reported with fill evidence.
4. If a live remainder exists, test reviewed cancellation and save its separate evidence. Do not open another position simply to test balance or risk displays.
5. Check the exact revised cutoff and DoraHacks email whitelist in parallel with engineering. An extension does not establish email eligibility.
6. Keep Arena and separate bounty-grant funding accounts separate under the supplied rules.

### Part 1 completion gate

- User-reported failures have a reproduction and disposition; actual user notes are backed up before migration.
- All pages retain the correct account; connection, rejection and network-change paths work.
- No clipped primary controls or page-level horizontal overflow in the viewport matrix; keyboard and scrolling checks pass.
- Existing manual features and journals still work; U01–U12 notes survive migration, refresh and import/export.
- Real-order evidence is verified if the user supplies/signs it. Otherwise explicitly mark that acceptance step pending and continue independent implementation.

## Part 2 — Unified execution explanation, independent verification and contextual risk

Priority: HIGH for execution and sharing; MEDIUM for risk presentation. Suggested effort: next two to three working days.

### 2.1 Create a common result model without weakening existing guards

1. Introduce a normalized read-only execution report in the adapter and shared result components in the web app.
2. Accept existing direct and delegated journal records through compatibility adapters. Retain original IDs, raw records and links. Non-trading account operations keep operation-specific receipts and must not be called trades.
3. Separate transaction status from business outcome. Represent wallet rejection, submitted/pending, reverted, mined with no demonstrated fill, resting, partial fill, full fill, cancellation, reduction, replacement and unresolved/unsupported cases precisely.
4. Show chain/genesis, actor, receiving owner, verified pool, transaction hash, canonical block, order ID, exact quantities, fills, observed remainder, gas paid and source timestamps.
5. Separate fills in this receipt, any separately verified later fills and the latest order state. A later fill of a post-only order is not a fill in the placement receipt.
6. Label prior/end-of-block position and account observations as block-level context. Other transactions in that block can affect the differences; do not claim a transaction-exact PnL delta.
7. Retain exact raw units in exports and technical details, while presenting human-readable units and plain-language explanations first.
8. Show actionable next steps such as inspect remaining order, review cancellation, inspect resulting position, analyze risk, export evidence or retry a failed read. Writes always run their own fresh review.
9. Never automatically resend an uncertain transaction or bypass the existing shared owner/actor locks.

Impact: the user's linked-wallet path receives the same diagnostic value as the direct-owner path, making the project's core claim real.

### 2.2 Add independent read-only transaction inspection

1. Add a hash input and a canonical shareable result URL containing chain and transaction hash. A new browser must be able to inspect without the sender's local journal or wallet connection.
2. Verify deployment, actual transaction/receipt, canonical block, registered pool, supported calldata and matching event emitters/identifiers before decoding a result.
3. Decode direct and delegated place/cancel/reduce operations only where the deployed ABI and tests establish support. Derive actor and owner from verified transaction semantics, never from URL-provided claims.
4. Clearly label independently observed transactions versus locally recorded PEI attempts. Chain data alone cannot prove which frontend created a transaction.
5. Missing transactions, unsupported calls, unavailable archive state, delayed indexers and reorgs produce explicit partial/unresolved results. Keep bounded retries and coverage disclosures.
6. Reuse a shared result renderer, while keeping strict journal recovery/replacement validation separate from generic public inspection. Public inspection cannot release unresolved send locks merely because a pasted hash looks plausible.
7. Generate JSON and Markdown evidence with schema/version, provenance, network, contracts, actual hashes, blocks, decoded facts, limitations and observation times. Include explorer links and verify them.
8. Do not include personal test notes in share URLs. Make clear that a hash link exposes public transaction/account information. Copies of exports are evidence snapshots, not self-authenticating proof; readers can recheck chain sources.
9. The current hosted site is owner-private. Prepare accessible recordings and downloadable evidence immediately; coordinate authorized hosting/repository access for independently usable links.

Impact: a judge or support engineer can verify the claim without trusting a screenshot or accessing the developer's browser storage.

### 2.3 Connect results to useful risk explanations

1. Link each verified trading result to the correct owner and pool in Positions and Risk Lab, keeping public inspection read-only.
2. Show observed position direction/size and whether exposure changed, with the block-level attribution limitation visible.
3. Explain equity, maintenance headroom and market concentration in plain language. Add focused scenario presets for the selected position while preserving portfolio-wide uniform shocks and all per-market overrides.
4. Reuse the reconciled frozen baseline. Clearly separate execution-time observations, current account snapshots and hypothetical shock results.
5. Keep zero-shock reconciliation, incomplete-data withholding, invalid-input protection, explicit reset and downloadable scenario evidence.
6. For flat accounts, explain why price shocks have no position effect. For open orders, state that future fills remain outside the model.
7. Do not promise a guaranteed liquidation price, trading recommendation, risk-free account or predicted funding return.

Impact: helps the trader decide what to inspect next after an order and gives a practical reason to return to the product.

### 2.4 Technical scope

- Adapter work: `execution.ts`, delegated inspection in `operations.ts`, verified market/receipt readers and new normalized result types.
- UI work: `Executions.tsx`, delegated journal links in `Operations.tsx`, activity/history links, result components and Risk Lab navigation.
- Keep existing direct and operation send boundaries, permission checks, chain/genesis verification, wallet review, exact amount handling and compatibility with saved records.
- Keep SDK 0.32.1 unless an evidenced blocker requires a separately reviewed upgrade. Recheck installed declarations and official interfaces for every new call. No invented SDK wrappers and no new contracts.
- Keep requests bounded, abort stale navigation reads and expose RPC/indexer limitations. Public report links do not require a new backend in the initial design.

### Part 2 completion gate

- Direct and delegated placement/cancel/reduce evidence renders consistently for supported operations.
- A new browser opens a known supported transaction URL with no wallet and no local journal, and can verify/export its result.
- Receipt success, resting state, fills and position observations are never conflated.
- Unsupported transactions and incomplete evidence remain explicit; inspection cannot enable a write.
- The same result leads to the correct account's position/risk view without changing signing authority.
- Existing write safety, replacement/recovery and migration regression tests pass.

## Part 3 — Prove user value, prepare both tracks and deliver an accessible submission

Priority: HIGH for eligibility, real evidence and submission; MEDIUM for feedback refinement, communication and growth validation. Suggested effort: final two to three working days with a submission buffer.

### 3.1 Validate differentiation with three real users

1. Recruit three relevant traders/builders; seek permission before recording. Do not substitute agent opinions for human testing.
2. Give each the same evidence-backed tasks: identify the trading account, determine an order's true outcome and remainder, and explain resulting exposure/one hypothetical shock.
3. Compare PEI with the official app plus explorer. Alternate task order to reduce learning bias. Use the same account/transactions and record source times.
4. Measure correctness, completion time, needed assistance and confidence. Ask whether they would return and in what situation.
5. Proposed target: at least two of three identify the order outcome and remainder unaided within one minute after opening the report. This is an acceptance target, not a measured claim or market validation.
6. Fix observed confusion and retest the affected flow. If the official app answers equally well, strengthen evidence explanation and reduce steps; do not add unrelated features to conceal weak value.

Impact: replaces opinion with small, candid usability evidence and gives judges a concrete reason for the product to exist.

### 3.2 Prepare credible feedback submissions

1. Re-run the existing reproduction script and compare current official guidance with the exact installed SDK version.
2. Prioritize the funding-documentation mismatch if still reproducible. Describe the actual confusion, expected wording, observed declaration/docs and impact.
3. Keep the delegated wrapper item accurately framed as a typed convenience request. Contract-level delegated trading exists; do not report it as a missing protocol capability.
4. Review new Test Lab failures independently. PEI UI bugs are fixed here; expected restrictions and service failures are not automatically upstream bugs.
5. Put each reproducible, non-sensitive upstream report in its own `feedback/` Markdown file with the required title, severity, area, steps, expected, actual, evidence and environment.
6. Include minimal reproduction, pinned SDK, network, public wallet where needed, timestamps and real request/response or transaction evidence. Remove unrelated or sensitive details.
7. Mark status accurately: draft, reproduced, submitted, accepted, duplicate or rejected. Only organizer confirmation establishes acceptance and payment.
8. Keep possible security vulnerabilities out of public folders. Prepare private disclosure to `security@dreamdex.io` only if a finding is validated; sending requires explicit authorization.

Impact: maximizes report credibility and reduces rejection for duplicates, inflated severity or misleading missing-feature claims. It does not guarantee any paid report.

### 3.3 Build the MVP evidence and presentation package

1. Reconcile the feature audit and test counts against the final release. Distinguish shipped/tested, live-read verified, simulated, real-wallet verified and unsupported.
2. Prepare a clean GitHub source repository with reproducible setup, pinned dependencies, README, tests, license choice and documented limits. Exclude secrets, browser artifacts and local-only user notes.
3. Include actual PEI attempt evidence and canonical transaction links. A successful resting order is validly described as such; stronger fill/position evidence is included only if observed. No transaction originating elsewhere is relabeled as a PEI order.
4. Produce a judge-accessible demo or recording. Test access from a fresh signed-out browser; the current private owner session is insufficient proof of accessibility.
5. Create a roughly three-minute demo: user confusion/problem, correct account and readiness, actual order evidence, unified outcome, resulting exposure/risk and independent share link. Clearly label any replay of an earlier real run.
6. Lead README and pitch with the trader's problem and a verified before/after example. Keep one primary story and move technical detail below the proof.
7. Prepare two or three accurate X posts tagging `@DreamDEXSomnia`: account/setup lesson, verified execution walkthrough and optional risk/report lesson. Add real public URLs only after publication.
8. Check all links, source instructions, exports and evidence against the same final deployed revision.
9. Maintain a submission checklist with exact deadline, whitelist, repo, accessible demo, real orders, README and post URLs. Submit with buffer rather than using the entire extension for development.

Impact: judges can understand, run and verify the entry quickly. This directly addresses the supplied evaluation criteria for user value, technical execution, build evidence and communication.

### 3.4 Business, growth and post-bounty direction

1. Position the product for execution troubleshooting and evidence sharing. Treat repeat use after uncertain trades as the initial retention hypothesis.
2. Use copyable report links and useful technical posts as distribution. Do not add referral spam, invented testimonials, vanity statistics or token incentives.
3. Keep initial access simple. Investigate whether active traders, bot builders or support teams repeatedly need reports before adding paid features.
4. Record return-use intent and voluntary follow-up use without claiming a three-person test proves product-market fit. Any future analytics need an explicit privacy design.
5. Keep AI agents, additional chains, monetization and cosmetic overhaul in a documented deferred list. The recommendation to defer them is intentional and remains included in this plan.
6. Treat Somnia Reactivity/Agents as optional future experiments with a measurable job, such as reliable outcome notifications, only after verifying support and actual user demand. They are not required to strengthen the current evidence loop.
7. If selected for an MVP award, track the separate mainnet milestone from the actual launch date. Reverify contracts, SDK, funding and risk before a separately authorized mainnet release. Never reuse testnet assumptions automatically.

### Part 3 completion gate

- Three-user comparison is completed or honestly marked unperformed; actual findings inform fixes.
- Candidate feedback reproduces and uses defensible severity; no acceptance or payout is invented.
- README, repo, demo, final evidence and two or three published post links are consistent and accessible.
- Whitelist and exact deadline are confirmed before calling the entry submission-ready.
- Only user-authorized external publishing/submission is performed. A prepared draft is not a submitted Build.
- No promise of winning, payment or complete freedom from bugs.

## Detailed test scenarios for the three parts

Each run records scenario ID, build/SDK, browser, network, signer and trading account, exact steps/inputs, expected/actual, snapshot block/time, hash or explicitly none, screenshot/export and result. Test fixtures remain clearly synthetic and never become submission trading evidence.

### T01 — Wallet and correct account, Part 1, no signature

1. Open a fresh session and click the header wallet control.
2. Choose the intended extension and connect its public account.
3. Select a discovered account or manually enter the funded trading address.
4. Check signer/gas and trading margin separately; open all account pages.
5. Reload and reconnect the same signer.

Expected: every page uses the selected trading account; no automatic transaction; public selection returns without inventing authorization. Save identity and Overview screenshots.

### T02 — Missing provider and failed discovery, Part 1, no signature

1. Open a browser without an extension and inspect a public address.
2. In a controlled test, simulate discovery empty, timeout and service failure.
3. Use the manual fallback and refresh permissions.

Expected: useful next steps, no endless spinner, no false claim that no accounts exist, and no blocked public reading merely because a wallet is absent.

### T03 — Identity and permission changes, Part 1, no transaction required

1. Prepare an order review without signing.
2. Change signer, chain, selected owner and quantity separately.
3. Test revoked permission using a fixture rather than revoking a live account unnecessarily.
4. Inspect another public account and return deliberately.

Expected: each old review is invalid; read-only inspection cannot sign; a fresh check is mandatory.

### T04 — Page layout and scrolling, Part 1

1. Visit every route at 320, 390, 768 and 1440 pixel widths.
2. Test keyboard/zoom, long values, loading, empty and failed states.
3. Scroll down, navigate away, use Back and reload a detail URL.
4. Open/close wallet and navigation dialogs.

Expected: reachable controls, contained tables, no clipped cards, appropriate focus and restored Back position. Save screenshots of each defect before and after fixing it.

### T05 — Test notes preservation, Part 1

1. Export the user's existing report before migration.
2. Load older notes, add a new note, reload and reopen a session.
3. Import an overlapping report and review conflicts.
4. Filter failures and export; test malformed JSON and unavailable storage.

Expected: no silent overwrite/loss, all cases exported, invalid files rejected clearly and notes never promoted to verified passes.

### T06 — Balances, positions and unavailable data, Part 1

1. Compare Overview and Positions for the same account and compatible snapshot times.
2. Record gas, tokens, equity, collateral, voucher floor, open positions and pending orders separately.
3. Test a genuinely empty account and controlled RPC failure/partial pool coverage.

Expected: observed zeros remain distinguishable from unavailable data; no position is invented or hidden solely by a failed aggregate read.

### T07 — Fresh preflight and wallet rejection, Parts 1–2

1. Enter terms using current market tick, lot and minimums.
2. Test invalid precision and an insufficient gas budget without signing.
3. Check valid terms and deliberately reject the wallet prompt.
4. Inspect the journal and result state.

Expected: actionable errors, no fabricated transaction hash, no on-chain revert label for wallet rejection and no automatic retry.

### T08 — Real linked-operator order, Parts 1–2, user signs

1. Inspect existing U10 evidence first; reuse it when it qualifies.
2. If necessary, choose a deliberately accepted small post-only order using live rules and account permission.
3. Run fresh preflight; review owner, signer, pool, terms, gas and expiry; user confirms in wallet.
4. Save hash immediately; inspect the canonical receipt and order state.
5. Record later fills or continued resting state separately and export.

Expected: real evidence, accurate stage/outcome and no presumption that post-only placement fills. If the outcome is uncertain, recover it before considering another order.

### T09 — Direct/delegated diagnostic parity, Part 2

1. Use controlled fixtures for supported direct and delegated operations.
2. Cover no fill, partial/full fill, reverted, pending, replacement and unsupported call cases.
3. Compare the common result fields and human-readable explanation.

Expected: consistent semantics and precise provenance. Fixture passes do not substitute for T08.

### T10 — Remainder cancellation/reduction and races, Part 2

1. Locate a real remaining order, or mark the live case SKIPPED with the reason.
2. Review the permitted cancel/reduce action; the user signs any live action.
3. Inspect its distinct receipt and refresh pending orders and positions.
4. Use fixtures for fill-before-cancel and already-removed orders.

Expected: no claim that cancellation closes a filled position; race outcomes follow actual evidence; reductions show their actual semantics.

### T11 — Independent hash inspection, Part 2, no signature

1. Copy a supported result link and open it in a new browser with no local journal.
2. Verify owner, actor, pool, hash, block, outcome and amounts against chain sources.
3. Export evidence without connecting a wallet.
4. Repeat for a transaction created outside PEI.

Expected: independent verification works; external activity is never claimed as PEI-created.

### T12 — Hostile or incomplete inspection inputs, Part 2

1. Test malformed and unknown hashes, unsupported destinations/selectors and misleading URL owner fields.
2. Simulate duplicate/unrelated logs, noncanonical receipts and unavailable historical reads.
3. Delay the indexer while keeping receipt evidence available.

Expected: no false fill, identity inference or canonical success; available verified facts survive with explicit limitations; no write authority changes.

### T13 — Recovery and data compatibility, Part 2

1. Load old direct and operation journal records and navigate their links.
2. Reload a pending attempt, test matching recovery and an unrelated candidate hash.
3. Exercise original/replacement nonce and calldata checks and cross-tab duplicate guards.

Expected: strict recovery stays intact; independent inspection cannot unlock unresolved attempts; old evidence remains readable.

### T14 — Contextual risk, Part 2, no signature

1. Open Risk Lab from a result and verify the selected account/pool.
2. Apply 0%, +10% and -10% scenarios to a frozen, reconciled baseline.
3. Test long/short direction, per-market overrides, flat accounts and incomplete inputs.
4. Enter invalid input, refresh live data, then explicitly reset the baseline.

Expected: 0% reconciles; direction is correct with other inputs frozen; polling does not move the baseline; invalid/incomplete results cannot masquerade as current complete exports.

### T15 — Human comparison, Part 3

1. Run the same three tasks with three relevant users.
2. Compare official app/explorer and PEI with balanced ordering.
3. Record accuracy, time, assistance, confusion and intended reuse.
4. Fix and retest the most serious observed obstacle.

Expected: an honest comparison, including unfavorable results. Report target achievement only if measured.

### T16 — Feedback reproduction, Part 3

1. Run each candidate's minimal reproduction on its stated SDK version.
2. Compare current official guidance and capture exact expected/actual evidence.
3. Check local defect versus upstream defect versus documented behavior.
4. Verify report completeness, proportional severity and disclosure channel.

Expected: reproducible reports or explicit withdrawal/downgrade; no invented security or missing-feature claims.

### T17 — Fresh reviewer submission walkthrough, Part 3

1. Use a signed-out browser for demo, repository, explorer and X links.
2. Follow clean setup instructions and replay the evidence walkthrough.
3. Check the final deployed revision, docs, exported evidence and stated feature limits agree.
4. Verify whitelist/cutoff and save actual submission confirmation only after submission.

Expected: a reviewer can access and understand the work; private/inaccessible URLs are caught before submission.

## Coverage map: every recommendation has a destination

| Recommendation or concern | Priority | Delivery |
|---|---|---|
| Check existing U10 before another trade; collect real proof | High | 1.1, 1.5, T08 |
| Preserve and investigate the user's Test Lab work | High | 1.1, 1.4, T05 |
| Improve the global wallet button and account onboarding | High | 1.2, T01–T03 |
| Correct account balances and positions; honest unavailable states | High | 1.2–1.3, T06 |
| Fix page boxes, mobile alignment, navigation and scrolling | High | 1.3, T04 |
| Retain all existing manual/advanced features | High | 1.2–1.4, 2.4 |
| Unified direct/linked execution diagnostics | High | 2.1, T09–T10 |
| Judge verification without sender local storage | High | 2.2, T11–T13 |
| Receipt proof, resting/fill distinction and position context | High | 2.1–2.2, T08–T12 |
| Contextual risk and useful explanations | Medium | 2.3, T14 |
| Compare against official app/explorer with three users | High | 3.1, T15 |
| Fix weak differentiation rather than add features | High | Product decision, 3.1 |
| Honest documentation feedback and wrapper request | Medium | 3.2, T16 |
| Protect security disclosures and avoid inflated claims | High | 3.2 |
| Confirm whitelist and exact extended cutoff early | High | 1.5, 3.3 |
| Accessible repo/demo, verified hashes, clean README | High | 3.3, T17 |
| Two or three genuine X posts | High | 3.3 |
| Practical repeat-use loop and evidence-link distribution | Medium | Product decision, 3.4 |
| Business hypothesis and retention validation | Medium | 3.1, 3.4 |
| Defer AI, chains, monetization and cosmetic overhaul | Low/deferred | 3.4 |
| Treat Somnia primitives as optional, value-led work | Low/deferred | 3.4 |
| Mainnet award milestone tracked separately | Later/conditional | 3.4 |
| Prevent judge rejection for evidence/access/eligibility gaps | High | 1.5, 2.2, 3.3 |
| Prevent churn from confusing setup, fragmented flow, lost evidence | High | Parts 1–2, validated in 3.1 |
| Preserve a submission buffer during the extension | High | Schedule below |

## Execution schedule and ownership

- Work in order: Part 1, then Part 2, then Part 3. Start deadline/whitelist checks and existing-evidence collection during Part 1 so they do not become last-day blockers.
- Suggested allocation within eight remaining working days if still available: days 1–2 Part 1; days 3–4 core Part 2; day 5 risk integration and human testing; days 6–7 feedback, final fixes and presentation; day 8 submission buffer. The live deadline overrides this illustrative allocation.
- At each part, run appropriate adapter/browser tests, lint, typecheck/build and a focused visual regression check. Run the full relevant regression suite for release. Never substitute test counts for verifying the actual changed behavior.
- Engineering can prepare code, tests, reports, evidence validation and publication-ready artifacts. The user supplies browser-local notes where unavailable, chooses and signs real orders, confirms whitelist, and authorizes external posting/submission and any hosting access change.
- Required user actions remain visibly pending rather than being marked complete. Independent code work continues where possible.
- Each part ends with changed behavior, test results, unresolved limits, user testing steps and a feature-preservation check. Any new security finding follows private disclosure rather than the public demo workflow.

## Sources and related files

- [Official Perps testnet developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet)
- [Official Link a Bot guide](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot)
- [Bounty listing](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail), supplemented by the user's rules and extension screenshot.
- Existing plans: `BOUNTY_PRIORITY_PLAN.md`, `ACCOUNT_UX_IMPROVEMENT_PLAN.md`, `ACCOUNT_UX_TESTING_REFERENCE.md`, `SUBMISSION_CHECKLIST.md`.
- This plan supersedes stale pending-feature/deadline assumptions in earlier planning documents; historical evidence remains historical.
