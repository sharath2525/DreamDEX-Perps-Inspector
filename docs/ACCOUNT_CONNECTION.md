# Account connection, discovery and trading permission

Implemented 9 November 2026. Start with **Connect wallet** in the header. Public inspection still works without connecting.

## What changed

1. A previously selected trading account is restored for the same signer and testnet. Choosing it while the wallet is on another network now saves the preference too; it does not enable signing on that network.
2. Discovery combines the SDK's owned/derived indexes with the official perps indexer's `OperatorApproval` relation. It can now find indexed trading accounts linked to a signing address.
3. One verified linked candidate can load automatically when all discovery sources completed without warnings and the signing wallet itself has no margin or active markets. Multiple candidates, incomplete discovery, unknown margin and direct-wallet exposure require a deliberate choice.
4. Manual choices, saved choices and public inspections are never replaced by late discovery. Older versions' automatically saved signer defaults can upgrade to discovery; explicit direct-wallet choices remain respected.
5. Account cards show observed unlocked/locked margin, provenance, block and permission status. The selected account also loads current position/order observations. These are not a guarantee that a particular order can trade.
6. Public inspection, direct trading and linked-account trading have separate explanations. “Link a bot” means granting another address trading permission in dreamDEX; PEI users do not need to build or run an automated bot.

## Exact sources and checks

| Purpose | Implementation |
| --- | --- |
| Owned/derived candidates | SDK 0.32.1 `client.accounts.listControlledAccounts(signer)` and `listDerivedAccounts(signer)` |
| Linked candidates | POST to the official configured Hideki GraphQL indexer, `OperatorApproval` filtered by lowercase `operator`, ordered/paginated by `id`; fields `user`, `operator`, `pool`, `selector`, `allowed`, `isDenial`, `updatedAt` |
| Index freshness | `chain_metadata(chain_id: 50383).latest_processed_block` compared with independently verified RPC height |
| Valid deployment | Existing chain ID, genesis, contract code and MarginBank system checks |
| Official pool scope | Factory `getPerpPoolStatuses()`, pool `marginBank()` and `getOperatorPermissionsRegistry()` |
| Current linked permission | Pool `isOperatorAuthorized(owner, signer, selector)` for the existing perps place/cancel/reduce selectors at one observed block |
| Candidate margin | MarginBank `getAccountState(candidate)`; amounts use the verified collateral decimals |
| Selected-account exposure | Existing full account snapshot and coverage indicators; results shared across pages |

The GraphQL relation was verified through live schema introspection and actual rows. This is an application-owned public read, not an invented SDK method. Indexed grants/denials are candidate evidence only: the code checks the current pool permission even when a row claims approval. Owned/derived candidates are labelled indexed rather than automatically assumed to be tradable through a browser EOA.

Discovery is bounded to 1,000 permission rows, 20 displayed candidates and 32 checked markets per linked candidate, with four candidates processed at a time. Finding an allowed capability in one pool establishes a linked relationship, **not access to every market or every capability**. Each order still checks its specific market and operation again. Source failures, uncertain freshness and truncation remain explicit and disable automatic selection.

## Verified live result

The read-only probe found the user-supplied trading account from the user-supplied signing address, checked a current linked permission and returned it as the automatic selection. The record is [account-discovery-live.json](research/account-discovery-live.json).

The browser test uses only a public-address provider stub; its SDK, indexer and RPC reads are live. It cannot sign or send. Neither this probe nor the browser test is a real signed-order demonstration. Results describe the recorded observation and may change with grants, revocations, balances and indexer availability.

Reproduce with public addresses only:

```sh
node scripts/verify-account-discovery.mjs <signer-address> <expected-trading-account>
```

## Scenario 1: First connection, one linked account

1. Open the app in a browser with your wallet extension.
2. Click **Connect wallet** and approve address access.
3. Switch to testnet 50383 if prompted.
4. Wait for discovery. Expected: the eligible single linked account appears automatically, separately from the signer.
5. Check Overview and Positions. Expected: reads use the selected trading account, not the gas-paying signer.
6. Expected: no signature request, approval grant or order is sent during discovery.

## Scenario 2: Returning user and wrong-network setup

1. Select the intended account using **Use account** or the manual field.
2. Reload and connect the same wallet. Expected: **Your saved trading account was restored**.
3. Repeat while the browser wallet is on a different network. Expected: preference persists but trading is blocked.
4. Switch to testnet. Expected: the account remains selected; a deliberate resume and fresh order review are required after identity/network changes.

## Scenario 3: Several accounts or a funded signing wallet

1. Connect an address with multiple indexed accounts, or with its own margin/exposure.
2. Expected: no silent switch to a different account.
3. Compare the account cards and choose the intended account.
4. Expected: all pages use that selection and it is remembered.

## Scenario 4: Missing or revoked permission

1. Select an account with a known missing market permission. Do not revoke a working permission just to run this scenario unless intended.
2. Choose that market in the permission check.
3. Expected: current place/cancel/reduce status is shown separately. A missing place grant offers the official **Link a bot** instructions.
4. Expected: a historical index row cannot certify current access; failed permission reads say unavailable.
5. Existing linked users do not receive a blanket instruction to create another bot.

## Scenario 5: Indexer unavailable or incomplete

1. Use browser devtools to block the indexer, or run the deterministic outage tests.
2. Click **Refresh accounts**.
3. Expected: unavailable/incomplete status, not “you have no trading accounts.”
4. Enter a public trading address manually. Expected: RPC reads and existing order checks remain usable when their own data sources are available.
5. Restore the connection and refresh discovery.

## Scenario 6: Late results and account changes

1. Start discovery on a throttled connection.
2. Manually choose an account before discovery finishes.
3. Expected: the manual choice remains selected.
4. Inspect another public account. Expected: read-only status; return restores the trading account.
5. Change the wallet extension's selected address. Expected: previous account data/reviews are invalidated and the new signer's preference is used.

## Scenario 7: Browser storage blocked

1. Test in a browser environment that denies local storage.
2. Connect and select an account.
3. Expected: selection works for the session, with a visible storage warning.
4. Reload. Expected: the app does not promise persistence it could not save.
5. Do not clear existing browser data while an execution is unresolved; test isolated storage instead.

## Scenario 8: Mobile and navigation

1. Test widths 320, 390, 768 and 1440 pixels.
2. Open the wallet dialog, scroll to account cards and change selection.
3. Expected: addresses wrap, controls remain reachable and cards stay within the viewport.
4. Move through Overview, Trade, Positions and Risk Lab. Expected: the same trading account remains selected.
5. Existing Developer Test Lab notes and execution journals remain intact.

## Remaining limits

- Discovery depends on public indexes and may omit new or unindexed relationships. Manual selection remains available.
- Automatic selection does not grant trading permission, prove ownership or authorize a signature.
- Stored public addresses are browser-local preferences; they do not sync across devices.
- No new smart contracts, private-key handling, automatic grants, automated orders or new dependencies were added.
- Actual wallet signing, judge access and external bounty submission requirements remain separate acceptance tasks.

References: [dreamDEX developer configuration](https://app.dreamdex.io/docs/developers/perps-testnet), [Link a Bot](https://app.dreamdex.io/docs/trading/common/link-a-bot).
