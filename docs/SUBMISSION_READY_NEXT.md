# Submission preparation handoff — 5 November 2026 IST

Completed: MVP narrative, honest X drafts, three-minute demo script, two local feedback reports, offline reproduction script/results, source-package generator. Application verification remains 62 passing tests from the release; only scripts/docs changed during this preparation.

## User-dependent steps

1. **Wallet**: user now reports readiness. Actual public signer, receiving owner and funding category have been requested. The hosted app's Positions route loads but the Codex in-app browser has no wallet provider; open it in the wallet extension's browser and connect read-only. No transaction can be prepared responsibly until actor/account/funding and the order budget are established. No private key is needed in chat.
2. **GitHub**: connector profile is available, but no project repository was found and the connector exposes no create-repository operation. Browser creation at `https://github.com/new` requires user sign-in. Source package is ready for review/upload; an actual repository URL is not invented.
3. **Organizer**: user says current eligibility/whitelist is not confirmed. Supplied deadline has passed; official page returned HTTP 405. Confirm continued acceptance and accepted network before submitting.
4. **Publication**: the demo is owner-private, not judge-accessible. Public demo access, actual X posts and submission are still outstanding. Drafts are not sent communications.

## Organizer message — draft only, not sent

I built Perps Execution Inspector, a dreamDEX Perps trader tool with execution diagnostics and risk analysis. Are MVP and Feedback submissions still being accepted, and is feedback budget available? Please confirm whether my DoraHacks email can be whitelisted. The developer guide currently specifies Hideki chain 50383 while the bounty announcement calls it Tokyo; please confirm the accepted deployment. I have two proposed normal-severity reports (a documentation inconsistency and an SDK convenience feature request), neither submitted or accepted yet.

## Evidence status

Feedback report 001 reproduces a documentation inconsistency; report 002 reproduces an SDK surface gap and is explicitly a feature request. Neither proves a runtime protocol bug or vulnerability. The controlled genesis-error experiment retained the original cause and used a different error for a retired chain, so the stronger issue claim was dropped. Private duplicate/acceptance checks remain with the organizers.

Review [feedback triage](FEEDBACK_TRIAGE.md), [demo script](DEMO_SCRIPT.md), [MVP draft](SUBMISSION_DRAFT.md) and [checklist](SUBMISSION_CHECKLIST.md). The source archive has no credentials, build outputs, node_modules or hosting identity by design; pattern scanning is not a comprehensive secret audit.
