# Signing, wallet and authorization design

This is a design requirement, not a completed security audit.

Implementation update (Parts 4–9): direct EOA order/cancel uses `send-order.ts`; owner margin/stop/permission actions and delegated trading use `send-operation.ts`. Build-only SDK executors cannot execute. Both senders verify wallet genesis/account/chain, recheck simulation and review bounds, share identity locks and block on either journal's unresolved records. Account operations also bind the reviewed/persisted nonce to the wallet request and recovered receipt. Journals store public metadata in versioned localStorage, not keys/signatures. Direct smart-account signing and linked-main funding management are blocked. Distinct EOA operators can place/cancel/reduce for an authorized receiving owner after fresh per-pool permission checks. Real signed acceptance remains unverified; see `PART9_HANDOFF.md`.

## Roles and trust boundaries

- Viewer: public address lookup; no trader/signer constructed. Read-only is the default after connecting too.
- EOA owner: injected wallet signs for its own Perps account; explicit transaction review required for every intended write.
- Smart-account owner: acting account differs from login EOA; SDK executor/account integration must prove which address becomes msg.sender. A display address is not signing authority.
- Linked operator: separate test-only signer acting for one account with explicitly verified place/cancel/reduce selectors on each pool. Grants cannot authorize withdrawal or owner-native stops merely because trading is allowed.
- Local diagnostic operator: may run checks within quotas; receives no implicit user-fund authority.

The MVP uses an external browser wallet. No main-wallet private-key forms, mnemonic collection, server custody or key persistence. A future bot worker can hold only an isolated test key in a secret store/environment outside the browser, after that mode is explicitly selected. Browser environment variables are public and cannot contain secrets.

## Write controls

1. Require chain 50383, verified v2 genesis/endpoints and allowed system configuration. Recheck the wallet chain before send, not merely on connect. Do not rely on net_version as eth_chainId.
2. Resolve market pool/bank/quote token and registration from trusted deployment evidence. Validate the entire unsigned call: target, selector, chain, value, amount and actor. No arbitrary contract/address transaction box.
3. Keep owner, actor and gas payer visible. Simulate with the actual actor. No arbitrary owner substitution to make a simulation pass.
4. Revalidate price, size, expiry, restrictions and margin when the confirmation is accepted. Changed account/chain/input cancels readiness. Preflight remains a race-prone estimate, not a guarantee.
5. Send only after an explicit user action. Serialize intent locally, persist attempt ID before signature, capture hash as soon as available, reconcile unknown outcomes before allowing a new submission. UI deduplication is not chain idempotency.
6. Use dynamic gas estimation plus a bounded documented buffer; do not hardcode a universally safe small gas limit. Display maximum gas exposure and actual used gas separately.
7. Default builder to zero/fees to zero. Explicitly review any future builder-fee feature against live caps and voucher restrictions.

## Approvals and funding

Read actual Perps collateral from system config. For a margin deposit, spender is the verified MarginBank; never approve the generic spot token or unknown spender. SDK automatic approval helpers may choose a broad amount, so inspect generated approval and use an explicit amount-limited approval path when required. Do not hide an approval transaction behind a trading button.

Bank balance, locked margin, voucher floor, withdrawable amount and ERC-20 wallet balance are distinct. Voucher credit is nonwithdrawable. Owner orders may pull additional collateral when allowance/funding relationships allow; `autoPull:false` in a preview does not disable that behavior. Initial testing should use pre-funded isolated test collateral and known allowances. Any direct-wallet or linked-main funding exposure must appear in the confirmation.

Extra bounty funds must stay in their approved non-Arena account. No funds to project-owned wallets. No bridge/swap/mainnet flow is needed.

Native stops require their registry payment and operator permission for the registry. Only owner paths can grant these. Display additional signatures/approvals and refund behavior. Cancelling/revoking a bot does not automatically remove its resting orders.

## Evidence and application security

Treat SDK/indexer/error strings as untrusted display data. Escape rendering; never execute exported logs or feed external text into signing decisions. Use CSP appropriate to exact RPC/indexer/wallet integrations; avoid secret-bearing custom RPC URLs in client bundles. Clear account caches/subscriptions on switch and segregate local data by chain/genesis/account.

Exports use an allowlisted schema; strip keys, mnemonics, auth headers, access tokens, full wallet sessions, signatures and secret URL query strings. Do not preserve raw signed transactions by default. Escape CSV formula prefixes. Public addresses and hashes are public chain data, but exports should still require a deliberate user action and disclose their contents.

IndexedDB storage is editable and clearable; exported hashes and chain data make evidence independently checkable, not tamper-proof. Store schema/version and block provenance, optionally content hashes, and never call a local record canonical chain truth.

Use dependency lockfiles, restricted configuration and focused dependency/secret checks before release. Secrets must never enter git, screenshots or demo videos. Optional AI only sees sanitized diagnostic output, has no wallet tools, and cannot submit trades or certify a bug.

## Incident and disclosure handling

An unexpected accounting discrepancy is not automatically safe for public feedback. Triage for exploitability first. Per supplied bounty rules, security findings must remain outside the public repository and be disclosed privately to `security@dreamdex.io`. Do not email, post, file a public issue or submit bounty content without explicit user authorization. This planning phase found no validated security vulnerability.

No new smart contract is justified for the MVP. Existing protocol contracts plus client-side validation, real wallet authorization and evidence reconciliation cover the product scope.
