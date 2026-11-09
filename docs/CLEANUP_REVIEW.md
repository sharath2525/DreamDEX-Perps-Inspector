# Application cleanup and account discovery

Review date: 8 November 2026. Scope: application correctness, navigation, unnecessary interface text and documentation. This is not an independent security audit or mainnet certification.

## Changes

| Finding | Change | User benefit |
| --- | --- | --- |
| Account discovery was hidden in setup | Indexed candidates now appear in the wallet dialog; it shares the existing discovery query | Select a discovered account without copying its address or navigating away |
| Account roles repeated across Positions | Keep roles in the shared account strip; collapse secondary lookup and wallet controls | Positions and pending orders are easier to reach |
| Wallet funds/voucher detail crowded exposure | Preserve it in an expandable section | Margin detail stays available without dominating the page |
| Execution reports duplicated raw journal output | Collapse raw observations; keep report and cancellation actions accessible | Easier to distinguish the result from technical evidence |
| Overview used generic workflow copy | Replace it with actionable Trade, Inspector and Risk Lab shortcuts | Faster access to useful tasks |
| Hash field could show the previous report after navigation | Scope the draft to the URL hash and update its context on submission | The form follows Back/Forward navigation |
| Account changes could leave diagnostic runs busy or show stale cancellation status | Scope run status to the account and ignore superseded callbacks | New account diagnostics are not blocked by the old run |
| Invalid zero-address index entries could become candidates | Filter zero addresses | No unusable zero-account suggestion |
| Settings understated persistent storage | List saved public selections, journals, test notes and theme | Accurate privacy expectations |
| README mixed setup with historical milestones | Rewrite around setup, features, testing, safety and submission; add a documentation index | One clear starting point |

Manual lookup, trade reviews, recovery controls, raw evidence, saved notes and imports remain available. No saved-data schema migration or clearing is performed.

## Automatic account discovery: exact boundary

1. Browser connection returns the signing wallet's public address.
2. The adapter calls pinned SDK `accounts.listDerivedAccounts(signer)` and `accounts.listControlledAccounts(signer)`.
3. Results are restricted to chain 50383, validated, deduplicated and capped at 50 candidates. The user chooses deliberately.
4. Previously selected public accounts restore for that signer on this browser.
5. Discovery does not enumerate every bot/operator relationship. If the account is missing, paste its public address once. No balance guessing or authority inference occurs.
6. Every trade separately checks the selected account, signer and market permissions.

## Acceptance scenarios

### 1. Discover and select an account

1. Click **Connect wallet**; connect your browser extension.
2. Read **Your trading accounts** in the dialog.
3. If candidates appear, select the intended funded account.
4. Expected: the selected account changes; the signer remains separate; no transaction prompt opens.
5. If no account appears, use **Manage trading account**, paste the public trading address and choose **Use trading account**.
6. Disconnect/reconnect on the same browser. Expected: the saved account restores, while permissions are checked again.

### 2. Inspect exposure and details

1. Open Positions with a selected account.
2. Check current positions and pending orders against dreamDEX for the same address/network and comparable time.
3. Expand **Wallet funds, voucher and margin details**.
4. Expected: separate wallet funds, voucher floor and margin values. Failed reads show unavailable, not fabricated zero.
5. Expand **Inspect another address or manage wallet connection**, inspect a different public address.
6. Expected: public inspection is read-only; returning to trading requires a fresh review.

### 3. Navigate transaction reports

1. Open Execution Inspector and inspect one supported transaction hash.
2. Inspect another hash, then use browser Back and Forward.
3. Expected: the input and displayed report refer to the same URL hash each time.
4. Open a local attempt and expand **Journal details and raw observations**.
5. Expected: raw values remain available; cancellation still requires a separate review and wallet confirmation.

### 4. Change account during diagnostics

1. In Developer Test Lab, start read-only diagnostics.
2. While running, inspect a different public account.
3. Expected: the old run is cancelled; the new account's Run button is usable.
4. Start the new run. Expected: an old callback cannot overwrite its status or results.
5. Your saved manual test notes must remain available under their original account scope.

### 5. Layout and navigation

1. Use Overview shortcuts to open Trade, Inspector and Risk Lab.
2. Repeat at a narrow mobile width and with keyboard navigation.
3. Expected: controls stay inside panels; wide tables scroll within their own containers.
4. Open the wallet dialog, tab through controls, then press Escape.
5. Expected: focus stays inside while open and returns to the wallet button when closed.

## Validation and limits

Validation passed: lint, TypeScript, production build, source/bundle pattern checks, and **111 Chromium tests** (109 deterministic tests and 2 live public read-only tests), with zero failures, skips or flaky results. Desktop/mobile screenshots were reviewed. Machine-readable results are in [cleanup-verification.json](research/cleanup-verification.json).

These checks do not establish a new real wallet-signed order, human usability acceptance or bounty eligibility. The hosted audience remains owner-private. The pattern checks are not a comprehensive security audit.

Remaining limits include SDK/app bundle size, incomplete operator reverse discovery, unsupported smart-account batch reports, and external submission requirements. The cleanup does not remove these limits or claim guaranteed winnings.
