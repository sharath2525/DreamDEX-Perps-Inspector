import { createContext, useContext } from 'react';
import type { Address } from 'viem';

export interface WalletProvider {
  request(args: { method: 'eth_requestAccounts' | 'eth_accounts' | 'eth_chainId' | 'eth_getBlockByNumber' | 'eth_sendTransaction' | 'wallet_switchEthereumChain'; params?: readonly unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}
export interface WalletChoice { id: string; name: string; provider: WalletProvider }
export interface AccountContextValue {
  owner: Address | null; actor: Address | null; chainId: number | null;
  tradingOwner: Address | null; viewOnly: boolean; identityVersion: number; storageWarning: string;
  choices: WalletChoice[]; connecting: boolean; walletError: string;
  signingSession(): { provider: WalletProvider } | null;
  inspect(address: Address | null): void; connect(id: string): Promise<void>; disconnect(): void;
  selectTrading(address: Address): void; resumeTrading(): void; forgetTrading(): void; switchNetwork(): Promise<void>;
}
export const AccountContext = createContext<AccountContextValue | null>(null);
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('Account provider is missing.');
  return value;
}
