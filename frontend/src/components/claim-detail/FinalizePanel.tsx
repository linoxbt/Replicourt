import { useState } from "react";
import type { Challenge } from "../../lib/contractApi";
import { useReplicourt } from "../../lib/ReplicourtProvider";
import { getTx } from "../../lib/txLog";

// Real testnet transactions don't auto-finalize the way studio.genlayer.com's
// hosted network does — after consensus a tx sits in READY_TO_FINALIZE until a
// separate, public finalize(txId) call succeeds. This offers that call for any
// tx on this claim that this browser itself submitted (see lib/txLog.ts for the
// scope limitation — no server-side tx index exists here).
export function FinalizePanel({ claimId, challenges }: { claimId: string; challenges: Challenge[] }) {
  const { api, isConnected, connect, network, networkId } = useReplicourt();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  if (network.gasless) return null; // studionet auto-finalizes, nothing to do here

  const candidates: { key: string; label: string }[] = [
    { key: `claim:${claimId}`, label: "Post claim" },
    ...challenges.map((c) => ({ key: `challenge:${c.id}`, label: `Challenge by ${c.challenger.slice(0, 8)}…` })),
  ];
  const known = candidates
    .map((c) => ({ ...c, txId: getTx(networkId, c.key) }))
    .filter((c): c is typeof c & { txId: `0x${string}` } => Boolean(c.txId));

  if (known.length === 0) return null;

  async function handleFinalize(key: string, txId: `0x${string}`) {
    if (!isConnected) {
      connect();
      return;
    }
    setBusyKey(key);
    try {
      await api.finalizeTx(txId);
      setResults((prev) => ({ ...prev, [key]: "Finalized." }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [key]: e instanceof Error ? e.message : "Finalize failed (may be outside the finality window yet).",
      }));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div
      className="mt-4 border-l-2 p-3 text-xs"
      style={{ borderLeftColor: "var(--color-attention-fg)", background: "var(--color-canvas)" }}
    >
      <p className="font-medium" style={{ color: "var(--color-attention-fg)" }}>
        {network.label} doesn't auto-finalize
      </p>
      <p className="mt-1" style={{ color: "var(--color-fg-muted)" }}>
        Transactions submitted from this browser can be finalized manually once the appeal window
        elapses — reads won't reflect a write until then.
      </p>
      <div className="mt-2 space-y-1.5">
        {known.map(({ key, label, txId }) => (
          <div key={key} className="flex flex-wrap items-center gap-2">
            <span className="font-mono" style={{ color: "var(--color-fg-default)" }}>
              {label}
            </span>
            <button
              type="button"
              onClick={() => handleFinalize(key, txId)}
              disabled={busyKey === key}
              className="border px-2 py-1 font-medium disabled:opacity-40"
              style={{ borderColor: "var(--color-border-default)" }}
            >
              {busyKey === key ? "Finalizing…" : "Finalize"}
            </button>
            {results[key] && <span style={{ color: "var(--color-fg-subtle)" }}>{results[key]}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
