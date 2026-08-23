import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { NETWORKS, DEFAULT_NETWORK, type NetworkConfig, type NetworkId } from "./networks";
import * as api from "./contractApi";
import type { ApiCtx, Claim, EvidenceEvent, Challenge } from "./contractApi";

// Shared between the no-wallet stub (eager, always available) and the
// wallet-backed provider (lazy-loaded — see WalletProvider.tsx) so neither
// side needs to import the other, and this file itself pulls in zero
// @reown/appkit code.

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

export interface ReplicourtContextValue {
  networkId: NetworkId;
  network: NetworkConfig;
  networks: NetworkConfig[];
  setNetworkId: (id: NetworkId) => void;
  address: string | undefined;
  isConnected: boolean;
  reownEnabled: boolean;
  connect: () => void;
  openAccountView: () => void;
  disconnect: () => void;
  api: BoundApi;
}

export const ReplicourtContext = createContext<ReplicourtContextValue | null>(null);

export function useNetworkState() {
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

export function useBoundApi(ctx: ApiCtx): BoundApi {
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

export function useReplicourt(): ReplicourtContextValue {
  const ctx = useContext(ReplicourtContext);
  if (!ctx) throw new Error("useReplicourt must be used within ReplicourtProvider");
  return ctx;
}
