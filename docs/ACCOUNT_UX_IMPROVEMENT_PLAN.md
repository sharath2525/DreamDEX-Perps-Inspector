# Account UX improvement plan

Plan recorded 2026-11-05. Parts A–D were implemented on November 6. For the current walkthrough use [Account UX testing reference](ACCOUNT_UX_TESTING_REFERENCE.md).

## What the app is for

Perps Execution Inspector lets a trader inspect real dreamDEX markets and accounts, check an order before signing, submit supported testnet orders, inspect their outcome, and model portfolio price shocks. Developer diagnostics produce evidence for investigation. It is not an autonomous trading bot. A local issue in this application is not automatically a payable dreamDEX issue.

## Verified problem and evidence

- The browser signer is `0x9fb5B47901c9aD427b1eA9bb96c182eDD0EEAFc5`.
- The funded trading account is `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6`.
- Screenshots inspect the signer, which has gas but zero perps margin. They do not establish that the trading account has zero margin or no positions.
- A read-only check at 2026-11-05 17:10:50 UTC, block 42447711, found 1,000 USDso unlocked collateral and one 0.005 BTC short on the trading account. No pending orders were observed within the reader's coverage. These are historical observations, not guaranteed current balances.
- The account's zero-shock risk baseline reconciled exactly with on-chain equity, initial, maintenance, and close-out requirements. This supports the calculator for this snapshot; it does not certify the entire Risk Lab UI.
- This position is not evidence that PEI submitted its opening order. Origin requires a matching transaction and decoded order/fill evidence.
- Local reproduction: `.release/probe-account-discovery.mjs`; observations: `.release/account-discovery-research.json`. Research files are separate from application source and are not submission-ready feedback reports.

## Confirmed application causes

1. `AccountProvider.connect()` selects the signer as the inspected account.
2. Account operations keeps its receiving owner in page-local state. It does not update the account used by Overview, Positions, and Risk Lab.
3. Public address inspection clears the signing session. This makes switching between inspection and execution confusing.
4. Overview renders a position placeholder/count rather than position rows, and its activity empty state does not represent all execution paths.
5. Several different readiness failures share a generic operator connection message.
6. Risk Lab depends on the same selected address and an explicit freeze step. An empty signer account and an unstarted calculation are not explained sufficiently.

## Discovery: what is actually supported

Pinned package: `@somnia-chain/markets-sdk` 0.32.1.

| Verified SDK capability | Role | Important limit |
|---|---|---|
| `sdk.client.accounts.listDerivedAccounts(accountId)` | Find indexed derived smart accounts | The derivation identity need not be the connected signer |
| `sdk.client.accounts.listControlledAccounts(owner, options)` | Find indexed owner-controlled accounts | Owner control is not delegated perps trading permission |
| `sdk.client.accounts.find(accountId, { maxIndex })` | Bounded on-chain derivation check | Not a reverse lookup of every account a bot can trade |
| `sdk.client.accounts.getIndexedAccount(address)` | Inspect a known smart account | Metadata is not authorization |
| `sdk.client.accounts.ownersOf(account)` | Read smart-account owners | Does not enumerate all trading delegates |
| `sdk.client.accounts.authorityPath(account, signer, options)` | Inspect owner authority paths | Not a substitute for pool-level trading permissions |
| Existing adapter `readPermissions` | Verify current place/cancel/reduce permissions for a pool | Recheck for the selected account, signer, network, and operation |

For this signer, both indexed account lists were empty. Bounded derived slots 0–4 were undeployed. The known funded account was indexed under a different derivation identity. Therefore, a claim that these SDK methods automatically find every linked bot account would be false.

Proposed reliable flow: try supported discovery, show verified candidates, and accept a trading address once when discovery is incomplete. Remember the user's selection for that signer and network. Revalidate the relationship and operation permission on reuse. Stored addresses never grant authority. Do not hardcode this user's wallet, infer ownership from a balance, or silently choose the largest account.

Automatic reverse discovery of all operator-linked accounts is a separate feasibility gate: implement only after verifying a suitable indexed relation or exact registry event interface and bounded query strategy. Failure must say discovery unavailable/incomplete, not no accounts exist.

## Implementation order and acceptance gates

### Part A — shared account selection and readiness (first)

