import { defineChain } from "@reown/appkit/networks";
import * as glChains from "genlayer-js/chains";
import { CONTRACT_ADDRESSES } from "./contractAddresses";

export type NetworkId = "studionet" | "testnetAsimov";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  glChain: (typeof glChains)["studionet"];
  contractAddress: `0x${string}`;
  explorerTxUrl: (hash: string) => string;
  faucetUrl?: string;
  gasless?: boolean;
  // Real protocol-level appeal (genlayer-js's appealTransaction/getMinAppealBond)
  // needs feeManagerContract/roundsStorageContract wired into the chain preset —
  // studionet's simplified hosted preset doesn't have them, only testnetAsimov does.
  supportsAppeal?: boolean;
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
    contractAddress: CONTRACT_ADDRESSES.studionet,
    explorerTxUrl: (hash) => `https://genlayer-explorer.vercel.app/tx/${hash}`,
    gasless: true,
  },
  testnetAsimov: {
    id: "testnetAsimov",
    label: "Testnet Asimov",
    glChain: glChains.testnetAsimov,
    contractAddress: CONTRACT_ADDRESSES.testnetAsimov,
    explorerTxUrl: (hash) => `https://explorer-asimov.genlayer.com/tx/${hash}`,
    faucetUrl: "https://testnet-faucet.genlayer.foundation",
    supportsAppeal: true,
  },
};

export const NETWORK_LIST = Object.values(NETWORKS);
export const DEFAULT_NETWORK: NetworkId = "studionet";

export const REOWN_NETWORKS = [
  toReownNetwork(NETWORKS.studionet.glChain),
  toReownNetwork(NETWORKS.testnetAsimov.glChain),
] as const;
