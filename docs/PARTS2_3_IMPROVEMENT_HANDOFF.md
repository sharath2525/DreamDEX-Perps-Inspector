# Parts 2 and 3 improvement handoff

Prepared 7 November 2026. This is the improvement plan's Parts 2–3, not the earlier foundation build phases with similar names.

Release preparation continued on 8 November 2026 IST. A clean copy of the source installed the pinned dependencies with `npm ci --ignore-scripts --offline` and passed `npm run build` including app, adapter and test TypeScript checks. The offline package audit is not presented as a fresh online vulnerability assessment. The existing large SDK/app chunk warning remains a performance limitation.

## Part 2 — delivered code

- `packages/perps-adapter/src/report.ts`: read-only normalized report for single direct/delegated place, cancel and reduce transactions; verified chain/genesis/system, registered pool, decoded intent, canonical receipt and final block recheck.
- `TransactionReport.tsx`: human-unit receipt fills, owner/actor, current remainder, gas, block-level position/margin context, source times, technical details, JSON/Markdown and independent chain/hash URLs. Conflicting fill attribution is withheld.
- Existing direct and delegated journal pages reuse the report. Original recovery, replacement, identity, nonce/calldata checks and send locks remain separate. Non-trading account operations keep their own receipt evidence.
- History and combined local activity link to independent inspection while retaining original record links.
- Result links select the correct public owner and risk pool read-only; no signing authority is inferred.
- Risk Lab adds focused market presets, explains equity/headroom/concentration, and preserves custom/uniform controls, exact baseline reconciliation, withholding, frozen state and explicit reset.
- Existing manual tools, Test Lab backups and old journal schemas are preserved. No contract, SDK upgrade, new dependency, wallet key handling or automatic transaction was added.

## Evidence and limits

The final build/test result is recorded in `research/parts2-3-improvements-verification.json` when release validation finishes. Seventeen new deterministic report checks cover direct/delegated calls, duplicate/foreign/conflicting events, partial/full/no fills, pending/missing/reverted, unsupported inputs, canonical mismatch, missing archive state, read-only risk navigation, lock preservation and narrow layout. These are synthetic fixtures.

The real public-history probe on 7 November returned four indexed order rows for the supplied trading account and inspected three distinct placement hashes. All three used unsupported calldata, so the result is honestly **INCONCLUSIVE** for supported live report acceptance; see `research/part2-public-report-live.json`. They are not claimed as PEI-origin orders. The app continues to show the supported-scope limit instead of inventing a decoded result. Supply the existing U10/PEI export and hash before deciding whether another signed demonstration is needed.

Official developer and Link a Bot documentation were rechecked on 7 November: chain 50383, pinned app SDK 0.32.1, separate linked operator and receiving owner, and place/cancel/reduce permission model. The independent report uses bounded HTTP reads and a 40-second overall timeout. It does not require an indexer; original diagnostics retain separate indexer reconciliation/replacement analysis. Archive failure preserves receipt facts with missing context explicitly labelled. Chain data alone cannot establish frontend provenance.

The official explorer base is verified from developer documentation. Automated web access to the sampled transaction page was unavailable; signed-out explorer/page access remains a manual check, not a claimed pass. Current order storage can be expired; no executable liquidity or later-fill total is inferred.

## Part 3 — prepared deliverables and genuine external gates

| Plan recommendation | Deliverable / status |
|---|---|
| Three actual users; balanced comparison, correctness/time/assistance/confidence | `PART3_USER_STUDY.md`; UNPERFORMED until real participants are available |
| Fix findings and retest; challenge differentiation | Study rubric and failure/retest record; no fabricated user findings |
| Reproduce both feedback candidates | `scripts/reproduce-feedback.mjs`, current `research/feedback-reproduction.json`; reproduced locally, UNSENT |
| Accurately distinguish app bugs, documented limits and upstream reports | Feedback files and triage preserve proposed normal severity; raw delegation exists |
| Review user's new Test Lab failures | Notes remain local; exported report has not yet been supplied |
| Security handling | No validated vulnerability; any future disclosure private, never public feedback by default |
| Clean source/setup/pins and license choice | `scripts/package-submission.mjs`, `SOURCE_RELEASE.md`; reviewable source archive; owner license/repository choice pending |
| Real application order evidence | UNVERIFIED; independent history is not proof of PEI origin |
| Judge-accessible demo/recording, same-revision evidence | Private hosting retained; script/checklist prepared, fresh reviewer access and real recording pending |
| Three-minute primary story and honest X posts | `DEMO_SCRIPT.md`, `SUBMISSION_DRAFT.md`; drafts only, no fake public links |
| Whitelist/exact extended cutoff and submission buffer | Extension screenshot acknowledged; exact UTC cutoff/whitelist remain unconfirmed |
| Repeat-use hypothesis, business and useful distribution | `PRODUCT_VALIDATION_AND_NEXT.md`; hypotheses clearly unmeasured |
| Defer AI/more chains/monetization; optional Somnia primitives | Documented intentional deferral, not omitted promises |
| Conditional mainnet milestone | Track actual launch +30 days only if selected; separate verification and authorization required |

## What this solves

1. A linked operator now gets the same readable execution explanation as a direct wallet.
2. A reviewer can inspect supported chain/hash evidence without your browser's journal or wallet, subject to hosting access.
3. Users see the difference between mined, filled, remaining and current exposure instead of treating every successful transaction as a fill.
4. Risk follows the receiving account and selected market with human explanations and no automatic trading.
5. Submission work is organized around verifiable proof, accurate feedback and access, with every unperformed human/external gate visible.

Use `PARTS2_3_TESTING_GUIDE.md` for numbered scenarios. Do not call the bounty entry submitted, accepted, paid, public or fully human-validated until those actual events occur.
