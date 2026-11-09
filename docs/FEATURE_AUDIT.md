# Implemented feature audit — Parts 1–9 code

Historical audit dated 4 November 2026 IST. Current improvements and acceptance status are in [PARTS2_3_IMPROVEMENT_HANDOFF.md](PARTS2_3_IMPROVEMENT_HANDOFF.md). Earlier evidence is in [PARTS6_7_HANDOFF.md](PARTS6_7_HANDOFF.md) and the public probes. This audits the application, not whether an SDK feature exists. Real PEI-origin signing evidence still requires verification.

| Feature | Current application status | Evidence / limit |
|---|---|---|
| Responsive shell, navigation, themes | Implemented | Chromium keyboard, mobile/desktop and storage checks |
| Chain/genesis/system gate | Implemented | Live read plus controlled mismatch tests |
| Factory-verified markets/search | Implemented | 21 observed pools, verified dynamically |
| Selected prices, funding, book, risk rules | Implemented | Live SOL read; invalid mark stays unavailable |
| Independent indexer lag | Implemented | Latest HTTP head compared after indexer response |
| Streaming order book | Not implemented | Explicit HTTP polling; WS connectivity probe only |
| Public account lookup | Implemented | Empty and non-empty public accounts verified |
| Optional browser wallet | Implemented; real extension session unverified | Simulated EIP-1193 account/chain/disconnect tests; no signatures |
| Shared margin, voucher, funds, health | Implemented | Live public data; failing health does not hide positions |
| Position coverage/analytics | Implemented with explicit bounds | Six live positions; exact equity reconstruction; unknown rows retained |
| Pending order reads | Implemented with explicit bounds | 179 observed public orders across 21 enumerated pools |
| Direct EOA owner authorization | Implemented | Wallet accounts/chain/genesis, matching owner, EOA code check and explicit confirmation |
| Linked operator | Code implemented; live acceptance BLOCKED | Distinct EOA actor, per-pool selectors, fresh revocation checks, post-only place/cancel/reduce; no withdrawal/owner-stop capability |
| Smart-account signing / main-wallet funding management | Not implemented | Receiving owner may be an authorized app account in operator mode; direct signing requires EOA |
| Order composer/preflight | Implemented | Exact precision 6–24 tests; live SDK sizing/margin/build/simulation checked |
| Signing, placement, cancellation | Code implemented; live acceptance BLOCKED | Synthetic wallet/receipt tests passed; no real user-signed transaction |
| Basic execution diagnostics | Implemented | Hash persistence, matching receipt, fill decoder, latest remainder, block-level position comparison |
| Diagnostics, timeline, JSON/Markdown exports | Implemented | Sanitized allowlist, exact amounts, receipt/indexer distinction, before/after block observations, approximate read-only revert replay |
| Replacement handling | Implemented with explicit limits | User-supplied candidate; verifies original RPC-observed nonce, sender, chain and canonical receipt; unknown original stays unresolved |
| Risk simulations | Implemented | Exact six-position live baseline; uniform/custom frozen price shocks, concentration and headroom; incomplete totals withheld |
| Hypothetical order / future funding scenarios | Optional, not implemented | Current accrued funding is included once; future funding and order fills are explicitly excluded |
| History/Developer Test Lab UI | Implemented | Four live history sources, bounded pagination/deduplication, coverage, CSV/report exports and read-only diagnostic runner |
| Voucher / margin / exact bank approvals | Code implemented; live acceptance BLOCKED | Eligibility, amount-limited separate approvals, no implicit SDK approval, floor/withdrawable checks and simulation |
| Native owner stops | Code implemented; live acceptance BLOCKED | Verified factory registry/payment/permission, fixed-size reduce-only LIMIT single/paired creation, live-ID cancellation and refund claim |
| Mainnet, public deployment, bounty submission | Not performed | No live-order evidence for the bounty yet |

Test fixtures are synthetic and isolated under `tests/`; live evidence is stored separately under `docs/research/`. The application has no mock-data fallback.
