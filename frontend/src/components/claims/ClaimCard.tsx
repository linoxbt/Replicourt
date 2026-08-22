import { Link } from "react-router-dom";
import type { Claim } from "../../lib/contractApi";
import { ConfidenceGauge } from "../common/ConfidenceGauge";
import { StakeBadge } from "../common/StakeBadge";
import { formatPercent, relativeTime } from "../../lib/format";

const statusMeta: Record<Claim["status"], { label: string; fg: string; bg: string }> = {
  active: { label: "Active", fg: "var(--color-fg-muted)", bg: "var(--color-canvas-inset)" },
  contested: { label: "Contested", fg: "var(--color-attention-fg)", bg: "var(--color-attention-subtle)" },
};

export function ClaimCard({
  claim,
  challengeCount,
  disableLink,
}: {
  claim: Claim;
  challengeCount?: number;
  disableLink?: boolean;
}) {
  const status = statusMeta[claim.status];
  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink ? {} : { to: `/claims/${claim.id}` };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className="block border p-4 transition-colors hover:border-[var(--color-accent-muted)]"
      style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: "var(--color-accent-fg)" }}>
          {claim.category || "uncategorized"}
        </span>
      </div>

      <div className="mt-1 flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm leading-snug font-medium">{claim.description}</p>
        <ConfidenceGauge bps={claim.confidence_bps} />
      </div>

      <div
        className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs"
        style={{ color: "var(--color-fg-muted)" }}
      >
        <span>effect {formatPercent(claim.effect_size_bps)}</span>
        <span>·</span>
        <span className="truncate">{claim.study_design}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="border-l-2 px-2 py-0.5 text-xs font-medium"
            style={{ color: status.fg, background: status.bg, borderLeftColor: status.fg }}
          >
            {status.label}
          </span>
          {challengeCount !== undefined && challengeCount > 0 && (
            <span className="text-xs" style={{ color: "var(--color-fg-muted)" }}>
              {challengeCount} challenge{challengeCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StakeBadge wei={claim.stake} />
          <span className="text-xs" style={{ color: "var(--color-fg-subtle)" }}>
            {relativeTime(claim.created_at)}
          </span>
        </div>
      </div>
    </Wrapper>
  );
}
