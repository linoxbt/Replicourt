import { useAppKit } from "@reown/appkit/react";
import { useReplicourt } from "../../lib/ReplicourtProvider";
import { shortAddress } from "../../lib/format";

export function WalletConnectButton() {
  const { reownEnabled, isConnected, address } = useReplicourt();

  if (!reownEnabled) {
    return (
      <button
        type="button"
        disabled
        title="Wallet connect needs a Reown project ID — see frontend/.env.local"
        className="border px-2.5 py-1.5 font-mono text-xs"
        style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-subtle)" }}
      >
        Wallet unavailable
      </button>
    );
  }

  return <ConnectedButton isConnected={isConnected} address={address} />;
}

function ConnectedButton({ isConnected, address }: { isConnected: boolean; address?: string }) {
  const { open } = useAppKit();

  return (
    <button
      type="button"
      onClick={() => open(isConnected ? { view: "Account" } : { view: "Connect" })}
      className="flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={
        isConnected
          ? { borderColor: "var(--color-border-default)", color: "var(--color-fg-default)" }
          : { borderColor: "var(--color-accent-emphasis)", background: "var(--color-accent-emphasis)", color: "#fff" }
      }
    >
      {isConnected && (
        <span className="h-1.5 w-1.5 shrink-0" style={{ background: "var(--color-success-fg)" }} aria-hidden />
      )}
      <span className="font-mono">{isConnected && address ? shortAddress(address) : "Connect"}</span>
    </button>
  );
}
