import type { Address, Hash } from 'viem';

/** Transport/data outcomes must not collapse into an empty successful response. */
export type DataState<T> =
  | { status: 'not-requested' }
  | { status: 'loading' }
  | { status: 'available'; data: T; provenance: Provenance }
  | { status: 'stale'; data: T; provenance: Provenance; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };

export interface Provenance {
  source: 'chain' | 'indexer' | 'local';
  chainId: number;
  genesisHash: Hash;
  asOfBlock?: bigint;
  receivedAt: string;
  coverage: 'complete' | 'partial' | 'unknown';
}

export interface AccountIdentity {
  owner: Address;
  actor?: Address;
  role: 'viewer' | 'owner' | 'operator';
}
