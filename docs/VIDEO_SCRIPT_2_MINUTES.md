# Demo video — approximately 1 minute 50 seconds

## Prepare before recording

- Use the deployed production build, with real loaded data and browser zoom at 100%.
- Connect the intended signing wallet and select the actual funded trading account.
- Prepare one **real PEI-submitted testnet transaction** and its saved local attempt/hash/export. Use it only after verifying the receipt. If you do not have one, demonstrate read-only inspection and clearly say the transaction was submitted elsewhere; this does not satisfy PEI-origin order evidence.
- Record any wallet confirmation deliberately, outside the rushed narration. Cut the waiting time, and label replayed footage **Recorded testnet execution — [actual date]**.
- Have an existing position for Risk Lab. If there is none, use the honest alternate line below; a resting order is not a position.
- Hide wallet balances/accounts unrelated to the demonstration, notifications and private tabs. Never show keys or seed phrases.

## Timed script

| Time | What to show | What to say |
| --- | --- | --- |
| 0:00–0:12 | Overview with real selected-account data | “A transaction can succeed without your order fully filling. Perps Execution Inspector helps dreamDEX traders check an order before signing and understand what actually happened afterward.” |
| 0:12–0:27 | Wallet panel: signer and funded trading account | “This runs on Somnia testnet. My signing wallet pays gas, while this trading account holds margin and positions. The app looks for linked accounts and lets me verify which one I’m using.” |
| 0:27–0:47 | Trade: market, valid inputs, unsigned check and resulting review | “I choose a market and enter my order. Before opening the wallet, the app checks the order against market rules, permissions, funding and simulation. I review the exact terms and gas ceiling. Every submission still needs my wallet approval.” |
| 0:47–1:10 | Real recorded PEI wallet submission followed by Inspector hash, receipt and actual outcome | “Here is a real testnet order submitted through this application. The inspector shows its transaction hash, receipt, matched fill evidence and remaining order. This order is **[state only the verified outcome: resting, partially filled, filled, or reverted]**. A successful receipt alone is not proof of a fill.” |
| 1:10–1:28 | Positions → Risk Lab; baseline, +5% and −5% | “Next I inspect the account’s exposure and compare price scenarios. Risk Lab uses a frozen snapshot and clearly labels estimates or incomplete data. These are hypothetical scenarios, not guaranteed liquidation prices.” |
| 1:28–1:45 | Export JSON/Markdown; briefly show hash/environment in export | “I can export the evidence to investigate an execution or make an issue reproducible. That gives traders and builders a useful trail from the intended order to the observed result.” |
| 1:45–1:55 | Overview and repository URL | “Perps Execution Inspector: check before signing, verify after execution. Built for dreamDEX Perps on Somnia testnet.” |

## Honest alternatives

- No new signing in the recording: “This is a recorded PEI testnet execution from [actual date]. Here is its verified hash and outcome.”
- External transaction only: “This is a real dreamDEX transaction inspected by the application. I am not claiming this app submitted it.”
- No filled position: “This order is still resting, so it has not created a position. Risk Lab analyzes existing positions; it does not pretend an unfilled order has filled.” Show an existing verified account position if available, clearly noting the account switch.
- Slow public RPC: trim waiting footage, label the cut; do not replace failed reads with invented values.

## Keep out of the video

Developer Test Lab, long settings tours, every advanced operation, claims of guaranteed wins/profits, accepted feedback payments or security vulnerabilities, and any fabricated transaction, price or fill. Use the product's real result even when it is a resting order or a useful rejection.
