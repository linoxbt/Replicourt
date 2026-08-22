import { useState } from "react";
import type { Challenge } from "../../lib/contractApi";
import { useReplicourt } from "../../lib/ReplicourtProvider";
import { formatPercent, shortAddress, weiToGen } from "../../lib/format";
import { getTx, recordTx } from "../../lib/txLog";

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

function ChallengeEscalationRow({
  challenge,
  isLatestRound,
  onEscalated,
}: {
  challenge: Challenge;
  isLatestRound: boolean;
  onEscalated: () => void;
}) {
  const { api, isConnected, connect, networkId, network } = useReplicourt();
  const [bond, setBond] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealBusy, setAppealBusy] = useState(false);
  const [appealResult, setAppealResult] = useState<string | null>(null);

  const disagreement = Math.abs(challenge.delta_bps);
  const contested = disagreement < 1000; // small moves are the ones worth a second look
  const originalTxId = getTx(networkId, `challenge:${challenge.id}`);

  async function handleEscalate() {
    if (!isConnected) {
      connect();
      return;
    }
    if ((Number(bond) || 0) <= 0) {
      setError("Bond must be greater than 0 GEN.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const hash = await api.escalate({ challengeId: challenge.id, bondGen: Number(bond) || 0 });
      recordTx(networkId, `escalate:${challenge.id}`, hash);
      onEscalated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Escalation failed");
    } finally {
      setBusy(false);
    }
  }

  // The real protocol appeal (as opposed to escalate()'s contract-level
  // approximation above) — genlayer-js's appealTransaction against the
  // original challenge's own tx hash. Only available when this browser
  // submitted that challenge itself (see lib/txLog.ts).
  async function handleRealAppeal() {
    if (!isConnected) {
      connect();
      return;
    }
    if (!originalTxId) return;
    setAppealBusy(true);
    setError(null);
    setAppealResult(null);
    try {
      const minBond = await api.getMinAppealBond(originalTxId);
      await api.appealTx(originalTxId, minBond);
      setAppealResult(`Appeal submitted on-chain (bond ${weiToGen(minBond)} GEN). Awaiting a new validator round.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "On-chain appeal failed");
    } finally {
      setAppealBusy(false);
    }
  }

  return (
    <div
      className="border p-3"
      style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <span className="border-l-2 px-1.5 py-0.5 text-xs font-medium" style={{ borderLeftColor: "var(--color-border-default)", color: "var(--color-fg-subtle)" }}>
            Round {challenge.round}
          </span>{" "}
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
      ) : !isLatestRound ? (
        <p className="mt-2 text-xs" style={{ color: "var(--color-fg-subtle)" }}>
          This round has since been followed by a newer challenge — only the most recent round on a
          claim can be escalated (escalating an older round would corrupt the confidence built on top
          of it since).
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
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
              GEN bond (refunded, unless escalation flips the outcome — see below)
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
          <p className="mt-1.5 text-xs" style={{ color: "var(--color-fg-subtle)" }}>
            Escalation revises the recorded confidence, evidence trail, and winner status together.
            If the re-derived result flips who won, a corrective payout goes to the newly-determined
            winner (funded from the claim's stake pool, or from this bond if the flip favors the
            claim) — the original transfer can't be clawed back, so this is a forward correction, not
            a reversal, and an insufficient bond only partially corrects the payout instead of failing.
          </p>
        </div>
      )}

      {network.supportsAppeal && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: "var(--color-border-default)" }}>
          <span className="text-xs" style={{ color: "var(--color-fg-muted)" }}>
            Real protocol appeal (GenLayer's own transaction-level appeal, not RepliCourt's contract):
          </span>
          <button
            type="button"
            onClick={handleRealAppeal}
            disabled={appealBusy || !originalTxId}
            title={
              originalTxId
                ? "Calls genlayer-js's appealTransaction on this challenge's original tx hash"
                : "Only available in the browser that originally submitted this challenge — no server-side tx index exists"
            }
            className="border px-3 py-1 text-xs font-medium disabled:opacity-40"
            style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-default)" }}
          >
            {appealBusy ? "Appealing…" : "Appeal on-chain"}
          </button>
          {!originalTxId && (
            <span className="text-xs" style={{ color: "var(--color-fg-subtle)" }}>
              unavailable — tx hash not in this browser
            </span>
          )}
        </div>
      )}
      {appealResult && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-success-fg)" }}>
          {appealResult}
        </p>
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

  // The contract only allows escalating the most recent round for a claim —
  // escalating an older one would corrupt the confidence trajectory later
  // rounds already built on top of. get_challenges_for_claim returns rounds
  // in creation order, so the last entry is always the latest.
  const latestChallengeId = challenges[challenges.length - 1]?.id;

  return (
    <div className="space-y-3">
      {challenges.map((c) => (
        <ChallengeEscalationRow
          key={c.id}
          challenge={c}
          isLatestRound={c.id === latestChallengeId}
          onEscalated={onEscalated}
        />
      ))}
    </div>
  );
}
