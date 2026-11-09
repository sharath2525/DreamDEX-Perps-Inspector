import { useQuery } from '@tanstack/react-query';
import { discoverMarkets, discoverTradingAccounts, readAccount, readMarket, PERPS_CONFIG } from '@pei/perps-adapter';
import type { Address } from 'viem';

const chainKey = [PERPS_CONFIG.chainId, PERPS_CONFIG.genesisHash] as const;
const options = { retry: false, refetchOnWindowFocus: false, refetchIntervalInBackground: false, gcTime: 0 } as const;
export function useTradingAccounts(actor: Address | null) {
  return useQuery({ queryKey: ['account-discovery', actor], enabled: !!actor,
    queryFn: ({ signal }) => discoverTradingAccounts(actor!, AbortSignal.any([signal, AbortSignal.timeout(18000)])),
    retry: false, staleTime: 60000, refetchOnWindowFocus: false });
}
export function useMarkets(enabled = true) {
  return useQuery({ ...options, enabled, queryKey: ['markets', ...chainKey], queryFn: ({ signal }) => discoverMarkets(signal), staleTime: 45_000, refetchInterval: 60_000 });
}
export function useMarket(pool: Address | null) {
  return useQuery({ ...options, queryKey: ['market', ...chainKey, pool], enabled: !!pool, queryFn: ({ signal }) => readMarket(pool!, signal), staleTime: 10_000, refetchInterval: 15_000 });
}
export function useAccountSnapshot(owner: Address | null) {
  return useQuery({ ...options, queryKey: ['account', ...chainKey, owner?.toLowerCase() ?? null], enabled: !!owner, queryFn: ({ signal }) => readAccount(owner!, signal), staleTime: 20_000, refetchInterval: 30_000 });
}
