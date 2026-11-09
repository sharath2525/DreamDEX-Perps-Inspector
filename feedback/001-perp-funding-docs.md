# Align Perps order funding comments with the documented owner auto-pull path
Severity: normal
Area: docs

Status: locally reproduced documentation inconsistency; UNSENT. Organizer duplicate review, eligibility and acceptance pending. This is not a security vulnerability or a demonstrated loss of funds.

## Steps to reproduce
1. Install this repository with `npm ci --ignore-scripts` (SDK pinned to 0.32.1).
2. Run `node scripts/reproduce-feedback.mjs`.
3. Inspect `node_modules/@somnia-chain/markets-sdk/dist/trade.d.ts`, the comment immediately above `PlacePerpOrderParams`, and the comment above `Trader.placePerpOrder`.
4. Compare the current [official developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet), particularly “Scale quantity by the base asset's decimals”, which describes the owner's direct placement attempting to pull a wallet shortfall. Also inspect the SDK's documented `previewPerpOrderMargin` / `quoteOrderTopUp` funding model.

## Expected
The parameter and method documentation should distinguish direct-owner placement, linked-operator placement and pre-funded margin. It should explain that an owner's placement can need wallet collateral/allowance when top-up applies, and that a preview's autoPull input models behavior rather than changing the signed pool call.

## Actual
The published parameter comment says margin comes from the signer’s MarginBank balance, says there is no escrow transfer in the transaction, and instructs a deposit first. The method comment repeats the deposit-first instruction. Read without the separate guide, these comments do not explain the documented owner auto-pull path. The inconsistency is in guidance; this report does not claim that an SDK call transferred funds unexpectedly.

## Evidence
- Reproduction output: [feedback-reproduction.json](../docs/research/feedback-reproduction.json), `fundingDocumentation` and the declaration SHA-256.
- Executable reproduction: [reproduce-feedback.mjs](../scripts/reproduce-feedback.mjs).
- [Published package](https://www.npmjs.com/package/@somnia-chain/markets-sdk/v/0.32.1).
- Current web guide was reviewed again on 7 November 2026 IST. The owner shortfall pull remains documented in the raw/operator decimals section. Mutable documents may be corrected later; rerun the comparison before submission.
- No transaction hash: documentation-only reproduction. No signer or network is used by the local script.

## Environment
SDK: @somnia-chain/markets-sdk 0.32.1. Node: v22.14.0. OS: Windows. Network context: official Perps Hideki testnet, chain 50383; the bounty announcement calls it Tokyo. Wallet: not applicable; no account access or signing.

## Suggested correction and scope
Replace unconditional deposit-first wording with conditional guidance: pre-fund margin or meet the supported owner top-up requirements; operator behavior and linked funding differ. Cross-link the funding preview documentation. Maintain the explicit distinction between preview settings and on-chain authorization. Severity is proposed normal because the reproduced impact is developer confusion; no exploit, failed user trade or financial loss was tested.

## Duplicate review
The public bot-kit open-issue page was inspected; it is not the complete bounty inbox or all closed issues. First-report priority and novelty are unverified. This report is prepared for organizer review, not represented as accepted or payable.