1. Separate connected signer, selected trading account, and public read-only inspection state.
2. Add a shared account strip: network, signer/gas payer, trading account, and capability status. Show full addresses on expansion/copy.
3. Add discovery with bounded timeouts and a one-time manual fallback. Persist only public selections, scoped by network and signer.
4. Carry the selected trading account across Overview, Positions, Trade, Risk Lab, Account operations, and filtered history.
5. Keep the provider connected during public inspection, but explicitly label read-only mode and require a deliberate return to the trading account before writes.
6. Invalidate prepared operations when signer, account, network, permission, or order inputs change. Wallet connection never submits a transaction.
7. Replace the generic disabled message with the exact missing requirement: wallet connection, wrong network, owner selection, permission, stale check, invalid input, or insufficient gas.
8. Preserve existing manual address inputs, wallet selection, owner/operator controls, and advanced parameters.

Acceptance: this user's signer selects the funded account after one setup; all account pages agree. Reconnection never silently changes the funded account to the signer. Wrong-account writes and stale reviews remain blocked.

### Part B — useful balances, positions, orders, and history

1. Render actual Overview position rows and link them to Positions and Risk Lab.
2. Label gas balance, wallet token balance, unlocked collateral, locked collateral, equity, and voucher floor separately. Explain why voucher margin can be non-withdrawable.
3. Distinguish loading, unavailable, partial coverage, stale data, and verified zero values.
4. Separate resting orders from filled positions. A successful placement receipt does not prove a fill.
5. Combine direct and delegated local execution summaries with account/network filtering. Preserve existing journals and provide migration if storage formats change.
6. Keep externally observed chain history separate from local PEI attempts. Do not fabricate a local attempt for an order created in dreamDEX.

Acceptance: the existing BTC short appears for the correct account; Overview does not show an empty placeholder when positions/activity exist. A zero-result view identifies the account and coverage.

### Part C — guided Risk Lab

1. Load the selected account and automatically create the initial coherent frozen baseline once data is complete.
2. Display account, snapshot block, reconciliation status, and whether inputs are complete.
3. Keep existing uniform shocks, per-market overrides, freeze/reset controls, assumptions, and evidence downloads.
4. Explain in plain language how the scenario changes equity and margin headroom. Clearly label hypothetical results.
5. Keep the active baseline frozen while the user changes shocks. Refresh/reset explicitly replaces it.
6. If flat, explain that no position is exposed to price shocks. If inputs fail or mismatch, withhold totals and show the reason.

Acceptance: 0% reproduces the baseline; for a lone short, a positive price shock worsens price PnL and a negative shock improves it with other inputs frozen. Invalid inputs cannot export a fresh-looking result.

### Part D — guided execution and testing

1. Add a readiness checklist and next action before order entry.
2. Select only the verified supported route for the chosen account. This linked operator currently has post-only placement, resting cancellation, and remainder reduction; do not silently promise owner-native stops, withdrawals, or a new immediate-execution route.
3. Show order units, current lot/tick constraints, side, expiry, and the source/time of book data. Keep manual controls.
4. Show separate stages: input check, fresh simulation, wallet confirmation, submitted hash, receipt, resting order/fills, and position effect.
5. Add numbered test cards with expected results, screenshots/exports, and a report template. Mark tests NOT RUN until evidence exists.

Acceptance: an order can be traced from review to a verifiable outcome; a rejected wallet request is not shown as a failed on-chain transaction; no automatic retry duplicates a pending order.

## Validation and limits

- Test account selection and signer/chain changes at provider and page level; preserve all existing write guards.
- Test discovery success, empty results, timeouts, multiple candidates, saved selection, and revoked permissions.
- Test unavailable data versus zero, partial pool coverage, local/external history, and existing journal migration.
- Test risk baseline identity, short/long shock direction, invalid inputs, account switching, and snapshot reset.
- Run the repository's required checks after implementation. Existing past test passes do not validate this proposed change.
- Real signed tests remain user-confirmed. No need to open another position just to validate account display or risk.
- Bounty acceptance, whitelist, remaining budget, duplicates, and late entry are not established by this technical work. The supplied November 1 deadline has passed as of this plan. Organizer confirmation remains necessary.

## Official references

- [Link a bot](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot)
- [Perps testnet developer documentation](https://app.testnet.dreamdex.io/docs/developers/perps-testnet)

Use `GUIDED_UX_ACCEPTANCE_SCENARIOS.md` for numbered current-build checks and proposed post-fix acceptance tests.
