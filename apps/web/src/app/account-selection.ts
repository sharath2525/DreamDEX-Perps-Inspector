import { getAddress, isAddress, zeroAddress, type Address } from 'viem';
import { PERPS_CONFIG } from '@pei/perps-adapter';

const prefix = `pei.selection.v1.${PERPS_CONFIG.chainId}.${PERPS_CONFIG.genesisHash}`;
export const lastViewedKey = `${prefix}.view`;
export const selectionKey = (actor: Address) => `${prefix}.${actor.toLowerCase()}`;
export function publicAddress(value: unknown): Address | null {
  return typeof value === 'string' && isAddress(value) && value.toLowerCase() !== zeroAddress ? getAddress(value) : null;
}
export function remembered(key: string): Address | null {
  try { return publicAddress(localStorage.getItem(key)); } catch { return null; }
}
export function remember(key: string, address: Address | null): string {
  try { if (address) localStorage.setItem(key, address); else localStorage.removeItem(key); return ''; }
  catch { return 'Browser storage is unavailable. Account selection works for this session but cannot be remembered.'; }
}
