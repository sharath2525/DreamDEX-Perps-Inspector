# Product direction after the three-part improvement

Primary user: a trader or bot builder who cannot tell whether an order was sent from the right account, filled, partially filled, remained resting, or failed. The product's job is to make that answer inspectable and shareable. A second use is helping a support engineer review public transaction evidence without wallet access.

## Decisions and expected impact

| Priority | Decision | Why / expected impact | Evidence needed |
|---|---|---|---|
| High | Keep signer and trading account distinct across pages | Prevent misleading zero-balance views and wrong-account trading | Account task accuracy; existing live account probes |
| High | Put receipt, remaining order and exposure in one report | Reduce time spent reconciling explorer/app/journal views | Three-person task times and correctness, not assumed superiority |
| High | Share independent chain/hash links | Let a reviewer reproduce public facts; shorten support explanations | Fresh-profile access and verified source transaction |
| High | Keep real transaction and local attempt provenance separate | Avoid judge rejection for fabricated execution proof | Original PEI journal + canonical receipt + dated walkthrough |
| High | Prioritize remaining submission gates over more screens | A polished private demo without real orders/posts/whitelist can still fail | Exact cutoff, whitelist, repo, accessible demo, real links |
| Medium | Focus risk on the just-inspected market | Make risk useful after an execution instead of an isolated calculator | Correct explanation of +/- shocks and model limits |
| Medium | Preserve exportable local evidence and notes | Give repeat-use value without collecting private sessions | Voluntary return usage after another uncertain trade |
| Medium | Publish useful technical explanations after approval | Report links and honest findings can reach bot builders/support users | Real post links and qualitative useful replies, no vanity metrics |

Retention hypothesis: users return after uncertain trades, when switching linked accounts, or when explaining an execution to support. This is unvalidated. Ask participants what triggered a return; record actual voluntary reuse separately from “would use” answers. Three people are a usability check, not product-market fit.

Business hypothesis: active bot builders or support teams may value repeatable reports. Keep initial use simple and evaluate recurring need before pricing, subscriptions or paid APIs. Do not invent revenue, market size, testimonials or user counts. Any analytics proposal needs explicit privacy/consent and retention design first; no tracking was added.

Intentionally deferred: AI agents, more chains, token/referral incentives, monetization and another cosmetic overhaul. These recommendations are included by deliberately NOT building them now. Somnia Reactivity/Agents could later support reliable outcome notifications only after confirming API support and demand; they are not claimed as current integrations.

Mainnet award milestone: if selected, record the actual Perps mainnet launch date, calculate the organizer's 30-day deadline, reverify SDK/network/contracts, and obtain separate authorization for real-value funding and signing. The current application remains testnet-only. No mainnet payment or $200 milestone completion is claimed.

Likely rejection reasons still to eliminate: no verified PEI-origin order, private/inaccessible demo, missing repo/posts, unconfirmed whitelist/cutoff, inflated feature/feedback claims, or inability to explain the advantage over official tools. Likely user-churn reasons: wrong owner selected, unexplained unsupported transaction, confusing raw units, stale/unavailable data presented as facts, lost notes, and slow reads. The first two parts address these paths, while the real-user comparison must show whether the improvement actually helps.
