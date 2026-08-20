import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Challenge, Claim, EvidenceEvent } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { ConfidenceChart } from "../components/claim-detail/ConfidenceChart";
import { EvidenceTrail } from "../components/claim-detail/EvidenceTrail";
import { ConfidenceGauge } from "../components/common/ConfidenceGauge";
import { StakeBadge } from "../components/common/StakeBadge";
import { formatPercent, shortAddress } from "../lib/format";

export function ClaimDetail() {
  const { claimId } = useParams<{ claimId: string }>();
  const { api } = useReplicourt();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [trail, setTrail] = useState<EvidenceEvent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!claimId) return;
    Promise.all([api.getClaim(claimId), api.getEvidenceTrail(claimId), api.getChallengesForClaim(claimId)])
      .then(([c, t, ch]) => {
        setClaim(c);
        setTrail(t);
        setChallenges(ch);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load claim"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, api]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div
          className="border p-4 text-sm"
          style={{ borderColor: "var(--color-danger-fg)", color: "var(--color-danger-fg)" }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
          Loading claim…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold leading-snug">{claim.description}</h1>
          <div
            className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs"
            style={{ color: "var(--color-fg-muted)" }}
          >
            <span>effect {formatPercent(claim.effect_size_bps)}</span>
            <span>·</span>
            <span>{claim.study_design}</span>
            <span>·</span>
            <a href={claim.source_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-fg)" }}>
              source
            </a>
            <span>·</span>
            <span>posted by {shortAddress(claim.poster)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StakeBadge wei={claim.stake} label="Poster stake" />
          <ConfidenceGauge bps={claim.confidence_bps} size="lg" />
        </div>
      </div>

      <div
        className="mt-5 border p-4"
        style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
      >
        <h2 className="text-sm font-semibold">Confidence over time</h2>
        <ConfidenceChart claim={claim} trail={trail} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/claims/${claim.id}/challenge`}
          className="px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--color-accent-emphasis)" }}
        >
          Challenge this claim
        </Link>
        {challenges.length > 0 && (
          <Link
            to={`/claims/${claim.id}/escalate`}
            className="border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-default)" }}
          >
            Escalation
          </Link>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold">Evidence trail</h2>
        <div className="mt-3">
          <EvidenceTrail trail={trail} />
        </div>
      </div>
    </div>
  );
}
