# Vercel production deployment — 15 November 2026

This is a production build of the **Somnia testnet application**, not a mainnet release. Keep all testnet labels and chain verification.

## Environment variables

**None are required.** The current browser application uses public RPC/indexer URLs and the pinned deployment configuration in `packages/perps-adapter/src/config.ts`. Wallet signing happens in the user's browser extension. There is no backend, database, API-key requirement or private-key environment variable.

Do not add a seed phrase, private key, wallet session, GitHub token or secret RPC key to `VITE_*`. Browser build variables are public. A future authenticated RPC provider needs a separately designed server-side proxy; adding a secret to the current frontend is not supported. WalletConnect relay/project configuration is not used by this browser-extension connection implementation.

## Vercel settings

1. Use the existing `DreamDEX-Perps-Inspector` repository/project. Do not create another deployment project unnecessarily.
2. Set **Root Directory to the repository root** (blank/default), because this is an npm workspace.
3. Framework: **Vite**. Node.js: **22.x** or **24.x**.
4. Install: `npm ci --ignore-scripts`.
5. Build: `npm run build && node scripts/check-production.mjs`.
6. Output: `apps/web/dist`.
7. Environment variables: leave empty for this implementation. Remove conflicting old Build/Output overrides if necessary.
8. Deploy the reviewed commit through the existing Git integration. A local code/build change does not update an already deployed Vercel site.

The root `vercel.json` contains these commands, SPA deep-link rewrites and response headers. The existing `_headers` file is for other static hosts; it is not the Vercel header configuration. The CSP permits only the current public RPC/indexer hosts. If endpoints change, review both the pinned configuration and CSP before deployment. Do not enable unrelated Vercel analytics scripts without a deliberate CSP/integration review.

Official references: [Vite SPA routing](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas), [vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Developer Test Lab separation

- `npm run build`: no lab navigation, route or lab JavaScript in the shipped artifact.
- `/test-lab` returns the application's not-found page; a query parameter or browser setting cannot enable it.
- `npm run dev`: local developer tools available.
- `npm run build:qa`: explicit local QA artifact, including the lab. **Do not deploy this artifact.**
- `npm run test:e2e`: builds the QA artifact and runs the full integration suite.
- `npm run test:production`: rebuilds production, checks the artifact and tests public routes.
- `npm run check`: lint, QA integration suite, then production checks; leaves the production artifact last.

No test notes or journals are erased. Storage belongs to a browser origin: records from the old chatgpt.site domain do not automatically appear on vercel.app or localhost. Export from the old origin while its lab is available if you need a backup; do not clear its storage. Local QA can inspect/import an exported backup, but cannot directly read another origin's storage.

## Post-deploy smoke test

1. Open the deployed URL in a private window; verify intended judge access.
2. Confirm Developer Test Lab is absent from desktop and mobile navigation.
3. Visit `/test-lab` directly; confirm there is no diagnostics runner.
4. Refresh `/trade`, `/positions/risk` and `/executions`; routes must load rather than a hosting 404.
5. Check browser Network response headers for CSP, nosniff and frame denial from `vercel.json`.
6. Read real markets, then connect a browser wallet. Check the actual signer and trading account before any order.
7. Inspect a verified transaction hash and export its evidence.
8. Record one deliberately authorized PEI testnet order and actual outcome before claiming live execution acceptance. No real transaction was signed by the build tests.

Remaining operational limits: public RPC/indexer availability and bounded discovery, local-browser journals, supported single-call transaction decoding only, estimated risk scenarios, large SDK bundle, no mainnet validation or independent security-audit claim. Retain the previous Vercel deployment for rollback if live smoke checks fail.
