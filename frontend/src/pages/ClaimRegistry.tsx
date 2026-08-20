import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { ClaimCard } from "../components/claims/ClaimCard";

type SortMode = "confident" | "contested";

export function ClaimRegistry() {
  const { api, networkId } = useReplicourt();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [challengeCounts, setChallengeCounts] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<SortMode>("confident");
  const [error, setError] = useState<string | null>(null);

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

  const sorted = useMemo(() => {
    if (!claims) return [];
    const copy = [...claims];
    if (sort === "confident") {
      copy.sort((a, b) => b.confidence_bps - a.confidence_bps);
    } else {
      copy.sort((a, b) => (challengeCounts[b.id] ?? 0) - (challengeCounts[a.id] ?? 0));
    }
    return copy;
  }, [claims, sort, challengeCounts]);

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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} challengeCount={challengeCounts[claim.id]} />
        ))}
      </div>
    </div>
  );
}
