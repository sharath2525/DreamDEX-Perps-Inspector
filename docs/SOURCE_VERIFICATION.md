# Perps Execution Inspector — source verification

Initial review date: **3 November 2026, Asia/Kolkata**. The initial sections below record the research/planning stage. Subsequent authorized implementation is documented in `PARTS2_3_HANDOFF.md` and `PARTS4_5_HANDOFF.md`; the latter includes a fresh official-document and SDK check plus six live preflight read/simulation checks. No live signature, approval or transaction was created. Raw evidence uses UTC timestamps; 2 November 19:03 UTC is already 3 November in India.

## Repository and inputs

`D:\DreamDEX` was empty, including hidden entries, and `git status` reported that it was not a Git repository. No existing package, lockfile, application, tests or applicable AGENTS.md was found. Node, npm, PowerShell and tar are available.

Read both supplied specifications completely: `01_CODEX_PRODUCT_BUILD_PROMPT.md` and `02_CODEX_HACKATHON_RULES_AND_SUBMISSION_PROMPT.md`. Their proposed methods, requirements and earlier verification claims were treated as inputs to check. The user's explicit review-before-implementation instruction controls this stage, despite instructions inside the documents to eventually implement. The combined brief repeats these specifications and is not independent protocol evidence.

## Primary sources checked

