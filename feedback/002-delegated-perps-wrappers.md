# Add typed build-only wrappers for delegated Perps trading
Severity: normal
Area: SDK

Status: reproduced SDK surface gap / FEATURE REQUEST; UNSENT. Not a broken protocol method, vulnerability or accepted bounty claim.

## Steps to reproduce
1. Install this repository with `npm ci --ignore-scripts`.
2. Run `node scripts/reproduce-feedback.mjs` and inspect `delegatedSurface` in its output.
3. Inspect `Trader` and `PlacePerpOrderParams` in the installed SDK 0.32.1 declarations. Owner placement has no receiving-owner parameter. The proposed convenience names `placePerpOrderFor`, `cancelPerpOrderFor` and `reducePerpOrderFor` are absent; these names are suggestions, not existing APIs.
4. Compare the [official raw/operator guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet) and [official bot-kit Perps implementation guide](https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/perps.md), which support delegated trading through direct ABI calls.

## Expected
As a requested enhancement, expose typed build-only wrappers for the supported delegated place/cancel/reduce calls. Keep receiving owner distinct from signing actor; preserve raw units, exact selector/permission requirements, expiry, gas/native value and receipt decoding. Do not grant deposit, withdrawal or owner-stop authority implicitly.

## Actual
For this integration we use the documented raw ABI route with our own actor/owner checks, per-pool permission checks, encoding and receipt matching. Supported delegated trading is possible today. The gap is convenience and consistent type/build support in the inspected SDK surface, not missing on-chain functionality.

## Evidence
- [Offline reproduction output](../docs/research/feedback-reproduction.json): parsed Trader Perps methods, absent proposed names and the owner-parameter check.
- [Application integration](../packages/perps-adapter/src/operations.ts): delegated paths and permission checks.
- [Part 9 test evidence and limitations](../docs/PART9_HANDOFF.md).
- No live delegated transaction was executed. Synthetic integration tests are not transaction proof.

## Environment
SDK: @somnia-chain/markets-sdk 0.32.1. Node: v22.14.0. OS: Windows. Network context: official Perps Hideki chain 50383 (bounty announcement says Tokyo). Wallet: not applicable to declaration inspection.

## Acceptance and duplicate limits
The raw route is already documented. Organizers may regard this as known, planned, out of scope or not sufficiently useful for a payout. The proposed severity is normal; no critical/major impact is claimed. Public issue inspection does not establish first-report priority. Confirm current package support and organizer eligibility before submission.
