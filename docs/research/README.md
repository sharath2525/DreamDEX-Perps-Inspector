# Read-only feasibility evidence

These are research scripts and recorded public endpoint responses, not application code or executed-trade proof. No signer, private key or wallet was used. All observations are snapshots, not current prices.

- `live-probe.json`: first SDK/network/configuration/market/account checks, including errors.
- `retry-probe.json`: one bounded repeat of failed reads, margin preview, indexer sync and streaming hydration.
- `rpc-probe.json`: preliminary HTTP chain/genesis/bytecode check.
- `package-verification.json`: verified archive integrity and SHA-256 hashes of inspected SDK files.
- `probe.mjs`, `retry.mjs`: scripts that produced the two SDK reports. The second consumes the first report and intentionally reuses its bounded diagnostic price; it is not an executable trading quote.

Initial run started `2026-11-02T19:03:47Z` (3 November, 00:33:47 IST). Use the JSON's raw timestamp as the precise record. All monetary values serialized from bigint remain decimal strings.

To reproduce, copy the scripts to a separate temporary directory; install `@somnia-chain/markets-sdk@0.32.1` and a compatible viem 2.x there with npm `--ignore-scripts`; run `node probe.mjs` and then `node retry.mjs`. Public HTTP, RPC WebSocket and GraphQL access are required. The archive integrity used in this review is preserved in the manifest. The inspection installation lived outside the application workspace.

Both scripts are bounded read-only probes. A timeout records the observation deadline, not proof of a protocol defect. The exchange is closed afterward; an individual timed-out promise may continue until transport cleanup. Do not reuse this simplistic research timeout wrapper as the app's cancellation design.

The diagnostic account `0x0000000000000000000000000000000000000001` is arbitrary and is not the user's wallet. Empty balances/positions here do not describe any user. The public rejection returned in `rejectionsSchema` belongs to an unrelated existing transaction; it is explicitly not a PEI order, bounty report or security finding.

Known limitations: one selected market was sampled for detailed state/book/risk; only empty diagnostic account portfolio was tested; no browser wallet, smart-account executor, native stop, grant or order write was exercised. Streaming hydration exceeded both research deadlines. The package archive matched npm's reported SHA-512; that is an integrity check, not a security audit.
