import { lazy, Suspense, useMemo, type ReactNode } from "react";
import { createClient } from "genlayer-js";
import { NETWORKS, NETWORK_LIST } from "./networks";
import { REOWN_ENABLED } from "./reownConfig";
import type { ApiCtx } from "./contractApi";
import {
  ReplicourtContext,
  useBoundApi,
  useNetworkState,
  type ReplicourtContextValue,
} from "./replicourtContext";

export { useReplicourt } from "./replicourtContext";

// The actual wallet SDK (@reown/appkit + its adapters) is large (~1.8MB) and
// lives entirely behind this dynamic import (see WalletProvider.tsx) — it
// used to be a static import reachable from AppRoot.tsx, which meant the
// whole app (landing page included) couldn't render anything until that
// whole SDK had downloaded and evaluated. Loading it lazily means the app
// shell renders immediately via ReplicourtProviderNoWallet below (this
// Suspense boundary's fallback) while the wallet chunk loads in the
// background, then swaps in once ready.
const LazyWalletProvider = lazy(() => import("./WalletProvider"));

// Stub provider used before the wallet chunk has loaded, and permanently
// when VITE_REOWN_PROJECT_ID isn't set — reads still work (no wallet
// needed), writes clearly fail with a "connect a wallet" message (see
// contractApi.ts's requireWrite) rather than the app silently breaking.
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
        "[RepliCourt] Wallet connect is disabled or still loading — set VITE_REOWN_PROJECT_ID in " +
          "frontend/.env.local (free project ID at https://cloud.reown.com), or wait a moment and retry."
      ),
    openAccountView: () => {},
    disconnect: () => {},
    api: useBoundApi(ctx),
  };

  return <ReplicourtContext.Provider value={value}>{children}</ReplicourtContext.Provider>;
}

export function ReplicourtProvider({ children }: { children: ReactNode }) {
  if (!REOWN_ENABLED) {
    return <ReplicourtProviderNoWallet>{children}</ReplicourtProviderNoWallet>;
  }
  return (
    <Suspense fallback={<ReplicourtProviderNoWallet>{children}</ReplicourtProviderNoWallet>}>
      <LazyWalletProvider>{children}</LazyWalletProvider>
    </Suspense>
  );
}
