# Three-minute judge walkthrough and first-wallet evidence

Status: script prepared; recording UNPERFORMED and PEI-origin signing evidence UNVERIFIED. Reuse the existing U10/PEI attempt if it qualifies; label any replay with date and original build. Use the selected authorized testnet wallet, never a public sample from the research probes.

| Time | Show | Say / evidence |
|---|---|---|
| 0:00–0:20 | Overview and live market | Traders need to know why an order is blocked and what actually happened after sending. |
| 0:20–0:45 | Positions: actual owner, margin, gas, pending orders | Distinguish signing actor from receiving account. Identify the real testnet funding category. |
| 0:45–1:10 | Invalid precision followed by valid preflight | Precision and funding checks happen before the wallet request; this is a simulation, not a trade. |
| 1:10–1:55 | User approves a small reviewed order | Capture the actual hash. Explain whether the receipt shows a fill, a resting order or a failure. Never describe an unfilled order as filled. |
| 1:55–2:20 | Independent report link in fresh browser | No connected wallet or local journal. Verify the same hash; hosting access must actually work. Chain data alone does not establish frontend origin. |
| 2:20–2:40 | Result → correct account and focused Risk Lab | Show zero and +/-10% market shocks, frozen baseline and omitted future events. |
| 2:40–3:00 | Evidence exports and GitHub | Download report plus original attempt; show source, supported scope and limits. |

## Wallet handoff

Open the app in the browser containing the wallet extension. The Codex in-app browser currently reports no wallet provider. In Positions choose the extension and Connect read-only; this requests account access only. Confirm the actual signer, chain 50383 and funded receiving owner before choosing an order. Do not send keys or seed phrases to chat.

Before signing, agree the exact market, side, raw-grid-compatible quantity/price, expiry, maximum notional and gas budget. Use the live app's preflight; there is no fixed recommended trade price in this document. Wallet changes invalidate the review. For a linked operator use Account operations rather than pretending the operator owns the app's collateral.

The user makes the final wallet confirmation. If the outcome is unknown, preserve the local journal and recover the actual transaction hash; do not resubmit blindly. Export the real attempt and capture final positions/orders. Store hashes only after verification. No automatic closing trade is part of this walkthrough.

## Evidence checklist

- Actual owner/actor, chain/genesis, funding category and agreed budgets.
- Preflight inputs and observed time, actual wallet-authorized hash, canonical receipt.
- Decoded order/fill details, remaining order state and position/exposure after the run.
- Separate cancellation hash when applicable; no invented zero-exposure claim.
- Export files and a recording labelled with its date, network and whether any segment is replayed.
- GitHub URL, judge-accessible demo and genuine X links before submission.
