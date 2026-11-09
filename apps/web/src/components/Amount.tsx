import { amount } from '@pei/perps-adapter';

/** Display shortening never changes stored bigint values. The complete value is accessible. */
export function Amount({ value, decimals }: { value: bigint | undefined; decimals: number | undefined }) {
  const exact = amount(value, decimals);
  const [integer, fraction] = exact.split('.');
  const text = fraction && fraction.length > 6 ? `${integer}.${fraction.slice(0, 6)}…` : exact;
  return <span title={exact} aria-label={text === exact ? undefined : exact}>{text}</span>;
}
