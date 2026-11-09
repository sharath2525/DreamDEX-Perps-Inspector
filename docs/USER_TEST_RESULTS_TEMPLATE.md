# Manual acceptance results — fill with actual observations

No row below is pre-marked PASS. Attach actual exported JSON/Markdown and screenshots. Synthetic automated results are separate.

| Test | Status | Actual / evidence filename / hash |
|---|---|---|
| T00 Connect actor and chain 50383 | NOT RUN | Latest screenshot still shows a disabled operation button |
| T01 Owner bank margin vs actor wallet funds | NOT RUN | |
| T02 BTC discovery/current rules/book | NOT RUN | |
| T03 Current owner/operator permissions | NOT RUN | Prior independent RPC check passed; user UI test pending |
| T04 Read-only diagnostic suite/export | NOT RUN | |
| T05 Bounded history/filter/export | NOT RUN | |
| T06 Invalid tick/lot/zero validation | NOT RUN | |
| T07 Gas budget/expiry validation | NOT RUN | |
| T08 Valid preflight/edit/expiry | NOT RUN | |
| T09 Wallet rejection | NOT RUN | |
| T10 Real PEI delegated placement | NOT RUN | |
| T11 Actual resting cancellation | NOT RUN | |
| T12 Optional remainder reduction | NOT RUN | |
| T13 Actual fill/position evidence | NOT RUN | Conditional on real fills |
| T14 Known-hash reload/recovery | NOT RUN | |
| T15 Post-trade history reconciliation | NOT RUN | |
| T16 Frozen risk scenarios/export | NOT RUN | |
| T17 Account/network invalidation | NOT RUN | |
| T18 Layout/errors/export accuracy | NOT RUN | |
| X01 Direct-owner trading | NOT APPLICABLE | Current setup is a linked operator |
| X02 Direct-owner margin management | NOT APPLICABLE | Current setup is a linked operator |
| X03 Direct-owner voucher claim | NOT APPLICABLE | Current setup already uses owner voucher margin |
| X04 Owner-native stops | NOT APPLICABLE | Linked actor cannot perform owner-native stop operations |
| X05 Revocation test | NOT RUN | Optional; resolve orders first |
| X06 Controlled failure fixtures | NOT RUN | Developer automation, separate from live evidence |

## Individual report (copy once per scenario)

```text
Test ID:
Date/time + timezone:
Browser / wallet extension:
App URL / chain ID:
Actor / owner / pool:
Exact inputs:
Steps:
Expected:
Actual / exact error text:
Status:
Wallet opened?:
Transaction hash OR none with reason:
Receipt / order ID / fills:
Remaining orders / positions:
Evidence files:
```
