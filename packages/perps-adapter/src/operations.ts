import { encodeFunctionData, erc20Abi, isAddress, parseAbi, toFunctionSelector, zeroAddress, type Address, type Hash, type Hex } from 'viem';
import type { UnsignedCall } from '@somnia-chain/markets-sdk';
import { PERPS_CONFIG as config } from './config';
import { bankAbi, poolAbi } from './abi';
import { indexed, readMarket, sameAddress, verifyDeployment } from './read';
import { exactUnits, validateGrid } from './precision';
import { withSdk } from './trade';
import { uniqueReceiptLogs } from './diagnostics';

export const operationKinds = ['approve', 'revoke-allowance', 'deposit', 'withdraw', 'voucher', 'stop-grant', 'stop-revoke', 'stop-create', 'stop-cancel', 'stop-refund', 'delegate-grant', 'delegate-revoke', 'delegate-place', 'delegate-cancel', 'delegate-reduce'] as const;
export type OperationKind = typeof operationKinds[number];
export interface OperationDraft { kind: OperationKind; owner: Address; actor: Address; pool: Address; operator: Address; amount: string; gasBudget: string; orderId: string; isBid: boolean; price: string; quantity: string; trigger: string; triggerOperator: 0 | 1; pairedTrigger: string; expiryMinutes: string }
export const operatorRegistry = '0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a' as Address;
export const operationsAbi = parseAbi([
  'function deposit(uint256 amount)', 'function withdraw(uint256 amount)', 'function claim()',
  'function quoteFundingPayer(address account) view returns (address)',
  'function getMainFundedPrincipal(address account) view returns (uint256)',
  'function getStopOrderRegistry(address pool) view returns (address)',
  'function getOperatorPermissionsRegistry() view returns (address)',
  'function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)',
  'function setOperatorApprovalForPool(address pool, address operator, bytes4[] selectors, bool approved)',
  'function somiPaymentPerOrder() view returns (uint256)', 'function unclaimedSomi(address account) view returns (uint256)', 'function claimSomi()',
  'function cancelPendingOrder(uint128 orderId)',
  'function getPendingOrder(uint128 orderId) view returns (bool live, (((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger, uint128 orderId, uint256 somiPaid, uint128 siblingOrderId, uint8 intent) order)',
  'function createPendingOrder(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger) payable returns (uint128)',
  'function createLinkedPendingOrders(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) gteOrder, ((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) lteOrder) payable returns (uint128,uint128)',
  'function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)',
  'function cancelOrderFor(address owner, uint128 orderId)',
  'function reduceOrderFor(address owner, uint128 orderId, uint256 newQuantityRemaining)',
]);
export const delegatedSelectors = [
  toFunctionSelector('placeOrderFor(address,bool,uint64,uint256,uint256,uint64,uint8,uint8,address,uint96)'),
  toFunctionSelector('cancelOrderFor(address,uint128)'), toFunctionSelector('reduceOrderFor(address,uint128,uint256)'),
] as const;
function id(value: string) { if (!/^\d+$/.test(value) || BigInt(value) >= 2n ** 128n) throw new Error('Order ID must be a uint128 decimal integer.'); return BigInt(value); }
export async function readOperationAccount(owner: Address, signal: AbortSignal) {
  const { client, blockNumber, decimals, observedAt } = await verifyDeployment(signal);
  const [state, withdrawable, floor, allowance, balance, granter, fundingPayer, mainPrincipal] = await Promise.all([
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getAccountState', args: [owner], blockNumber }),
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getWithdrawableCollateral', args: [owner], blockNumber }),
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getCreditFloor', args: [owner], blockNumber }),
    client.readContract({ address: config.collateral, abi: erc20Abi, functionName: 'allowance', args: [owner, config.marginBank], blockNumber }),
    client.readContract({ address: config.collateral, abi: erc20Abi, functionName: 'balanceOf', args: [owner], blockNumber }),
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getCreditGranter', blockNumber }),
    client.readContract({ address: config.marginBank, abi: operationsAbi, functionName: 'quoteFundingPayer', args: [owner], blockNumber }),
    client.readContract({ address: config.marginBank, abi: operationsAbi, functionName: 'getMainFundedPrincipal', args: [owner], blockNumber }),
  ]);
  return { owner, blockNumber, observedAt, decimals, unlocked: state.unlockedCollateralBalance, locked: state.lockedCollateral, withdrawable, floor, allowance, balance, granter, fundingPayer, mainPrincipal };
}
export async function readPermissions(owner: Address, operator: Address, pool: Address, signal: AbortSignal) {
  await readMarket(pool, signal);
  const { client, blockNumber } = await verifyDeployment(signal);
  const registry = await client.readContract({ address: pool, abi: operationsAbi, functionName: 'getOperatorPermissionsRegistry', blockNumber });
  const code = await client.getCode({ address: registry, blockNumber });
  if (!sameAddress(registry, operatorRegistry) || !code || code === '0x') throw new Error('Operator registry wiring does not match the verified deployment.');
  const allowed = await Promise.all(delegatedSelectors.map(selector => client.readContract({ address: pool, abi: operationsAbi, functionName: 'isOperatorAuthorized', args: [owner, operator, selector], blockNumber })));
  return { owner, operator, pool, registry, blockNumber, observedAt: Date.now(), place: allowed[0]!, cancel: allowed[1]!, reduce: allowed[2]! };
}
export async function readStopContext(owner: Address, pool: Address, signal: AbortSignal) {
  const market = await readMarket(pool, signal);
  const { client, blockNumber } = await verifyDeployment(signal);
  const registry = await client.readContract({ address: config.factory, abi: operationsAbi, functionName: 'getStopOrderRegistry', args: [pool], blockNumber });
  const code = await client.getCode({ address: registry, blockNumber });
  if (registry === zeroAddress || !code || code === '0x') throw new Error('No deployed stop registry was established for this market.');
  const [payment, refund, permission, position] = await Promise.all([
    client.readContract({ address: registry, abi: operationsAbi, functionName: 'somiPaymentPerOrder', blockNumber }),
    client.readContract({ address: registry, abi: operationsAbi, functionName: 'unclaimedSomi', args: [owner], blockNumber }),
    readPermissions(owner, registry, pool, signal),
    client.readContract({ address: config.marginBank, abi: bankAbi, functionName: 'getPosition', args: [owner, pool], blockNumber }),
  ]);
  return { registry, pool, owner, payment, refund, permission, position: position.size, market, blockNumber, observedAt: Date.now() };
}
export async function listOwnerStops(owner: Address, pool: Address, signal: AbortSignal) {
  const context = await readStopContext(owner, pool, signal);
  const rows = await indexed(signal, sdk => sdk.listPerpStopOrders({ account: owner, pool, status: ['PENDING', 'TRIGGERED', 'TRIGGER_FAILED', 'CANCELLED'], limit: 50 }));
  // Explicit fields only. Indexed status is not live liveness; use the getter for writes.
  return { registry: context.registry, payment: context.payment, refund: context.refund, blockNumber: context.blockNumber, observedAt: Date.now(), rows: rows.map(row => {
    if (!sameAddress(row.owner, owner) || !sameAddress(row.registry, context.registry)) throw new Error('Stop listing scope mismatch.');
    return { orderId: row.orderIdRaw, status: row.status, triggerPrice: row.triggerPrice, quantity: row.quantity, dropReason: row.dropReason, siblingOrderId: row.siblingOrderId, cancelReason: row.cancelReason };
  }), coverage: 'Newest 50 indexed stops; listing may omit older or unindexed stops. Known IDs can be checked directly.' };
}
export async function readKnownStop(owner: Address, pool: Address, orderId: string, signal: AbortSignal) {
  const context = await readStopContext(owner, pool, signal);
  const read = await withSdk(signal, sdk => sdk.getPerpStopOrder({ registry: context.registry, orderId: id(orderId) }));
  if (read && !sameAddress(read.owner, owner)) throw new Error('Stop belongs to another owner.');
  return { owner, pool, registry: context.registry, orderId, observedAt: Date.now(), live: !!read, terms: read ? { isBid: read.isBid, quantity: read.quantity, triggerPrice: read.triggerPrice, limitPrice: read.limitPrice, siblingOrderId: read.siblingOrderId, intent: read.intent, somiPaid: read.somiPaid } : null };
}
export async function prepareOperation(draft: OperationDraft, signal: AbortSignal, fixedExpiry?: bigint) {
  if (!operationKinds.includes(draft.kind) || !isAddress(draft.owner) || !isAddress(draft.actor) || draft.owner === zeroAddress || draft.actor === zeroAddress) throw new Error('Invalid operation identity.');
  const delegated = ['delegate-place', 'delegate-cancel', 'delegate-reduce'].includes(draft.kind);
  if (!delegated && !sameAddress(draft.actor, draft.owner)) throw new Error('This action requires the account owner, not a linked operator.');
  if (delegated && sameAddress(draft.actor, draft.owner)) throw new Error('Delegated mode requires distinct owner and gas-paying actor. Use Trade for your own account.');
  const before = await readOperationAccount(draft.owner, signal);
  if (['deposit', 'withdraw', 'voucher'].includes(draft.kind) && (before.fundingPayer !== zeroAddress || before.mainPrincipal > 0n)) throw new Error('Linked main-wallet funding needs its own funding and repayment review. These margin actions are blocked for this account.');
  const { client, blockNumber } = await verifyDeployment(signal);
  const code = await client.getCode({ address: draft.actor, blockNumber });
  if (code && code !== '0x') throw new Error('The signing actor must be a directly connected EOA.');
  let call: UnsignedCall; let expiry: bigint | undefined; let detail: string;
  const make = (to: Address, data: Hex, value = 0n): UnsignedCall => ({ chainId: config.chainId, to, data, value, description: draft.kind });
  const builder = <T>(work: (trader: ReturnType<import('@somnia-chain/markets-sdk').SomniaMarkets['client']['createTrader']>) => Promise<T>) => withSdk(signal, sdk => work(sdk.createTrader({ executor: { actor: draft.actor, chainId: config.chainId, execute: async () => { throw new Error('Build-only executor'); } } })));
  if (['approve', 'revoke-allowance', 'deposit', 'withdraw'].includes(draft.kind)) {
    const amount = draft.kind === 'revoke-allowance' ? 0n : exactUnits(draft.amount, before.decimals);
    if (draft.kind === 'approve' && before.allowance !== 0n) throw new Error('Reset the existing bank allowance to zero before setting a new exact amount.');
    if (draft.kind === 'deposit' && (amount > before.allowance || amount > before.balance)) throw new Error('Deposit exceeds wallet balance or the explicit bank allowance. Approve separately first.');
    if (draft.kind === 'withdraw' && amount > before.withdrawable) throw new Error('Withdrawal exceeds the current withdrawable balance; voucher floor cannot be withdrawn.');
    if (draft.kind === 'approve' || draft.kind === 'revoke-allowance') call = make(config.collateral, encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [config.marginBank, amount] }));
    else { call = await builder(async trader => draft.kind === 'deposit' ? (await trader.buildDepositMargin({ marginBank: config.marginBank, amount, autoApprove: false })).deposit : trader.buildWithdrawMargin({ marginBank: config.marginBank, amount }));
      const expected = encodeFunctionData({ abi: operationsAbi, functionName: draft.kind === 'deposit' ? 'deposit' : 'withdraw', args: [amount] });
      if (!sameAddress(call.to, config.marginBank) || call.data !== expected || call.value !== 0n) throw new Error('Margin builder differs from the reviewed intent.'); }
    detail = `${draft.kind}: ${amount} raw ${before.decimals}-decimal USDso. Bank spender ${config.marginBank}. Owner ${draft.owner}. No other transfers.`;
  } else if (draft.kind === 'voucher') {
    const eligibility = await withSdk(signal, sdk => sdk.getPerpVoucherEligibility(config.marginBank, draft.owner));
    if (!eligibility.eligible) throw new Error(`Voucher is ineligible: ${eligibility.reason}.`);
    const distributorCode = await client.getCode({ address: before.granter });
    if (before.granter === zeroAddress || !distributorCode || distributorCode === '0x') throw new Error('Voucher distributor has no deployed code.');
    call = await builder(trader => trader.buildClaimPerpVoucher({ marginBank: config.marginBank }));
    if (!sameAddress(call.to, before.granter) || call.data !== encodeFunctionData({ abi: operationsAbi, functionName: 'claim' }) || call.value !== 0n) throw new Error('Voucher distributor or calldata changed.');
    detail = `Nonwithdrawable paper credit: ${eligibility.grantAmount} raw USDso. Eligibility is rechecked; simulation can still reject it.`;
  } else if (draft.kind.startsWith('stop-')) {
    const context = await readStopContext(draft.owner, draft.pool, signal);
    const { registry, market } = context;
    if (draft.kind === 'stop-grant' || draft.kind === 'stop-revoke') {
      call = make(operatorRegistry, encodeFunctionData({ abi: operationsAbi, functionName: 'setOperatorApprovalForPool', args: [draft.pool, registry, [delegatedSelectors[0]], draft.kind === 'stop-grant'] }));
      detail = `Only ${registry} may place for this owner on ${draft.pool}. Revocation does not cancel already armed stops; inspect and cancel them separately.`;
    } else if (draft.kind === 'stop-refund') {
      if (context.refund <= 0n) throw new Error('No unclaimed native refund exists.');
      call = make(registry, encodeFunctionData({ abi: operationsAbi, functionName: 'claimSomi' })); detail = `Claim ${context.refund} wei native credit to the signing owner.`;
    } else if (draft.kind === 'stop-cancel') {
      const orderId = id(draft.orderId);
      const live = await withSdk(signal, sdk => sdk.getPerpStopOrder({ registry, orderId }));
      if (!live || !sameAddress(live.owner, draft.owner)) throw new Error('No live stop owned by this account was found.');
      call = await builder(async trader => trader.buildCancelPerpStopOrder({ registry, orderId }));
      if (call.to !== registry || call.data !== encodeFunctionData({ abi: operationsAbi, functionName: 'cancelPendingOrder', args: [orderId] })) throw new Error('Stop cancellation calldata mismatch.');
      detail = 'Cancel this live leg. Its sibling stays armed; cancel that ID separately. Verify native refund or unclaimed credit after mining.';
    } else {
      if (!context.permission.place) throw new Error('Stop registry lacks placement permission. Review a separate pool-scoped grant first.');
      if (context.position === 0n || (context.position > 0n) === draft.isBid) throw new Error('A reduce-only stop must oppose an existing position.');
      const quantity = exactUnits(draft.quantity, market.metadata.baseDecimals), triggerPrice = exactUnits(draft.trigger, market.decimals), limitPrice = exactUnits(draft.price, market.decimals);
      validateGrid(limitPrice, quantity, market.metadata.tickSize, market.metadata.lotSize, market.metadata.minQuantity);
      if (quantity > (context.position < 0n ? -context.position : context.position) || triggerPrice % market.metadata.tickSize !== 0n) throw new Error('Stop size exceeds the position or trigger is off the market tick.');
      const leg = { isBid: draft.isBid, quantity, triggerPrice, triggerOperator: draft.triggerOperator, stopOrderType: 0 as const, limitPrice };
      const pair = draft.pairedTrigger ? { ...leg, triggerPrice: exactUnits(draft.pairedTrigger, market.decimals), triggerOperator: (draft.triggerOperator === 0 ? 1 : 0) as 0 | 1 } : undefined;
      if (pair && pair.triggerPrice % market.metadata.tickSize !== 0n) throw new Error('Paired trigger is off the market tick.');
      const built = await builder(trader => trader.buildPlacePerpStopOrder({ ...leg, ...(pair ? { pair } : {}), pool: draft.pool, registry, somiPayment: context.payment, skipOperatorApproval: true, intent: 'reduceOnly' }));
      const tuple = (item: typeof leg) => ({ order: { isBid: item.isBid, owner: draft.owner, userData: 0n, quantity: item.quantity }, orderType: 0, triggerPrice: item.triggerPrice, triggerOperator: item.triggerOperator, limitPrice: item.limitPrice, builder: zeroAddress, builderFeeBpsTimes1k: 0n });
      const expected = pair ? encodeFunctionData({ abi: operationsAbi, functionName: 'createLinkedPendingOrders', args: leg.triggerOperator === 0 ? [tuple(leg), tuple(pair)] : [tuple(pair), tuple(leg)] }) : encodeFunctionData({ abi: operationsAbi, functionName: 'createPendingOrder', args: [tuple(leg)] });
      call = built.stopOrder;
      if (built.operatorApproval || !sameAddress(call.to, registry) || call.data !== expected || call.value !== context.payment * (pair ? 2n : 1n)) throw new Error('Stop builder differs from reviewed payment, permissions or terms.');
      detail = `Native payment ${call.value} wei plus gas. Fixed-size reduce-only LIMIT stop${pair ? ' pair' : ''}; both legs use the reviewed limit. Triggering need not fill, and consumes payment. No guaranteed stop protection.`;
    }
  } else {
    const permission = await readPermissions(draft.owner, delegated ? draft.actor : draft.operator, draft.pool, signal);
    if (draft.kind === 'delegate-grant' || draft.kind === 'delegate-revoke') {
      if (!isAddress(draft.operator) || draft.operator === zeroAddress || sameAddress(draft.operator, draft.owner)) throw new Error('Select a distinct nonzero operator.');
      call = make(permission.registry, encodeFunctionData({ abi: operationsAbi, functionName: 'setOperatorApprovalForPool', args: [draft.pool, draft.operator, [...delegatedSelectors], draft.kind === 'delegate-grant'] }));
      detail = 'Pool-scoped place/cancel/reduce permission only. No withdrawal or owner-stop authority. Revocation leaves existing orders on the book.';
    } else {
      const market = await readMarket(draft.pool, signal);
      if (draft.kind === 'delegate-place') {
        if (!permission.place) throw new Error('Operator placement permission is absent or revoked.');
        const price = exactUnits(draft.price, market.decimals), quantity = exactUnits(draft.quantity, market.metadata.baseDecimals);
        validateGrid(price, quantity, market.metadata.tickSize, market.metadata.lotSize, market.metadata.minQuantity);
        if (!/^\d+$/.test(draft.expiryMinutes) || Number(draft.expiryMinutes) < 1 || Number(draft.expiryMinutes) > 1440) throw new Error('Expiry must be 1–1440 minutes.');
        expiry = fixedExpiry ?? BigInt(Date.now() + Number(draft.expiryMinutes) * 60000) * 1000000n;
        if (expiry < BigInt(Date.now() + 30000) * 1000000n || expiry >= 2n ** 64n) throw new Error('Delegated order expiry is too close.');
        const margin = await withSdk(signal, sdk => sdk.previewPerpOrderMargin({ pool: draft.pool, marginBank: config.marginBank, account: draft.owner, isBid: draft.isBid, price, quantity, autoPull: false }));
        if (!margin.priceable || !margin.sufficient || margin.fundingPayer || margin.topUpRequired > 0n) throw new Error('Delegated order requires sufficient prefunded owner margin without linked funding.');
        call = make(draft.pool, encodeFunctionData({ abi: operationsAbi, functionName: 'placeOrderFor', args: [draft.owner, draft.isBid, 0n, price, quantity, expiry, 3, 0, zeroAddress, 0n] }));
        detail = `Post-only delegated order. Owner ${draft.owner} receives exposure; actor ${draft.actor} pays gas. No ordinary reduce-only guarantee.`;
      } else {
        const reducing = draft.kind === 'delegate-reduce';
        if (!(reducing ? permission.reduce : permission.cancel)) throw new Error('Required operator permission is absent or revoked.');
        const orderId = id(draft.orderId), order = await client.readContract({ address: draft.pool, abi: poolAbi, functionName: 'getOrder', args: [orderId] });
        if (order.orderId !== orderId || !sameAddress(order.owner, draft.owner) || order.quantityRemaining === 0n) throw new Error('Resting order does not belong to the requested owner.');
        const quantity = reducing ? exactUnits(draft.quantity, market.metadata.baseDecimals) : 0n;
        if (reducing && (quantity >= order.quantityRemaining || quantity % market.metadata.lotSize !== 0n || quantity < market.metadata.minQuantity)) throw new Error('New remainder must be smaller, positive and on the market grid.');
        call = make(draft.pool, reducing ? encodeFunctionData({ abi: operationsAbi, functionName: 'reduceOrderFor', args: [draft.owner, orderId, quantity] }) : encodeFunctionData({ abi: operationsAbi, functionName: 'cancelOrderFor', args: [draft.owner, orderId] }));
        detail = 'Changes a resting order, not the open position. Fills still settle to the owner. Inspect remainder and exposure afterward.';
      }
    }
  }
  if (call.chainId !== config.chainId || call.value < 0n) throw new Error('Unexpected operation chain or value.');
  const request = { account: draft.actor, to: call.to, data: call.data, value: call.value };
  await client.call(request); const [gas, gasPrice, balance, nonce] = await Promise.all([client.estimateGas(request), client.getGasPrice(), client.getBalance({ address: draft.actor }), client.getTransactionCount({ address: draft.actor, blockTag: 'pending' })]);
  const gasLimit = (gas * 130n + 99n) / 100n, feeCap = gasPrice * 2n, maximumGasCost = gasLimit * feeCap, gasBudget = exactUnits(draft.gasBudget, 18);
  if (gas <= 0n || gasPrice <= 0n || maximumGasCost > gasBudget || maximumGasCost + call.value > balance) throw new Error('Gas ceiling exceeds the reviewed budget or actor STT cannot cover payment plus gas.');
  signal.throwIfAborted();
  return { draft, call, detail, before, expiry, nonce, gasLimit, gasPrice: feeCap, gasBudget, maximumGasCost, checkedAt: Date.now() };
}
export type PreparedOperation = Awaited<ReturnType<typeof prepareOperation>>;
export async function inspectOperation(reference: { actor: Address; to: Address; data: Hex; value: string; owner: Address; kind: OperationKind; nonce: number }, hash: Hash, signal: AbortSignal) {
  const { client } = await verifyDeployment(signal);
  const [transaction, receipt] = await Promise.all([client.getTransaction({ hash }), client.getTransactionReceipt({ hash })]);
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (!sameAddress(transaction.from, reference.actor) || !transaction.to || !sameAddress(transaction.to, reference.to) || transaction.input !== reference.data || transaction.value !== BigInt(reference.value) || transaction.nonce !== reference.nonce || transaction.chainId !== config.chainId || receipt.blockHash !== block.hash || transaction.blockHash !== block.hash) throw new Error('Receipt does not canonically match the recorded actor, nonce, call, value and chain.');
  const after = await readOperationAccount(reference.owner, signal);
  const { decodePerpStopOrderIds, decodePlaceOrder } = await import('@somnia-chain/markets-sdk');
  const clean = { ...receipt, logs: uniqueReceiptLogs(receipt.logs) };
  const stopIds = receipt.status === 'success' && reference.kind === 'stop-create' ? decodePerpStopOrderIds(clean.logs, reference.to).filter(value => value !== undefined).map(String) : [];
  const order = receipt.status === 'success' && reference.kind === 'delegate-place' ? decodePlaceOrder(clean, reference.to) : null;
  const fills = order?.fills.map(fill => ({ takerOrderId: fill.takerOrderId.toString(), makerOrderId: fill.makerOrderId.toString(), quantityFilled: fill.quantityFilled.toString(), fillPrice: fill.fillPrice.toString() })) ?? [];
  return { hash, blockNumber: receipt.blockNumber.toString(), blockHash: receipt.blockHash, status: receipt.status, gasUsed: receipt.gasUsed.toString(), gasCost: (receipt.gasUsed * receipt.effectiveGasPrice).toString(), stopIds, orderId: order?.orderId?.toString() ?? null, fills, after };
}
