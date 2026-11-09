# Perps Execution Inspector

A dreamDEX Perps testnet trader tool: **choose the right account, check an order, verify what filled, and understand the remaining exposure.**

React, TypeScript, Vite, viem and Somnia Markets SDK `0.32.1`. Targets chain `50383` (Hideki in SDK configuration; Tokyo in dreamDEX documentation). No new smart contracts.

## Run locally

Requires Node.js 22.14+ in the 22.x line, or Node.js 24+, and npm 10+.

```sh
npm ci --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:5173`. Public reads need no API key or wallet. Trading requires a supported browser wallet, testnet STT for gas, and an eligible funded trading account. Never put keys or seed phrases in this repository or in `VITE_*` variables.

[Hosted application](https://perps-execution-inspector.sharathprvtairdrops.chatgpt.site) — currently owner-private. A private deployment is not a publicly accessible judging demo.

## Connect the right account

1. Click **Connect wallet** and select your wallet extension.
2. The wallet dialog automatically looks up indexed **owner and derived accounts**. Choose the account holding your perps margin.
3. If a bot-linked account is missing, choose **Manage trading account** and enter its public address once. The SDK indexes do not enumerate every operator relationship; an empty result does not prove no accounts exist.
4. The browser remembers the public account selected for that signer and restores it on reconnect. Multiple discovered accounts remain selectable.
5. Verify the roles: **signing wallet pays gas**; **trading account holds margin and receives positions**. Selection and discovery do not establish trading permission.
6. Switch to chain 50383 when prompted and check market-specific permissions.

Public-address inspection also works without a wallet and is read-only. See the [official Link a Bot guide](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot).

## Features

| Page | Purpose |
| --- | --- |
| Overview | Selected-account equity, unlocked collateral, maintenance headroom, positions and local activity. |
| Guided execution | A clear starting point for a new order or an existing transaction, with account checkpoints and links to the original local attempts. |
| Markets | Registered pools, market rules, book snapshots and trading constraints. |
| Trade | Direct limit, bounded IOC, FOK and post-only reviews; linked accounts use delegated post-only placement. |
| Execution Inspector | Independent reports, receipt fills, current remainder, block-level position changes, gas and JSON/Markdown exports. Local attempts also support recovery and cancellation reviews. |
| Positions | Positions and pending orders; expandable wallet funds, voucher and margin details. |
| Risk Lab | Frozen baseline, uniform/per-market shocks and exports. Totals are withheld if inputs are incomplete or reconciliation fails. |
| Account operations | Separately reviewed margin, voucher, owner-stop and delegated place/cancel/reduce operations, subject to eligibility. |
| History | Bounded indexed history, loaded-record filters and exports. |
| Developer Test Lab | Read-only diagnostics, manual cases, saved notes and validated note import/export. |
| Settings | Deployment configuration, SDK version and storage information. |

## Test an order

1. Verify selected-account margin and signer gas.
2. Choose a market; enter quantity, price, expiry and gas budget.
3. Run unsigned preflight. Resolve precision, permission, margin or gas errors.
4. Review and confirm in the app, then review and sign in your wallet.
5. Open the attempt in Execution Inspector. A hash or successful receipt alone does **not** establish a fill.
6. Check receipt events and the remaining order, export evidence, then refresh Positions.
7. Cancel an unwanted resting remainder with a separate review. Cancellation does not close a filled position.

Use the [guided execution scenarios](docs/GUIDED_EXECUTION.md), [numbered test scenarios](docs/PARTS2_3_TESTING_GUIDE.md) and [cleanup acceptance checks](docs/CLEANUP_REVIEW.md). Nothing trades automatically.

The guided flow connects account selection, unsigned checks, wallet review, receipt verification, exposure and export. Diagnostic cards separate an observed validation/check failure from a possible explanation inferred from error wording. Execution cases explain receipt-backed facts and remaining unknowns. Positions and Risk Lab keep a return link to the original report. A concise case summary is separate from the full raw report; neither proves which frontend submitted a transaction.

## Verify changes

```sh
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

`build` includes TypeScript checks for the app, adapter and browser tests. Tests use the built app on localhost port 4173. `npm run check` runs lint, build and deterministic tests together. Set `PEI_LIVE_READS=1` for optional public read-only tests. Synthetic fixtures are never real trading evidence.

For a production preview, run `npm run preview`. Static hosts must fall back to `index.html` for app routes. See the [release runbook](docs/RELEASE_RUNBOOK.md).

## Architecture

- `apps/web`: React UI, wallet connection, account selection, journals and explicit signing boundaries.
- `packages/perps-adapter`: deployment verification, SDK/contract reads, bigint arithmetic, unsigned builders, simulation and receipt inspection. It never receives keys or signs.
- `tests/e2e`: Playwright regressions and optional live reads.
- `scripts`: verification probes, feedback reproduction and source packaging.
- `docs`: workflows, capabilities, evidence, security requirements and historical handoffs.
- `feedback`: unsent feedback drafts, not accepted bounty claims.

Expected deployment settings are in `packages/perps-adapter/src/config.ts`. Reads verify chain, genesis, contract code and system wiring. Freshness and partial coverage remain visible. Dependencies and the lockfile are pinned.

## Safety, storage and limitations

- Every write requires fresh checks, application review and wallet confirmation. Identity changes invalidate prepared operations. No automatic trade retries.
- Unknown outcomes block further sends. Keep browser data until resolved. Local cross-tab locks do not protect across other devices or apps.
- Public account selections, execution journals, test notes and theme preferences persist in this browser. Live account queries clear on identity changes. No keys, seed phrases, signatures or signed transactions are stored. Export notes before clearing storage; never enter secrets in notes.
- Direct orders may draw collateral through existing allowances. A preview is not a hard funding cap. Review funding and gas terms. Operator permission does not grant withdrawal or owner-stop authority.
- Reports support verified single direct/delegated place, cancel and reduce calls. Arbitrary routers, smart-account batches and complete operator reverse discovery are unsupported. Public reports cannot resolve local journal locks by themselves.
- A disappeared remainder does not prove a fill. Block-level changes may include other transactions. History and large-account scans are bounded with coverage warnings.
- Risk scenarios freeze funding indices, orders and risk parameters. They exclude future fills, fees, funding changes and liquidation actions; they do not predict an exact liquidation price.
- This is a testnet application, not a mainnet-readiness claim. Automated checks are not a complete security audit. See [security requirements](docs/SECURITY.md) and [capability limits](docs/CAPABILITIES.md).

## Bounty submission

Targets the **trader tools MVP** track and separate reproducible **feedback**. Existing drafts are not confirmed vulnerabilities or accepted reports. Security-sensitive findings must stay private.

Still required: verify PEI-origin real-order evidence, confirm organizer eligibility/whitelist and revised deadline, supply a GitHub repository and accessible demo, and add 2–3 actual X post links tagging `@DreamDEXSomnia`. Nothing is submitted automatically. See [submission checklist](docs/SUBMISSION_CHECKLIST.md), [feedback triage](docs/FEEDBACK_TRIAGE.md) and [demo script](docs/DEMO_SCRIPT.md).

## X posts

No published links have been supplied. Add actual post links here before submission.

## Documentation

Use the [documentation index](docs/README.md) for setup, testing, SDK references and historical records.
