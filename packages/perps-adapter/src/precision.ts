/** Parse without rounding, exponent notation, floats or an implicit 18-decimal scale. */
export function exactUnits(text: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Unsupported asset precision.');
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(text) || text.length > 100) throw new Error('Use a positive decimal number without spaces or exponent notation.');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) throw new Error(`At most ${decimals} decimal places are allowed; values are never rounded.`);
  const value = BigInt(whole! + fraction.padEnd(decimals, '0'));
  if (value <= 0n || value >= 2n ** 256n) throw new Error('Amount must be positive and fit uint256.');
  return value;
}
export function validateGrid(price: bigint, quantity: bigint, tick: bigint, lot: bigint, minimum: bigint) {
  if (tick <= 0n || lot <= 0n || minimum <= 0n) throw new Error('Invalid market grid.');
  if (price <= 0n || price % tick !== 0n) throw new Error('Price must be an exact multiple of the market tick.');
  if (quantity < minimum || quantity % lot !== 0n) throw new Error('Quantity must meet the minimum and be an exact lot multiple.');
}
export function bookEstimate(levels: readonly { price: bigint; quantity: bigint }[], isBid: boolean, price: bigint, quantity: bigint) {
  let remaining = quantity, weighted = 0n;
  for (const level of [...levels].sort((a, b) => a.price === b.price ? 0 : (a.price < b.price ? -1 : 1) * (isBid ? 1 : -1))) {
    if ((isBid && level.price > price) || (!isBid && level.price < price)) continue;
    const taken = level.quantity < remaining ? level.quantity : remaining;
    remaining -= taken; weighted += taken * level.price;
    if (remaining === 0n) break;
  }
  const visibleQuantity = quantity - remaining;
  return { visibleQuantity, uncoveredQuantity: remaining, averagePrice: visibleQuantity ? weighted / visibleQuantity : null };
}
