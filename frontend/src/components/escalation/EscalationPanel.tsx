import { useState } from "react";
import type { Challenge } from "../../lib/contractApi";
import { useReplicourt } from "../../lib/ReplicourtProvider";
import { formatPercent, shortAddress } from "../../lib/format";

const BASE_PANEL = 5;
const ESCALATED_PANEL = 9;

function ValidatorDots({ count, active }: { count: number; active: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${count} validators`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full transition-colors"
          style={{
            background: active ? "var(--color-accent-fg)" : "var(--color-border-default)",
          }}
        />
      ))}
    </div>
  );
}

function ChallengeEscalationRow({ challenge, onEscalated }: { challenge: Challenge; onEscalated: () => void }) {
  const { api, isConnected, connect } = useReplicourt();
  const [bond, setBond] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disagreement = Math.abs(challenge.delta_bps);
  const contested = disagreement < 1000; // small moves are the ones worth a second look

  async function handleEscalate() {
    if (!isConnected) {
      connect();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.escalate({ challengeId: challenge.id, bondGen: Number(bond) || 0 });
      onEscalated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Escalation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="border p-3"
      style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <span className="font-mono">{shortAddress(challenge.challenger)}</span>{" "}
          <span style={{ color: "var(--color-fg-muted)" }}>
            challenged · {challenge.mode.replace("_", " ")} · resolved{" "}
            {challenge.status === "resolved_challenge_wins" ? "in challenger's favor" : "in claim's favor"} (
            {formatPercent(challenge.delta_bps)})
          </span>
        </div>
        <ValidatorDots
          count={challenge.escalated ? ESCALATED_PANEL : BASE_PANEL}
          active={challenge.escalated}
        />
      </div>

      {challenge.escalated ? (
        <p className="mt-2 text-xs" style={{ color: "var(--color-accent-fg)" }}>
          Escalated — re-resolved by an expanded {ESCALATED_PANEL}-validator panel under a tighter
          convergence tolerance.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-fg-muted)" }}>
            {contested ? "Close resolution — " : ""}Escalate to a larger validator panel:
          </span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={bond}
            onChange={(e) => setBond(e.target.value)}
            className="w-20 border px-2 py-1 text-xs font-mono"
            style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
          />
          <span className="text-xs" style={{ color: "var(--color-fg-muted)" }}>
            GEN bond
          </span>
          <button
            type="button"
            onClick={handleEscalate}
            disabled={busy}
            className="px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            {busy ? "Escalating…" : "Escalate"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-danger-fg)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function EscalationPanel({
  challenges,
  onEscalated,
}: {
  challenges: Challenge[];
  onEscalated: () => void;
}) {
  if (challenges.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
        No challenges have been resolved on this claim yet — nothing to escalate.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((c) => (
        <ChallengeEscalationRow key={c.id} challenge={c} onEscalated={onEscalated} />
      ))}
    </div>
  );
}
