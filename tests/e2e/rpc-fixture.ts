import type { Page } from '@playwright/test';
import { decodeFunctionData, encodeFunctionResult, parseAbi, encodeEventTopics, encodeAbiParameters, type Abi, type Hex } from 'viem';
import { orderBookEventsAbi } from '@somnia-chain/markets-sdk';
import { orderWriteAbi } from '../../packages/perps-adapter/src/trade';
import { operationsAbi, operatorRegistry } from '../../packages/perps-adapter/src/operations';
import { bankAbi, factoryAbi, poolAbi, voucherAbi } from '../../packages/perps-adapter/src/abi';
import { erc20Abi } from 'viem';
import { PERPS_CONFIG } from '../../packages/perps-adapter/src/config';

// Synthetic test-only chain. Never imported by application code or used as live evidence.
export const ACCOUNT_A = '0x1111111111111111111111111111111111111111';
export const ACCOUNT_B = '0x2222222222222222222222222222222222222222';
export const POOL = '0x3333333333333333333333333333333333333333';
export const BASE = '0x4444444444444444444444444444444444444444';
export const TX_HASH = `0x${'cd'.repeat(32)}` as Hex;
export const REPLACEMENT_HASH = `0x${'ef'.repeat(32)}` as Hex;
export interface FixtureOptions { wrongChain?: boolean; wrongGenesis?: boolean; wrongSystem?: boolean; unpriceable?: boolean; failHealth?: boolean; offline?: boolean; emptyMargin?: boolean; revertSimulation?: boolean; receiptMode?: 'resting' | 'filled' | 'reverted' | 'no-events' | 'pending'; sent?: { from: string; to: string; data: Hex; value?: Hex }; cancelled?: boolean; wrongTransaction?: boolean; duplicateLogs?: boolean; healthOffset?: bigint; indexedBlock?: number; originalPending?: boolean; replacement?: 'repriced' | 'wallet-cancelled' | 'different-call'; wrongNonce?: boolean; originalMissing?: boolean; operations?: boolean; permission?: boolean; bankAllowance?: bigint; nativeBalance?: Hex; stopLive?: boolean; stopRefund?: bigint; pendingNonce?: number; transactionNonce?: number }
interface RpcRequest { id: number; method: string; params: unknown[] }
export interface FixtureOptions { transform?: (request: RpcRequest, value: unknown) => unknown; riskFractionalLoss?: boolean }
export async function mockReads(page: Page, options: FixtureOptions = {}) {
  const calls: RpcRequest[] = [];
  const abi: Abi = [...bankAbi, ...factoryAbi, ...poolAbi, ...voucherAbi, ...erc20Abi, ...orderWriteAbi, ...operationsAbi, ...parseAbi([
    'function getReducingCapacity(address account) view returns ((int128 positionSize, uint256 pendingBidQuantity, uint256 pendingAskQuantity, uint256 pendingOppositeQuantity, uint256 effectiveReducingCapacity))',
    'function getMaxLeverage(address account, address pool) view returns (uint16)', 'function getMaxLeverageLimit() view returns (uint16)',
    'function getVoucherLeverageCap() view returns (uint16)', 'function isVoucherMarketAllowed(address pool) view returns (bool)',
    'function isRestricted() view returns (bool)', 'function isolationAllowsMarket(address account, address pool) view returns (bool)',
    'function quoteFundingPayer(address account) view returns (address)',
  ])];
  await page.routeWebSocket(PERPS_CONFIG.wsUrl, socket => {
    socket.onMessage(message => { const request = JSON.parse(String(message)) as RpcRequest | RpcRequest[]; socket.send(JSON.stringify(Array.isArray(request) ? request.map(reply) : reply(request))); });
  });
  await page.route(PERPS_CONFIG.indexerUrl, route => options.indexedBlock === undefined ? route.fulfill({ status: 503, body: 'Controlled indexer outage' }) : route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { chain_metadata: [{ chain_id: PERPS_CONFIG.chainId, latest_processed_block: options.indexedBlock, block_height: 100, num_events_processed: 1 }], _sdkWatermark: [{ chain_id: PERPS_CONFIG.chainId, latest_processed_block: options.indexedBlock }], Order: [] } }) }));
  await page.route(PERPS_CONFIG.rpcUrl, async route => {
    if (options.offline) { await route.abort(); return; }
    const body = route.request().postDataJSON() as RpcRequest | RpcRequest[];
    const replies = (Array.isArray(body) ? body : [body]).map(reply);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? replies : replies[0]) });
  });
  function reply(request: RpcRequest) {
      calls.push(request);
      let value: unknown;
      try {
        switch (request.method) {
          case 'eth_subscribe': value = '0x1'; break;
          case 'eth_unsubscribe': value = true; break;
          case 'eth_getTransactionCount': value = '0x' + (options.pendingNonce ?? 0).toString(16); break;
          case 'eth_gasPrice': value = '0x3b9aca00'; break;
          case 'eth_estimateGas': value = '0x186a0'; break;
          case 'eth_getTransactionByHash': {
            const replacement = request.params[0] === REPLACEMENT_HASH;
            value = (options.originalMissing && !replacement) || options.receiptMode === 'pending' ? null : { hash: replacement ? REPLACEMENT_HASH : TX_HASH, from: options.wrongTransaction ? ACCOUNT_B : options.sent?.from ?? ACCOUNT_A,
              to: replacement && options.replacement === 'wallet-cancelled' ? ACCOUNT_A : replacement && options.replacement === 'different-call' ? ACCOUNT_B : options.sent?.to ?? POOL,
              input: replacement && options.replacement !== 'repriced' ? '0x' : options.sent?.data ?? '0x', value: options.sent?.value ?? '0x0', chainId: '0xc4cf', blockHash: options.originalPending && !replacement ? null : `0x${'ab'.repeat(32)}`, blockNumber: options.originalPending && !replacement ? null : '0x64', gas: '0x20000', gasPrice: '0x3b9aca00', nonce: options.wrongNonce && replacement ? '0x1' : '0x' + (options.transactionNonce ?? 0).toString(16), transactionIndex: '0x0', type: '0x0', v: '0x1', r: '0x1', s: '0x1' }; break;
          }
          case 'eth_getTransactionReceipt': {
            const replacement = request.params[0] === REPLACEMENT_HASH;
            if (options.receiptMode === 'pending' || (options.originalPending && !replacement)) { value = null; break; }
            const logs: unknown[] = [];
            const event = (name: 'OrderRested' | 'OrderCancelled', orderId: bigint) => ({ address: POOL, topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: name, args: { orderId } }), data: '0x', blockNumber: '0x64', blockHash: `0x${'ab'.repeat(32)}`, transactionHash: request.params[0], transactionIndex: '0x0', logIndex: '0x0', removed: false });
            const call = !options.operations && options.sent && (!replacement || options.replacement === 'repriced') ? decodeFunctionData({ abi: orderWriteAbi, data: options.sent.data }) : null;
            if (call?.functionName === 'cancelOrder' && options.receiptMode !== 'reverted') { logs.push(event('OrderCancelled', call.args[0])); options.cancelled = true; }
            else if (call?.functionName === 'placeOrder' && !['reverted', 'no-events'].includes(options.receiptMode ?? 'resting')) {
              const args = call.args;
              const log = event('OrderRested', 7n);
              logs.push({ ...log, topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: 'OrderPlaced', args: { orderId: 7n } }), data: encodeAbiParameters(parseAbi(['function x((uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs) order)'])[0].inputs, [{ orderId: 7n, isBid: args[0], owner: ACCOUNT_A, userData: 0n, price: args[2], fullQuantity: args[3], quantityRemaining: options.receiptMode === 'filled' ? 0n : args[3], expireTimestampNs: args[4] }]) });
              if (options.receiptMode === 'filled') logs.push({ ...log, logIndex: '0x1', topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: 'OrderFilled', args: { takerOrderId: 7n, makerOrderId: 8n } }), data: encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], [args[3], 0n, 0n, args[2]]) });
            }
            value = { transactionHash: request.params[0], transactionIndex: '0x0', blockHash: `0x${'ab'.repeat(32)}`, blockNumber: '0x64', from: ACCOUNT_A, to: POOL, cumulativeGasUsed: '0x186a0', gasUsed: '0x186a0', effectiveGasPrice: '0x3b9aca00', contractAddress: null, logs: options.duplicateLogs ? [...logs, ...logs] : logs, logsBloom: `0x${'00'.repeat(256)}`, status: options.receiptMode === 'reverted' ? '0x0' : '0x1', type: '0x0' }; break;
          }
          case 'eth_chainId': value = options.wrongChain ? '0x1' : '0xc4cf'; break;
          case 'eth_blockNumber': value = '0x64'; break;
          case 'eth_getBlockByNumber': value = { number: request.params[0] === '0x0' ? '0x0' : '0x64', hash: request.params[0] === '0x0' && !options.wrongGenesis ? PERPS_CONFIG.genesisHash : `0x${'ab'.repeat(32)}`, timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`, transactions: [], gasLimit: '0x1000000', gasUsed: '0x0', size: '0x0', extraData: '0x' }; break;
          case 'eth_getCode': value = [ACCOUNT_A, ACCOUNT_B].includes(String(request.params[0]).toLowerCase()) ? '0x' : '0x6001'; break;
          case 'eth_getBalance': value = options.nativeBalance ?? '0xde0b6b3a7640000'; break;
          case 'eth_call': {
            const call = request.params[0] as { data: `0x${string}`; to: string; from?: string };
            const decoded = decodeFunctionData({ abi, data: call.data });
            const args = decoded.args ?? [];
            const accountA = String(args[0]).toLowerCase() === ACCOUNT_A;
            let answer: unknown;
            switch (decoded.functionName) {
              case 'getOperatorPermissionsRegistry': answer = operatorRegistry; break;
              case 'getStopOrderRegistry': answer = BASE; break;
              case 'isOperatorAuthorized': answer = options.permission ?? false; break;
              case 'somiPaymentPerOrder': answer = 150000000000000000n; break;
              case 'unclaimedSomi': answer = options.stopRefund ?? 0n; break;
              case 'getPendingOrder': answer = [options.stopLive ?? true, { orderWithTrigger: { order: { isBid: false, owner: ACCOUNT_A, userData: 0n, quantity: 1000000000n }, orderType: 0, triggerPrice: 11000000n, triggerOperator: 1, limitPrice: 10000000n, builder: '0x0000000000000000000000000000000000000000', builderFeeBpsTimes1k: 0n }, orderId: BigInt(String(args[0])), somiPaid: 150000000000000000n, siblingOrderId: 0n, intent: 0 }]; break;
              case 'approve': if (options.revertSimulation) throw new Error('Controlled operation rejection'); answer = true; break;
              case 'deposit': case 'withdraw': case 'setOperatorApprovalForPool': case 'cancelOrderFor': case 'reduceOrderFor': case 'cancelPendingOrder': case 'claimSomi': if (options.revertSimulation) throw new Error('Controlled operation rejection'); answer = undefined; break;
              case 'createPendingOrder': answer = 11n; break;
              case 'createLinkedPendingOrders': answer = [11n, 12n]; break;
              case 'placeOrderFor': if (options.revertSimulation) throw new Error('Controlled operation rejection'); answer = [true, 11n]; break;
              case 'placeOrder': if (options.revertSimulation) throw new Error('Controlled contract simulation revert'); answer = undefined; break;
              case 'cancelOrder': answer = undefined; break;
              case 'getReducingCapacity': answer = { positionSize: 1500000000n, pendingBidQuantity: 0n, pendingAskQuantity: 0n, pendingOppositeQuantity: 0n, effectiveReducingCapacity: 1500000000n }; break;
              case 'getMaxLeverage': case 'getMaxLeverageLimit': case 'getVoucherLeverageCap': answer = 20; break;
              case 'isVoucherMarketAllowed': case 'isolationAllowsMarket': answer = true; break;
              case 'isRestricted': answer = false; break;
              case 'quoteFundingPayer': answer = '0x0000000000000000000000000000000000000000'; break;
              case 'getMainFundedPrincipal': answer = 0n; break;
              case 'allowance': answer = options.bankAllowance ?? 0n; break;
              case 'getSystemConfig': answer = { marginBank: PERPS_CONFIG.marginBank, collateralToken: options.wrongSystem ? BASE : PERPS_CONFIG.collateral, perpPoolFactory: PERPS_CONFIG.factory, liquidationEngine: BASE, insuranceFund: BASE, feeRecipient: BASE, maxLeverageLimit: 20, fullyWired: true }; break;
              case 'decimals': answer = call.to.toLowerCase() === BASE ? 9 : 6; break;
              case 'symbol': answer = call.to.toLowerCase() === BASE ? 'MOCK' : 'TESTUSD'; break;
              case 'getPerpPoolStatuses': answer = [{ perpPool: POOL, baseToken: BASE, restricted: false }]; break;
              case 'isPerpPoolRegistered': answer = true; break;
              case 'marginBank': answer = PERPS_CONFIG.marginBank; break;
              case 'getOrderBookParameters': answer = { tickSize: 1000n, lotSize: 10000000n, minQuantity: 100000000n }; break;
              case 'getPerpPoolParameters': answer = { initialMarginBps: 500n, maintenanceMarginBps: 250n, closeOutMarginBps: 125n, maxOpenInterest: 100000000000n, maxPositionSize: 10000000000n, takerFeeBpsTimes1k: 0n, makerFeeBpsTimes1k: 0n, insuranceFundShareBps: 0n }; break;
              case 'tryGetMarkPrice': answer = [!options.unpriceable, options.unpriceable ? 0n : 12000000n]; break;
              case 'getIndexPrice': answer = [12000000n, BigInt(Math.floor(Date.now() / 1000))]; break;
              case 'getCurrentFundingRate': answer = 100000000000000n; break;
              case 'getOpenInterest': answer = 5000000000n; break;
              case 'getFundingParameters': answer = { fundingCalculationWindowSec: 28800n, fundingSettlementIntervalSec: 3600n, interestRatePerWindow: 0n, maxFundingRatePerWindow: 1n, dampener: 1n, emaSmoothingAlpha: 1n, maxOracleStalenessSec: 5n }; break;
              case 'getLastFundingUpdateTimestampNs': answer = BigInt(Date.now()) * 1000000n; break;
              case 'getBookLevels': answer = [{ price: 12000000n, quantity: 1500000000n }]; break;
              case 'getAccountState': answer = { unlockedCollateralBalance: accountA && !options.emptyMargin ? 100000000n : 0n, lockedCollateral: 0n, activePerpPools: accountA ? [POOL] : [] }; break;
              case 'getAccountHealth': if (options.failHealth) throw new Error('Controlled health failure'); answer = accountA ? [(options.riskFractionalLoss ? 99999998n : 103000000n) + (options.healthOffset ?? 0n), 900000n, 450000n, 225000n] : [0n, 0n, 0n, 0n]; break;
              case 'getMarginStatus': answer = 0; break;
              case 'getWithdrawableCollateral': answer = accountA ? 99000000n : 0n; break;
              case 'getCreditFloor': answer = 0n; break;
              case 'getCreditGranter': answer = '0x0000000000000000000000000000000000000000'; break;
              case 'isolated': answer = false; break;
              case 'balanceOf': answer = accountA ? 5000000n : 0n; break;
              case 'getOwnOpenOrders': answer = call.from?.toLowerCase() === ACCOUNT_A ? [7n] : []; break;
              case 'getPosition': answer = { size: accountA ? 1500000000n : 0n, avgEntryPrice: options.riskFractionalLoss ? 12000001n : 10000000n, entryFundingIndex: 0n, lastUpdatedTimestampNs: 0n }; break;
              case 'tryGetHealthSnapshot': answer = [!options.unpriceable, { oneBase: 1000000000n, markPrice: 12000000n, projectedCumulativeFunding: 0n, effectiveIMFBps: 500n, maintenanceMarginBps: 250n, closeOutMarginBps: 125n }]; break;
              case 'getOrder': answer = { orderId: 7n, isBid: true, owner: ACCOUNT_A, userData: 0n, price: 11000000n, fullQuantity: 1000000000n, quantityRemaining: options.cancelled || options.receiptMode === 'filled' || options.receiptMode === 'no-events' ? 0n : 1000000000n, expireTimestampNs: 0n }; break;
              default: throw new Error(`Unmodelled read ${decoded.functionName}`);
            }
            value = encodeFunctionResult({ abi, functionName: decoded.functionName!, result: answer });
            break;
          }
          default: throw new Error(`Unexpected RPC method ${request.method}`);
        }
        return { jsonrpc: '2.0', id: request.id, result: options.transform ? options.transform(request, value) : value };
      } catch (error) { return { jsonrpc: '2.0', id: request.id, error: { code: -32000, message: error instanceof Error ? error.message : 'Fixture failed' } }; }
  }
  return { calls, options };
}



