# Part 8 — history and Developer Test Lab

Implemented 4 November 2026. History uses pinned SDK 0.32.1 `listPerpOrderHistory`, `getUserFillsPage` (PERP only), `getFundingPayments` and `getMarginEvents`. Each request verifies chain/genesis/system configuration and indexer binding. Pages contain at most 50 rows, with a maximum of ten pages. Fill dataset changes and conflicting duplicate records require a restart. Exact duplicate identities are displayed once. Offset pagination cannot guarantee a stable snapshot or restore skipped records; the UI and exports disclose this.

Pool and UTC date filters apply to loaded records. CSV cells escape formula prefixes, quotes and line breaks. JSON/Markdown include scope, filters, observed time, RPC head, processed watermark, dataset generation and coverage. Order hashes identify placement. Funding positive means paid. No lifetime PnL, fill proof or successful batch outcome is inferred from these rows.

The Developer Test Lab runs a cancellable two-minute read-only suite: deployment, account/SDK baseline reconstruction, and one page of each history category. Reports distinguish PASS, FAIL, BLOCKED, NOT RUN and INCONCLUSIVE. Controlled transaction cases are explicitly opted into and route through the existing Trade/Execution Inspector/Positions workflow, including per-order notional and gas review. They do not run automatically or bypass signing gates.

Validation: production build/typecheck passed; 11 focused Playwright tests passed (history overlap/conflicts, CSV injection, history pagination/filter/download, failed diagnostic reads, and foundation/responsive regressions). Live public reads passed: 100 orders, 100 fills, one funding settlement and 100 margin records. See [part8-live.json](research/part8-live.json); these are observations of a public sample, not our signed transactions.

Review: History → public account → record type → load older → filter → CSV/report download. Developer Test Lab → select account → run → inspect individual statuses → export. Wallet lifecycle acceptance remains blocked by the user's wallet readiness.
