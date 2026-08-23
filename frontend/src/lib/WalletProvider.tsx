// Everything Reown/wallet-connect-shaped lives behind this one dynamic-import
// boundary (see ReplicourtProvider.tsx's lazy(() => import("./WalletProvider"))).
// AppRoot.tsx used to statically `import './lib/appkit'`, which pulled the
// ~1.8MB wallet SDK into the SAME chunk the whole app needs before rendering
// anything at all — confirmed live: ~28s to first paint on a throttled
// connection, for a landing page that doesn't even use a wallet. Splitting it
// here means the app shell renders immediately (via ReplicourtProviderNoWallet
// as this Suspense boundary's fallback) while the wallet chunk loads in the
// background, then swaps in once ready.
import "./appkit";
import { useCallback, useMemo, type ReactNode } from "react";
import { createClient } from "genlayer-js";
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from "@reown/appkit/react";
import { NETWORKS, NETWORK_LIST } from "./networks";
import type { ApiCtx } from "./contractApi";
import { ReplicourtContext, useBoundApi, useNetworkState, type ReplicourtContextValue } from "./replicourtContext";

export default function WalletProvider({ children }: { children: ReactNode }) {
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

  const openAccountView = useCallback(() => open({ view: "Account" }), [open]);

  const value: ReplicourtContextValue = {
    networkId,
    network,
    networks: NETWORK_LIST,
    setNetworkId,
    address,
    isConnected,
    reownEnabled: true,
    connect: () => open(),
    openAccountView,
    disconnect: () => appKitDisconnect(),
    api: useBoundApi(ctx),
  };

  return <ReplicourtContext.Provider value={value}>{children}</ReplicourtContext.Provider>;
}
