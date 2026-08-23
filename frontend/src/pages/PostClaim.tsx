import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Claim } from "../lib/contractApi";
import { SUGGESTED_CATEGORIES } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { ClaimCard } from "../components/claims/ClaimCard";
import { recordTx } from "../lib/txLog";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "claim"
  );
}

const inputClass =
  "w-full border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-fg)]";
const inputStyle = { borderColor: "var(--color-border-default)", background: "var(--color-canvas)" };
const labelClass = "mb-1 block text-xs font-medium";

export function PostClaim() {
  const navigate = useNavigate();
  const { api, isConnected, connect, networkId } = useReplicourt();
  const [description, setDescription] = useState("");
  const [effectSize, setEffectSize] = useState("");
  const [studyDesign, setStudyDesign] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState<string>(SUGGESTED_CATEGORIES[0]);
  const [stake, setStake] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lazy initializer runs once on mount, not on every render — Date.now() is an
  // impure function and calling it directly in the render body (as this used to)
  // produces unstable results across re-renders (oxlint's react/purity rule flags
  // this).
  const [previewCreatedAt] = useState(() => Math.floor(Date.now() / 1000));

  const effectSizeBps = Math.round((Number(effectSize) || 0) * 100);

  const preview: Claim = {
    id: "preview",
    poster: "0x0000000000000000000000000000000000000000",
    description: description || "Your claim description will appear here.",
    effect_size_bps: effectSizeBps,
    study_design: studyDesign || "Study design",
    source_url: sourceUrl,
    category,
    stake: String(Math.round((Number(stake) || 0) * 1e18)),
    confidence_bps: 5000,
    round_count: 0,
    status: "active",
    created_at: previewCreatedAt,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((Number(stake) || 0) <= 0) {
      setError("Stake must be greater than 0 GEN.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const claimId = `${slugify(description)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const hash = await api.postClaim({
        claimId,
        description,
        effectSizeBps,
        studyDesign,
        sourceUrl,
        category,
        stakeGen: Number(stake) || 0,
      });
      recordTx(networkId, `claim:${claimId}`, hash);
      navigate(`/claims/${claimId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post claim");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-2">
      <div>
        <h1 className="text-lg font-semibold">Post a claim</h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
          Stake GEN on a specific, checkable empirical claim.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Claim description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Compound X reduces marker Y by 23% in a randomized controlled trial"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Effect size (%)</label>
              <input
                required
                type="number"
                step="0.1"
                value={effectSize}
                onChange={(e) => setEffectSize(e.target.value)}
                placeholder="23.0"
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
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
          </div>

          <p
            className="border-l-2 px-2.5 py-2 text-xs"
            style={{ borderLeftColor: "var(--color-attention-fg)", background: "var(--color-attention-subtle)", color: "var(--color-fg-default)" }}
          >
            This stake cannot be withdrawn once posted. If your claim is never
            challenged, or wins every challenge against it, the stake stays
            locked as the claim's backing pool — there is no mechanism to get
            it back.
          </p>

          <div>
            <label className={labelClass}>Study design</label>
            <input
              required
              value={studyDesign}
              onChange={(e) => setStudyDesign(e.target.value)}
              placeholder="RCT, double-blind, n=120"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass}>Source URL</label>
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://doi.org/…"
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              {SUGGESTED_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
              {busy ? "Posting…" : "Post claim"}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              className="px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--color-accent-emphasis)" }}
            >
              Connect wallet to post
            </button>
          )}
        </form>
      </div>

      <div>
        <p className={labelClass} style={{ color: "var(--color-fg-muted)" }}>
          Preview
        </p>
        <ClaimCard claim={preview} challengeCount={0} disableLink />
      </div>
    </div>
  );
}
