import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { recordTx } from "../lib/txLog";

const inputClass =
  "w-full border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-fg)]";
const inputStyle = { borderColor: "var(--color-border-default)", background: "var(--color-canvas)" };
const labelClass = "mb-1 block text-xs font-medium";

type Mode = "comparative" | "non_comparative";

// Mirrors the contract's own limits (replicourt.py: evidence_description[:1000],
// MAX_COUNTER_REFS = 5) so the UI enforces them up front instead of silently
// truncating or reverting after a wallet-signing round trip.
const EVIDENCE_MAX_LEN = 1000;
const MAX_COUNTER_REFS = 5;

export function ChallengeFlow() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { api, isConnected, connect, networkId } = useReplicourt();
  const [mode, setMode] = useState<Mode>("comparative");
  const [refs, setRefs] = useState<string[]>([""]);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [stake, setStake] = useState("0.5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRef(i: number, value: string) {
    setRefs((prev) => prev.map((r, idx) => (idx === i ? value : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimId) return;
    if ((Number(stake) || 0) <= 0) {
      setError("Stake must be greater than 0 GEN.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const challengeId = `${claimId}-ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const hash = await api.challenge({
        challengeId,
        claimId,
        counterRefs: refs.filter((r) => r.trim().length > 0),
        evidenceDescription,
        mode,
        stakeGen: Number(stake) || 0,
      });
      recordTx(networkId, `challenge:${challengeId}`, hash);
      navigate(`/claims/${claimId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Challenge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-lg font-semibold">Challenge this claim</h1>
      <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
        Submit counter-evidence and a stake. The Leader validator fetches your sources live and
        re-derives the confidence delta; other validators independently verify it.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className={labelClass}>Challenge type</label>
          <div className="flex overflow-hidden border text-sm" style={{ borderColor: "var(--color-border-default)" }}>
            {(
              [
                ["comparative", "Numeric effect size"],
                ["non_comparative", "Methodology critique"],
              ] as [Mode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className="flex-1 px-3 py-2 font-medium"
                style={{
                  background: mode === value ? "var(--color-canvas-inset)" : "transparent",
                  color: mode === value ? "var(--color-fg-default)" : "var(--color-fg-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--color-fg-subtle)" }}>
            {mode === "comparative"
              ? "Resolved under the Comparative Equivalence Principle — validators independently re-derive the same delta."
              : "Resolved under the Non-Comparative Equivalence Principle — validators judge your critique against the source text."}
          </p>
        </div>

        <div>
          <label className={labelClass}>Evidence description</label>
          <textarea
            required
            rows={4}
            maxLength={EVIDENCE_MAX_LEN}
            value={evidenceDescription}
            onChange={(e) => setEvidenceDescription(e.target.value)}
            placeholder={
              mode === "comparative"
                ? "This replication (n=500, pre-registered) found no significant effect, contradicting the claim's stated 23% effect size…"
                : "The original study had no control group and a sample size of only 8 participants…"
            }
            className={inputClass}
            style={inputStyle}
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--color-fg-subtle)" }}>
              Explain what the evidence shows and why it should move confidence. Validators weigh this
              against what the fetched sources actually say — they won't just take your word for it.
            </p>
            <span
              className="shrink-0 pl-2 font-mono text-xs"
              style={{ color: evidenceDescription.length >= EVIDENCE_MAX_LEN ? "var(--color-danger-fg)" : "var(--color-fg-subtle)" }}
            >
              {evidenceDescription.length}/{EVIDENCE_MAX_LEN}
            </span>
          </div>
        </div>

        <div>
          <label className={labelClass}>Counter-evidence URLs</label>
          <div className="space-y-2">
            {refs.map((ref, i) => (
              <input
                key={i}
                type="url"
                required={i === 0}
                value={ref}
                onChange={(e) => updateRef(i, e.target.value)}
                placeholder="https://…"
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
            ))}
          </div>
          {refs.length < MAX_COUNTER_REFS ? (
            <button
              type="button"
              onClick={() => setRefs((prev) => [...prev, ""])}
              className="mt-2 text-xs font-medium"
              style={{ color: "var(--color-accent-fg)" }}
            >
              + Add another source
            </button>
          ) : (
            <p className="mt-2 text-xs" style={{ color: "var(--color-fg-subtle)" }}>
              Maximum {MAX_COUNTER_REFS} sources per challenge.
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Stake (GEN)</label>
          <input
            required
            type="number"
            min="0"
            step="0.1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className={`${inputClass} font-mono`}
            style={inputStyle}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--color-danger-fg)" }}>
            {error}
          </p>
        )}

        {isConnected ? (
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            {busy ? "Validators re-deriving confidence delta… (can take a minute or two)" : "Submit challenge"}
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            Connect wallet to challenge
          </button>
        )}
      </form>
    </div>
  );
}
