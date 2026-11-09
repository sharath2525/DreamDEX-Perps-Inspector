import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import type { Address, Hash } from 'viem';

/** Expected deployment, researched 2026-11-03 IST. Not a live verification result. */
export const PERPS_CONFIG = {
  chainId: hidekiTestnet.id,
  chainName: hidekiTestnet.name,
  region: 'Tokyo',
  nativeSymbol: hidekiTestnet.nativeCurrency.symbol,
  sdkVersion: '0.32.1',
  rpcUrl: 'https://api.hideki2.infra.testnet.somnia.network',
  wsUrl: 'wss://api.hideki2.infra.testnet.somnia.network/ws',
  indexerUrl: 'https://hideki-dev.smk.somnia.host/v1/graphql',
  genesisHash: '0x555de6145260a388241bea0f9328d57335d330d5a0fbb329de1a4fd1c7f2eb25' satisfies Hash,
  marginBank: '0x478769E1177C0773c43A593DCCc4Ad15F15F1394' satisfies Address,
  collateral: '0xed7993A74dAe1e6656B704A424DcD8711aAf4F72' satisfies Address,
  factory: '0xE631fAEE547baeE07353E290f0562ea67d856560' satisfies Address,
} as const;

/** Capabilities describe code paths; live signed-trade acceptance remains pending. */
export const FOUNDATION_CAPABILITIES = {
  liveReads: true,
  walletConnection: true,
  transactionSigning: true,
  trading: true,
} as const;

export const OFFICIAL_LINKS = {
  developers: 'https://app.testnet.dreamdex.io/docs/developers/perps-testnet',
  trading: 'https://app.testnet.dreamdex.io/docs/trading/perps-testnet',
  botLinking: 'https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot',
} as const;
