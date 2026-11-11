# Guided execution and evidence-backed diagnostics

Updated 10 November 2026 (Asia/Calcutta). Start at **Trade** in the sidebar. The redundant `/guide` landing page now redirects there. Markets is a Trade tab; History is an Execution Inspector tab; Risk Lab is a Positions tab.

## What changed

- Trade opens the order form; Execution Inspector accepts an existing transaction hash without requiring a wallet.
- A compact current-step label appears during trading and receipt inspection. Expand “How this step works” for the full sequence. It indicates the current task, not certification that previous tasks passed.
- Diagnostics distinguish local validation, unsigned preflight and submission errors. Error wording supplies a **possible explanation**, never a proven root cause.
- Mined reports summarize **Observed**, **Unknown** and **Next safe step** for fills, partial fills, remaining orders, cancellation/reduction, reverts and unresolved evidence.
- Positions and Risk Lab preserve a public case hash in the URL so users can return to the same report and export.
- Concise JSON/Markdown case summaries are allowlisted separately from full reports. Diagnostic exports omit raw provider errors and private notes.
- Preflight errors and latest wallet-attempt panels are scoped to the exact input/account context. Superseded operation reads are aborted; an old error cannot explain a new draft. Operation receipt details are withheld when the edited recovery hash no longer matches the verified hash.

The existing journals, manual account selection, permissions, transaction checks and user test notes remain intact. No new smart contracts, SDK methods, dependency packages or automatic writes were introduced.

## Scenario 1 — Find the right starting point

1. Open Trade without connecting a wallet.
2. Confirm the current step is **Choose account**.
3. Choose **Execution Inspector** in the sidebar to inspect a real existing hash without wallet access.
4. Return to Trade and connect your wallet using the header. Expand Manage account if you need setup details.
5. An eligible single linked account loads automatically; choose explicitly when several accounts exist. Enter its public address once if index coverage is incomplete. See [account connection](ACCOUNT_CONNECTION.md) for exact conditions and tests.
6. Expected: signer and trading account remain distinct; account snapshot is labelled by block. Selecting an account is not order approval.

## Scenario 2 — Correct invalid input

1. Open **Trade** directly.
2. Select a market and inspect its decimals, tick, lot and minimum.
3. Enter a quantity exceeding the supported precision.
4. Expected: local validation blocks preflight and signing. The diagnostic must say local validation failed, not that a transaction reverted.
5. Correct the quantity. Expected: the obsolete diagnosis disappears; no silent rounding occurs.

## Scenario 3 — Investigate a preflight blocker

1. With your own authorized testnet account, compose an order and run the unsigned check.
2. If a real margin, permission, gas or connection blocker occurs, inspect the diagnosis and technical details.
3. Expected: **Observed** explains that the check stopped; **Possible explanation** explicitly remains an inference; **Next check** offers a relevant read-only route.
4. Expand **Export this diagnostic** and download it.
5. Expected: fixed explanatory fields, stage and timestamp; no raw provider error, keys, signature or private notes. It is not automatically a bounty finding.
6. Change the draft or account. Expected: the old diagnosis no longer appears as the current result.

## Scenario 4 — Place and verify a real order

1. Verify the intended funded testnet account and signer gas. Use only funding allowed under your Arena/bounty account category.
2. Choose exact order terms and a gas budget you accept. No example price is a live quote.
3. Run fresh preflight and review the actual call, amounts, funding and gas.
4. Explicitly confirm in the application, then review and sign in the wallet yourself.
5. Direct orders: choose **Inspect this attempt**. Linked operations: choose **Verify this operation**, then **Verify actual receipt** in its original journal.
6. Expected: returned hash, canonical receipt and matching events establish separate facts. A hash is not a fill. Unknown submissions must be recovered through the original journal, not blindly resent.
7. If an unwanted remainder exists, cancellation requires its own fresh review and signature. A fill can happen before cancellation.

## Scenario 5 — Interpret the result

1. Inspect a supported transaction.
2. Read the case explanation before the raw metrics.
3. Expected for a fill: matching events are observed; later activity is not inferred.
4. Expected for a resting remainder: its current storage is observed; the report does not guess why it did not fill or whether it remains executable.
5. Expected for a revert: the receipt is observed; its root cause is not guessed.
6. Expected for conflicting/missing evidence: uncertainty remains visible; no zero exposure or successful trade is invented.
7. Unsupported batches and unavailable transactions remain explicitly unsupported/unresolved.

## Scenario 6 — Review exposure and save the case

1. From the report, choose **Inspect resulting positions**.
2. Expected: the report owner is selected in read-only mode; current account exposure is separate from transaction-local evidence.
3. Choose **Return to report & export**.
4. Choose **Explore this market’s risk** and test a hypothetical shock against its frozen baseline.
5. Return to the report. Expand **Save a concise case summary**.
6. Download JSON or Markdown; also download the full report when raw evidence is needed.
7. Copy the independent report link. Expected: URL contains chain/hash only. Site access restrictions still apply. Downloads contain public addresses; review them before sharing.

## Scenario 7 — Check recovery and persistence

1. Verify an operation receipt in its original journal.
2. Edit its recovery hash to another value.
3. Expected: the previous receipt details no longer appear as verification of the newly entered hash.
4. Reload with an unresolved attempt. Expected: local send locks remain; navigating to the guide or a public report cannot unlock them.
5. Check saved Developer Test Lab notes. Expected: existing account-scoped notes and imports remain available.

## Three-minute demonstration

1. **0:00–0:30:** explain the signer/trading-account problem and choose the account.
2. **0:30–1:00:** demonstrate one local input rejection and correct it. Clearly label any synthetic demonstration.
3. **1:00–2:00:** show a real PEI-origin order and its verifiable receipt. Use an explicitly labelled replay if it was previously recorded; do not promise a fixed fill time.
4. **2:00–2:40:** explain its outcome, inspect current exposure and return to the report.
5. **2:40–3:00:** export evidence and show repository/setup instructions and honest limitations.

## Validation and external gates

Automated results are recorded in `research/guided-execution-verification.json`. Mock wallet/receipt tests are synthetic; optional live tests are public read-only probes. They are not evidence of a real wallet-signed order.

Actual PEI-origin order evidence, three-human usability observations, GitHub publication, judge access, X post URLs and organizer eligibility remain external acceptance tasks. No posts, reports, disclosures or submissions are sent automatically. Follow the existing [user study protocol](PART3_USER_STUDY.md) to record observed completion times, errors and assistance honestly.
