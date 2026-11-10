# SDK position analytics can differ from deployed account equity by one raw unit
Severity: normal
Area: SDK

Status: reproduced observation; draft, not submitted or accepted. The deployed rounding implementation has not been established. No security vulnerability or financial loss is claimed.

## Steps to reproduce
1. Install the repository's pinned dependencies with `npm ci`.
2. Run `node scripts/reproduce-risk-reconciliation.mjs 0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6 46346751`.
3. The script reads account state, health, position and pool health snapshot at the same block, then calls the published `perpPositionAnalytics` for each active pool.
4. Compare collateral plus SDK equity contributions with `getAccountHealth` equity. Compare the three margin requirements independently.
5. If the RPC cannot serve this historical block, record that limitation. The committed JSON records the original pinned reads. Repeating at a new head is a different observation and may reconcile exactly.

## Expected
The official [Perps SDK documentation](https://prd.smk.somnia.host/docs/typescript/perps) describes the position metrics as matching the bank's equity exactly when summed with collateral at one block.

## Actual
At block 46346751, SDK equity exceeds chain equity by 1 raw USDso unit, while IM, MM and CM agree exactly. USDso has 18 decimals: the difference is 0.000000000000000001 USDso.

- Collateral: `1179820217983566214658`
- SDK price PnL: `-108554859213125418524`
- SDK accrued funding: `33668710611072830019`
- SDK reconstructed equity: `1037596648159367966115`
- Contract equity: `1037596648159367966114`

The SDK truncates negative price PnL toward zero. Flooring that fractional quotient instead would account for the observed one-unit difference. This is a hypothesis, not verified deployed-source attribution. The problem for a downstream diagnostic tool is that an exact-reconciliation gate suppresses scenario totals even though every position input is present.

## Evidence
- [Independent pinned-block read script](../scripts/reproduce-risk-reconciliation.mjs)
- [Original application observation, including inputs and pre-fix discrepancy](../docs/research/risk-rounding-observation.json)
- [Independent reproduction](../docs/research/risk-sdk-reproduction.json)
- This report uses public reads, not a fabricated transaction hash.

## Environment
- SDK: `@somnia-chain/markets-sdk@0.32.1`
- Network: chain 50383, Hideki testnet / Tokyo explorer
- Account: `0xdd4dD2A1e8Ec24d4B0CC1969D6756f8024C50BC6`
- MarginBank: `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`
- Pool: `0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0`

## Downstream mitigation
PEI preserves exact reconciliation as a separate verdict. Only a positive equity discrepancy within the negative fractional-PnL floor/truncation envelope, with complete inputs and exact IM/MM/CM, enables a clearly labeled estimate. It anchors baseline equity to chain health and adds the SDK scenario delta. Opposite-direction, larger, margin or missing-data mismatches remain blocked. No order authorization uses this estimate.
