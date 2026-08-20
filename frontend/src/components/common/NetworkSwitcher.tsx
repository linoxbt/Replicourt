import { useState } from "react";
import { useReplicourt } from "../../lib/ReplicourtProvider";

export function NetworkSwitcher() {
  const { network, networks, networkId, setNetworkId } = useReplicourt();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium"
        style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-default)" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: network.gasless ? "var(--color-success-fg)" : "var(--color-attention-fg)" }}
        />
        {network.label}
        <span style={{ color: "var(--color-fg-subtle)" }}>▾</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden border py-1 text-sm shadow-sm"
            style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas-overlay)" }}
          >
            {networks.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setNetworkId(n.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-black/[0.03]"
                style={{ color: n.id === networkId ? "var(--color-fg-default)" : "var(--color-fg-muted)" }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: n.gasless ? "var(--color-success-fg)" : "var(--color-attention-fg)" }}
                  />
                  {n.label}
                </span>
                {n.id === networkId && <span style={{ color: "var(--color-accent-fg)" }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
