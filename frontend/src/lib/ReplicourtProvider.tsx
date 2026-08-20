import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createClient } from "genlayer-js";
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from "@reown/appkit/react";
import { NETWORKS, NETWORK_LIST, DEFAULT_NETWORK, type NetworkConfig, type NetworkId } from "./networks";
import { REOWN_ENABLED } from "./appkit";
import * as api from "./contractApi";
import type { ApiCtx, Claim, EvidenceEvent, Challenge } from "./contractApi";

const NETWORK_STORAGE_KEY = "replicourt.network";

interface BoundApi {
  getAllClaims: () => Promise<Claim[]>;
  getClaim: (claimId: string) => Promise<Claim>;
  getEvidenceTrail: (claimId: string) => Promise<EvidenceEvent[]>;
  getChallengesForClaim: (claimId: string) => Promise<Challenge[]>;
  postClaim: (params: Parameters<typeof api.postClaim>[1]) => Promise<`0x${string}`>;
  challenge: (params: Parameters<typeof api.challenge>[1]) => Promise<`0x${string}`>;
  escalate: (params: Parameters<typeof api.escalate>[1]) => Promise<`0x${string}`>;
  finalizeTx: (txId: `0x${string}`) => Promise<`0x${string}`>;
  getMinAppealBond: (txId: `0x${string}`) => Promise<bigint>;
  appealTx: (txId: `0x${string}`, valueWei: bigint) => Promise<unknown>;
}

interface ReplicourtContextValue {
  networkId: NetworkId;
  network: NetworkConfig;
  networks: NetworkConfig[];
  setNetworkId: (id: NetworkId) => void;
  address: string | undefined;
  isConnected: boolean;
  reownEnabled: boolean;
  connect: () => void;
  disconnect: () => void;
  api: BoundApi;
}

const ReplicourtContext = createContext<ReplicourtContextValue | null>(null);

function useNetworkState() {
  const [networkId, setNetworkIdState] = useState<NetworkId>(() => {
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY) as NetworkId | null;
    return stored && NETWORKS[stored] ? stored : DEFAULT_NETWORK;
  });
  const setNetworkId = useCallback((id: NetworkId) => {
    setNetworkIdState(id);
    localStorage.setItem(NETWORK_STORAGE_KEY, id);
  }, []);
  return { networkId, setNetworkId };
}

function useBoundApi(ctx: ApiCtx): BoundApi {
  return useMemo(
    () => ({
      getAllClaims: () => api.getAllClaims(ctx),
      getClaim: (claimId: string) => api.getClaim(ctx, claimId),
      getEvidenceTrail: (claimId: string) => api.getEvidenceTrail(ctx, claimId),
      getChallengesForClaim: (claimId: string) => api.getChallengesForClaim(ctx, claimId),
      postClaim: (params) => api.postClaim(ctx, params),
      challenge: (params) => api.challenge(ctx, params),
      escalate: (params) => api.escalate(ctx, params),
      finalizeTx: (txId) => api.finalizeTx(ctx, txId),
      getMinAppealBond: (txId) => api.getMinAppealBond(ctx, txId),
      appealTx: (txId, valueWei) => api.appealTx(ctx, txId, valueWei),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.readClient, ctx.writeClient, ctx.account, ctx.contractAddress]
  );
}

// Real Reown-backed provider — only rendered when REOWN_ENABLED is true, i.e.
// createAppKit() actually ran. REOWN_ENABLED is a module-level constant fixed
// for the app's lifetime, so choosing between this and the stub below at the
// ReplicourtProvider level never toggles after mount (safe for rules-of-hooks).
function ReplicourtProviderWithWallet({ children }: { children: ReactNode }) {
  const { networkId, setNetworkId } = useNetworkState();
  const network = NETWORKS[networkId];

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<any>("eip155");
  const { disconnect: appKitDisconnect } = useDisconnect();

  const readClient = useMemo(() => createClient({ chain: network.glChain }), [network]);
  const writeClient = useMemo(() => {
    if (!isConnected || !address || !walletProvider) return null;
    return createClient({
      chain: network.glChain,
      account: address as `0x${string}`,
      provider: walletProvider,
    });
  }, [network, isConnected, address, walletProvider]);

  const ctx: ApiCtx = useMemo(
    () => ({
      readClient,
      writeClient,
      account: (address as `0x${string}` | undefined) ?? null,
      contractAddress: network.contractAddress,
    }),
    [readClient, writeClient, address, network.contractAddress]
  );

  const value: ReplicourtContextValue = {
    networkId,
    network,
    networks: NETWORK_LIST,
    setNetworkId,
    address,
    isConnected,
    reownEnabled: true,
    connect: () => open(),
    disconnect: () => appKitDisconnect(),
    api: useBoundApi(ctx),
  };

  return <ReplicourtContext.Provider value={value}>{children}</ReplicourtContext.Provider>;
}

// Stub provider used when VITE_REOWN_PROJECT_ID isn't set — reads still work
// (no wallet needed), writes clearly fail with a "connect a wallet" message
// (see contractApi.ts's requireWrite) rather than the app silently breaking.
function ReplicourtProviderNoWallet({ children }: { children: ReactNode }) {
  const { networkId, setNetworkId } = useNetworkState();
  const network = NETWORKS[networkId];

  const readClient = useMemo(() => createClient({ chain: network.glChain }), [network]);
  const ctx: ApiCtx = useMemo(
    () => ({ readClient, writeClient: null, account: null, contractAddress: network.contractAddress }),
    [readClient, network.contractAddress]
  );

  const value: ReplicourtContextValue = {
    networkId,
    network,
    networks: NETWORK_LIST,
    setNetworkId,
    address: undefined,
    isConnected: false,
    reownEnabled: false,
    connect: () =>
      console.warn(
        "[RepliCourt] Wallet connect is disabled — set VITE_REOWN_PROJECT_ID in frontend/.env.local " +
          "(free project ID at https://cloud.reown.com)."
      ),
    disconnect: () => {},
    api: useBoundApi(ctx),
  };

  return <ReplicourtContext.Provider value={value}>{children}</ReplicourtContext.Provider>;
}

export function ReplicourtProvider({ children }: { children: ReactNode }) {
  return REOWN_ENABLED ? (
    <ReplicourtProviderWithWallet>{children}</ReplicourtProviderWithWallet>
  ) : (
    <ReplicourtProviderNoWallet>{children}</ReplicourtProviderNoWallet>
  );
}

export function useReplicourt(): ReplicourtContextValue {
  const ctx = useContext(ReplicourtContext);
  if (!ctx) throw new Error("useReplicourt must be used within ReplicourtProvider");
  return ctx;
}
