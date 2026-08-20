import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { ClaimCard } from "../components/claims/ClaimCard";
import { bpsToPercent } from "../lib/format";

type SortMode = "confident" | "contested";

const inputClass = "border px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-accent-fg)]";
const inputStyle = { borderColor: "var(--color-border-default)", background: "var(--color-canvas)" };

export function ClaimRegistry() {
  const { api, networkId } = useReplicourt();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [challengeCounts, setChallengeCounts] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<SortMode>("confident");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [minStake, setMinStake] = useState("");

  useEffect(() => {
    let cancelled = false;
    setClaims(null);
    setError(null);
    api
      .getAllClaims()
      .then(async (all) => {
        if (cancelled) return;
        setClaims(all);
        const counts = await Promise.all(
          all.map((c) => api.getChallengesForClaim(c.id).then((ch) => [c.id, ch.length] as const))
        );
        if (!cancelled) setChallengeCounts(Object.fromEntries(counts));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load claims"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkId]);

  const categories = useMemo(() => {
    if (!claims) return [];
    return Array.from(new Set(claims.map((c) => c.category || "uncategorized"))).sort();
  }, [claims]);

  const filtered = useMemo(() => {
    if (!claims) return [];
    const q = query.trim().toLowerCase();
    const minStakeWei = minStake ? BigInt(Math.round((Number(minStake) || 0) * 1e18)) : null;
    return claims.filter((c) => {
      if (category !== "all" && (c.category || "uncategorized") !== category) return false;
      if (bpsToPercent(c.confidence_bps) < minConfidence) return false;
      if (minStakeWei !== null && BigInt(c.stake) < minStakeWei) return false;
      if (q) {
        const haystack = `${c.description} ${c.study_design} ${c.source_url}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [claims, query, category, minConfidence, minStake]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "confident") {
      copy.sort((a, b) => b.confidence_bps - a.confidence_bps);
    } else {
      copy.sort((a, b) => (challengeCounts[b.id] ?? 0) - (challengeCounts[a.id] ?? 0));
    }
    return copy;
  }, [filtered, sort, challengeCounts]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Claim registry</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
            Empirical claims with a live, evidence-weighted confidence score.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex overflow-hidden border text-xs"
            style={{ borderColor: "var(--color-border-default)" }}
          >
            <button
              type="button"
              onClick={() => setSort("confident")}
              className="px-3 py-1.5 font-medium"
              style={{
                background: sort === "confident" ? "var(--color-canvas-inset)" : "transparent",
                color: sort === "confident" ? "var(--color-fg-default)" : "var(--color-fg-muted)",
              }}
            >
              Most confident
            </button>
            <button
              type="button"
              onClick={() => setSort("contested")}
              className="border-l px-3 py-1.5 font-medium"
              style={{
                borderColor: "var(--color-border-default)",
                background: sort === "contested" ? "var(--color-canvas-inset)" : "transparent",
                color: sort === "contested" ? "var(--color-fg-default)" : "var(--color-fg-muted)",
              }}
            >
              Most contested
            </button>
          </div>
          <Link
            to="/claims/new"
            className="px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            Post claim
          </Link>
        </div>
      </div>

      {claims && claims.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search claims…"
            className={`${inputClass} w-48`}
            style={inputStyle}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} style={inputStyle}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-fg-muted)" }}>
            Min confidence
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value) || 0)}
              className={`${inputClass} w-16 font-mono`}
              style={inputStyle}
            />
            %
          </label>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-fg-muted)" }}>
            Min stake
            <input
              type="number"
              min={0}
              step={0.1}
              value={minStake}
              onChange={(e) => setMinStake(e.target.value)}
              placeholder="0"
              className={`${inputClass} w-16 font-mono`}
              style={inputStyle}
            />
            GEN
          </label>
          {(query || category !== "all" || minConfidence > 0 || minStake) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setMinConfidence(0);
                setMinStake("");
              }}
              className="text-xs"
              style={{ color: "var(--color-accent-fg)" }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          className="mt-6 border p-4 text-sm"
          style={{ borderColor: "var(--color-danger-fg)", color: "var(--color-danger-fg)" }}
        >
          {error}
        </div>
      )}

      {!claims && !error && (
        <p className="mt-8 text-sm" style={{ color: "var(--color-fg-muted)" }}>
          Loading claims…
        </p>
      )}

      {claims && claims.length === 0 && !error && (
        <div
          className="mt-8 border border-dashed p-8 text-center text-sm"
          style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
        >
          No claims posted yet.{" "}
          <Link to="/claims/new" style={{ color: "var(--color-accent-fg)" }}>
            Post the first one
          </Link>
          .
        </div>
      )}

      {claims && claims.length > 0 && sorted.length === 0 && !error && (
        <div
          className="mt-8 border border-dashed p-8 text-center text-sm"
          style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
        >
          No claims match these filters.
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} challengeCount={challengeCounts[claim.id]} />
        ))}
      </div>
    </div>
  );
}
