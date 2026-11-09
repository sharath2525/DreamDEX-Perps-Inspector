# Release and first-wallet runbook

This is a testnet release candidate. Automated/synthetic tests and public read probes are not real signed execution proof. No mainnet mode or new contract deployment is included.

## Clean setup

Use Node 22.14+ in the 22.x line or Node 24+, npm 10+. From the repository root:

```sh
npm ci --ignore-scripts
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

No environment secrets or API keys are required. Live browser reads are opt-in with `PEI_LIVE_READS=1`. `node scripts/verify-history.mjs` and `node scripts/verify-operations.mjs` save public read evidence. `node scripts/release-check.mjs` scans application source/bundles for specific embedded-secret patterns, fixture leakage and SDK pin drift; this is not a comprehensive security audit.

## Static deployment

The app is browser-only. Build output is `apps/web/dist`; `node scripts/stage-static.mjs` copies it to `dist` for the private Sites deployment. Both folders are ignored. The hosting identity lives in `.openai/hosting.json`; preserve it for updates. No wallet journal, node_modules, local .env, signing material or test fixtures belong in the deployed assets. Hosts must fall back to `index.html` on application routes. `_redirects` and `_headers` are provided for compatible hosts; check actual host behavior, not just the files' presence.

The exact official RPC, WS and indexer are allowlisted by the provided security headers. Do not use secret-bearing custom RPC URLs in browser configuration. Changing origin creates a separate local journal; keep the old origin's data until all its outcomes are resolved. A private hosted preview is not a public bounty demo or GitHub repository.

## Before real testing

1. Use a dedicated authorized testnet account. Establish whether its funds are Arena funds or organizer-granted bounty funds; keep those categories separate.
2. Connect the actual signing EOA, verify chain 50383/genesis and its STT balance. A smart app account needs its own linked-operator route; a login address is not the app account.
3. Inspect current positions, resting orders, voucher restrictions, allowance and linked-main funding. Do not assume the public sample belongs to you.
4. Choose a current permitted market, a small exact notional, expiry and gas budget. Budget each additional approval, stop payment or cancellation separately. Changing wallet fees/nonces can exceed or invalidate the reviewed operation.
5. Run preflight, read the actual funding/permission implications and confirm only the intended transaction in the wallet.
6. Inspect the real receipt, decoded outcome, remainder and final exposure. Cancellation does not close positions. A successful receipt without fills is not a filled trade.
7. Export evidence before closing the browser. On unknown outcome, recover the actual hash or establish a replacement; do not blindly resend or clear the journal.

For native stops: separately review a pool-scoped registry grant, payment per leg, trigger/limit/size, create receipt IDs, known-ID liveness, cancellation and refund/credit. For operators: link/grant the exact pool/selectors, connect the operator EOA, verify the receiving owner and distinct gas payer; recheck after revocation. Withdrawal and owner stops are not delegated capabilities.

## Three-minute demo

Explain the execution problem → live market and account provenance → expected invalid preflight with no signature → actual small signed order when the wallet is ready → receipt/fill/remainder evidence → frozen risk shock → bounded history and diagnostic report → limitations. Until a real order exists, label the demo as read-only plus synthetic verification; do not imply a signed lifecycle occurred.

## Release gates

The Parts 5–6 and 9 real signed acceptance gates, organizer eligibility/whitelist, public GitHub repository, public demo access and genuine X links remain distinct from software build checks. No social post, feedback report, disclosure or submission is sent automatically. See [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).
