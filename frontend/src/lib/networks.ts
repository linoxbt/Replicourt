import { defineChain } from "@reown/appkit/networks";
import * as glChains from "genlayer-js/chains";

export type NetworkId = "studionet" | "testnetAsimov";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  glChain: (typeof glChains)["studionet"];
  contractAddress: `0x${string}`;
  explorerTxUrl: (hash: string) => string;
  faucetUrl?: string;
  gasless?: boolean;
}

// Reown's networks are viem-shaped Chain objects. genlayer-js's chain presets are
// already that shape (id/name/nativeCurrency/rpcUrls/blockExplorers) plus GenLayer
// extras (consensusMainContract, etc.) — reuse them as the single source of truth
// for RPC/currency/explorer instead of duplicating that data for the wallet UI.
function toReownNetwork(glChain: (typeof glChains)["studionet"]) {
  return defineChain({
    id: glChain.id,
    caipNetworkId: `eip155:${glChain.id}`,
    chainNamespace: "eip155",
    name: glChain.name,
    nativeCurrency: glChain.nativeCurrency,
    rpcUrls: glChain.rpcUrls,
    blockExplorers: glChain.blockExplorers,
  });
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  studionet: {
    id: "studionet",
    label: "Studionet",
    glChain: glChains.studionet,
    contractAddress: "0xbafe748FE66B7fB41046E81040195431439dE492",
    explorerTxUrl: (hash) => `https://genlayer-explorer.vercel.app/tx/${hash}`,
    gasless: true,
  },
  testnetAsimov: {
    id: "testnetAsimov",
    label: "Testnet Asimov",
    glChain: glChains.testnetAsimov,
    contractAddress: "0xf6a56C9ec97E80479c0e430A10FE47663bBA61D5",
    explorerTxUrl: (hash) => `https://explorer-asimov.genlayer.com/tx/${hash}`,
    faucetUrl: "https://testnet-faucet.genlayer.foundation",
  },
};

export const NETWORK_LIST = Object.values(NETWORKS);
export const DEFAULT_NETWORK: NetworkId = "studionet";

export const REOWN_NETWORKS = [
  toReownNetwork(NETWORKS.studionet.glChain),
  toReownNetwork(NETWORKS.testnetAsimov.glChain),
] as const;
