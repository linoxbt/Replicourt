import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Challenge, Claim, EvidenceEvent } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { ConfidenceChart } from "../components/claim-detail/ConfidenceChart";
import { EvidenceTrail } from "../components/claim-detail/EvidenceTrail";
import { ConfidenceGauge } from "../components/common/ConfidenceGauge";
import { StakeBadge } from "../components/common/StakeBadge";
import { FinalizePanel } from "../components/claim-detail/FinalizePanel";
import { formatPercent, friendlyLoadError, shortAddress } from "../lib/format";
import { Spinner } from "../components/common/Spinner";

export function ClaimDetail() {
  const { claimId } = useParams<{ claimId: string }>();
  const { api, networkId } = useReplicourt();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [trail, setTrail] = useState<EvidenceEvent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!claimId) return () => {};
    let cancelled = false;
    Promise.all([api.getClaim(claimId), api.getEvidenceTrail(claimId), api.getChallengesForClaim(claimId)])
      .then(([c, t, ch]) => {
        if (cancelled) return;
        setClaim(c);
        setTrail(t);
        setChallenges(ch);
      })
      .catch((e) => !cancelled && setError(friendlyLoadError("this claim", e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, api]);

  useEffect(() => load(), [load]);

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
        <Spinner label="Loading claim…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="border-l-2 px-2 py-0.5 text-xs font-medium"
              style={{
                color: "var(--color-accent-fg)",
                background: "var(--color-canvas-inset)",
                borderLeftColor: "var(--color-accent-fg)",
              }}
            >
              {claim.category || "uncategorized"}
            </span>
          </div>
          <h1 className="mt-1.5 text-lg font-semibold leading-snug">{claim.description}</h1>
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

      <FinalizePanel claimId={claim.id} challenges={challenges} />

      <EmbedBadge claimId={claim.id} networkId={networkId} />

      <div className="mt-6">
        <h2 className="text-sm font-semibold">Evidence trail</h2>
        <div className="mt-3">
          <EvidenceTrail trail={trail} />
        </div>
      </div>
    </div>
  );
}

function EmbedBadge({ claimId, networkId }: { claimId: string; networkId: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const badgeUrl = `${window.location.origin}/.netlify/functions/badge?claim=${encodeURIComponent(claimId)}&network=${networkId}`;
  const markdown = `[![RepliCourt confidence](${badgeUrl})](${window.location.origin}/claims/${claimId})`;

  function handleCopy() {
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setCopied(true);
        setCopyError(false);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 2000);
      });
  }

  return (
    <div className="mt-4 border p-3" style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}>
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-fg-subtle)" }}>
        Embed this claim's live confidence score
      </p>
      {import.meta.env.DEV && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-attention-fg)" }}>
          This badge only renders when deployed to Netlify — `vite dev` doesn't run Netlify
          Functions, so the image below will look broken locally.
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <img src={badgeUrl} alt="RepliCourt confidence badge" height={20} />
        <button
          type="button"
          onClick={handleCopy}
          className="border px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          {copyError ? "Copy failed" : copied ? "Copied!" : "Copy markdown"}
        </button>
      </div>
      <p className="mt-2 truncate font-mono text-xs" style={{ color: "var(--color-fg-subtle)" }}>
        {markdown}
      </p>
    </div>
  );
}