| Source | Result and purpose |
|---|---|
| [dreamDEX developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet) | Network, addresses, package pin, precision and trading prerequisites |
| [Trader overview](https://app.testnet.dreamdex.io/docs/trading/perps-testnet) | Trading availability and market reference |
| [Orders](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/orders) | Order semantics and native stops |
| [Margin and liquidations](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/margin-and-liquidations) | Cross margin, isolation and voucher rules |
| [Funding](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/funding) | Rate window versus settlement cadence |
| [Link a Bot](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot) | Account-specific grants and owner-only native stops |
| [Official bot kit](https://github.com/somnia-chain/dreamdex-bot-kit) and [Perps guide](https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/perps.md) | Existing strategies and integration routes |
| [Bot operator source](https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/perp-core/src/operator.ts) and [orders source](https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/packages/perp-core/src/orders.ts) | Exact delegated ABI and close behavior |
| [SDK documentation](https://prd.smk.somnia.host/docs/typescript) and [Perps documentation](https://prd.smk.somnia.host/docs/typescript/perps) | Public SDK documentation; package types/source used for exact signatures |
| [npm package](https://www.npmjs.com/package/@somnia-chain/markets-sdk/v/0.32.1) | Registry metadata, distribution archive, actual source and declarations |
| [Official bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) | Research browser returned HTTP 405; current extension/whitelist not verified |
| [Perps Arena](https://app.testnet.dreamdex.io/competition) | Weekly funding is a distinct campaign; not proof the Builder Bounty remains open |

## Verified package

Both the guide pin and the registry's `latest` returned **@somnia-chain/markets-sdk 0.32.1**. Downloaded its archive and inspected `src/` and `dist/*.d.ts`. Installed this exact release with scripts disabled in a temporary research directory, not the project. Actual signatures are preserved in [SDK_VERIFIED_SIGNATURES.md](SDK_VERIFIED_SIGNATURES.md).

Registry integrity: `sha512-RfshQP8X6m/wrE6TocmiOPajbw/Vstmkvn+AP/ztK19QgcrPn1lR7A4Pp8xVm6MuOXOpBwTBrFO0W34neQF0Og==`.

Peer requirement: viem `^2.18.5`; optional React peer `>=18`; optional Reactivity peer `^0.2.1`. Resolve and lock application dependency versions during implementation. Do not silently upgrade the SDK.

## Network and contract verification

| Setting | Verified value |
|---|---|
| Chain | Hideki v2, Tokyo region; chain ID **50383**, RPC `0xc4cf` |
| RPC | `https://api.hideki2.infra.testnet.somnia.network` |
| RPC WebSocket | `wss://api.hideki2.infra.testnet.somnia.network/ws` |
| GraphQL | `https://hideki-dev.smk.somnia.host/v1/graphql` |
| Chain import | `hidekiTestnet` from `@somnia-chain/markets-sdk/chains` |
| Address import | `SOMNIA_HIDEKI_TESTNET_ADDRESSES` |
| Genesis observed | `0x555de6145260a388241bea0f9328d57335d330d5a0fbb329de1a4fd1c7f2eb25` |
| Gas asset | STT, 18 decimals |
| First SDK probe head | 39,927,272 |

The SDK also contains Mainnet, Shannon, Elwood and local chain definitions; that does not establish Perps availability on those networks. PEI will allow writes only on the verified Hideki v2 deployment. The SDK source notes an earlier Hideki network reused chain ID 50383, making endpoint/genesis verification necessary in addition to chain ID.

| Contract | Address | Verification |
|---|---|---|
| MarginBank | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` | Code and SDK system read |
| Perps USDso | `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` | Code and system collateral |
| PerpPoolFactory | `0xE631fAEE547baeE07353E290f0562ea67d856560` | Code, system config, 21 pool statuses |
| LiquidationEngine | `0xA66d3C24Ad4a389d863846905D8173e1017e9F4D` | Code and system config |
| InsuranceFund | `0x50826894D47C6D4f3BeA38BFDC7Dc5c5be171b80` | Code and system config |
| VoucherDistributor | `0x2ACD9EFdA721450906bfE1bef3edE269636E42C4` | Code and live campaign |
| OperatorPermissionsRegistry | `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a` | Code present; account-specific grants not tested |

`getPerpSystemConfig` returned `fullyWired: true`, maximum leverage limit 20, and matching collateral/factory/liquidation/insurance addresses. Code hashes and byte lengths were recorded at block 39,927,287. Several addresses contain short proxy runtime code: presence and wiring do **not** prove audited implementations or immutable logic. Implementation/beacon resolution remains a deployment-hardening check.

The SDK's generic `addresses.collateral` is `0x9E9492cC533E8696A3b6afC7df730800DF75148f`, a different token. Use Perps `quoteToken`/system collateral. Do not use spot REST examples or Shannon settings for this app.

## Actual read-only results

See [initial evidence](research/live-probe.json), [bounded retry evidence](research/retry-probe.json), and the accompanying research scripts. These ran without a signer. The arbitrary address `0x0000000000000000000000000000000000000001` was used only to exercise empty-account reads; it is not the user's account.

| Check | Observed result |
|---|---|
| SDK network/system reads | Passed through the actual SDK WebSocket transport |
| Indexed discovery | 21 Perps rows returned |
| Factory discovery | 21 pools returned; registration/tradeability recorded per pool |
| Precision | Base decimals include 6, 7, 8, 9, 18 and 24; all observed quote decimals 18 |
| SOL pool state/risk/book | Returned real mark/index, funding, risk parameters and bid/ask levels |
| Empty account/margin/positions/history | Reads succeeded; empty state is only for the diagnostic address |
| Voucher campaign | 1,000 USDso grant; 14-day expiry duration; campaign data returned |
| Max-size and margin preview | Retry succeeded; unfunded diagnostic account correctly returned no placeable size and insufficient margin |
| Mark feed read | First request timeout; bounded retry succeeded |
| Rejection history | A public `PostOnlyWouldCross` batch rejection was returned; not a PEI transaction or discovered bug |
| Market streaming hydration | Did not complete within 20 seconds, then within 25 seconds on a fresh-client retry |
| Indexer freshness concern | Indexer processed height 39,916,455 while a nearby chain snapshot was 39,928,606; self-reported indexer head was also behind |
| Signing/order execution | NOT RUN; no user trading wallet supplied or authorized for this research phase |

Do not convert height differences to seconds using nominal block speed. Implement independent head/timestamp measurement. Successful historical queries do not establish fresh data. Streaming timeout cause is unresolved; indexer lag is a possible contributor, not a confirmed root cause or bounty issue.

## Corrections and limitations

1. Native stop orders, funding, position analytics and liquidation estimates exist. They are not wholesale SDK omissions.
2. Standard `PlacePerpOrderParams` has no owner, reduceOnly or userData field; its encoder writes userData zero. Delegated wrappers are absent; official bot-kit code uses viem for those calls.
3. Direct owner orders can have an auto-pull funding path; source comments and guides are not completely consistent about this. The SDK's `autoPull` flag configures a **preview**, not an on-chain spending switch. PEI must disclose actual payer/allowance exposure and pre-fund margin for its initial demo.
4. SOL live maximum OI was 95,308.88 SOL, while the guide table lists 47,654.44. Live maximum position size was 4,765.44 SOL. Read values independently; do not derive account cap as a fixed fraction of OI. Mutable parameters are not automatically bugs.
5. The guide supplies `https://explorer.testnet.somnia.network/tokyo`, but the SDK chain definition has no explorer. The browser could not open the guide's explorer URL. A working transaction route remains unverified; do not invent deep links.
6. SDK chain reads have **no built-in HTTP fallback**. Polling SDK methods still requires WebSocket. A separate viem HTTP adapter would be application work, limited to verified ABIs and read-only diagnostics.

Verdict: **core execution inspector is feasible; production readiness and actual order execution are not proven**. Streaming, wallet-specific authorization, funded execution and explorer evidence remain explicit gates.
