# Feedback review — rechecked 7 November 2026 IST

Two reports are prepared under `feedback/`: a documentation inconsistency and a typed delegated-wrapper feature request. Both are UNSENT with proposed normal severity. No security vulnerability was validated. No award, novelty or organizer acceptance is claimed.

| Candidate | Evidence and verdict |
|---|---|
| Deposit-first SDK comments versus owner auto-pull guide | Reproduced in pinned package declarations; report 001. Documentation inconsistency, no live transfer claim. |
| Typed delegated Perps wrappers | Declaration inspection confirms the narrower convenience surface; report 002 is a feature request. Official raw ABI route already exists. |
| Misleading genesis transport error | Controlled SDK helper test reproduced generic top-level wording, but original cause is retained and retired-chain errors are distinct. Already documented; no separate bug report prepared. |
| Native stops absent | Rejected: owner stop APIs exist. |
| No positions/margin/funding analytics | Rejected: APIs exist and live reads passed. |
| Streaming timeouts / explorer availability | Environment and root cause unresolved; do not submit as confirmed protocol defects. |
| Different live OI parameters | Mutable state is not itself a defect; no report. |

`node scripts/reproduce-feedback.mjs` performs offline controlled testing against the actual pinned SDK module and parses its declarations. It writes `docs/research/feedback-reproduction.json`; controlled block hashes and transport errors are clearly labelled synthetic. It never opens a wallet or broadcasts.

Public duplicate check: the bot-kit open-issue listing was inspected. SDK issue access and the private bounty inbox were not available. Therefore duplicate status remains unknown. Official bounty page still returns HTTP 405 to the research browser; the user has not obtained current submission/whitelist confirmation.

Security findings, if any later arise, must remain out of the public feedback directory and use the authorized private disclosure process. Nothing here is a security finding.
