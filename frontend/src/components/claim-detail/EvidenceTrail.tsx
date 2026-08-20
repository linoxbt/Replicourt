import type { EvidenceEvent } from "../../lib/contractApi";
import { formatPercent, formatTimestamp } from "../../lib/format";

const modeTag: Record<string, { label: string; fg: string; bg: string }> = {
  comparative: { label: "Comparative", fg: "var(--color-accent-fg)", bg: "var(--color-accent-subtle)" },
  non_comparative: { label: "Non-comparative", fg: "var(--color-fg-muted)", bg: "var(--color-canvas-inset)" },
  escalated_comparative: {
    label: "Escalated · Comparative",
    fg: "var(--color-attention-fg)",
    bg: "var(--color-attention-subtle)",
  },
  escalated_non_comparative: {
    label: "Escalated · Non-comparative",
    fg: "var(--color-attention-fg)",
    bg: "var(--color-attention-subtle)",
  },
};

export function EvidenceTrail({ trail }: { trail: EvidenceEvent[] }) {
  const sorted = [...trail].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
        No evidence yet — this claim's confidence is still its initial prior.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {sorted.map((ev, i) => {
        const tag = modeTag[ev.mode] ?? modeTag.comparative;
        const positive = ev.delta_bps >= 0;
        return (
          <li
            key={`${ev.challenge_id}-${i}`}
            className="border p-3"
            style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: positive ? "var(--color-success-fg)" : "var(--color-danger-fg)" }}
                >
                  {formatPercent(ev.delta_bps)}
                </span>
                <span
                  className="border-l-2 px-2 py-0.5 text-[11px] font-medium"
                  style={{ color: tag.fg, background: tag.bg, borderLeftColor: tag.fg }}
                >
                  {tag.label}
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--color-fg-subtle)" }}>
                {formatTimestamp(ev.timestamp)}
              </span>
            </div>

            {ev.evidence_description && (
              <div className="mt-2">
                <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-fg-subtle)" }}>
                  Challenger's argument
                </p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-default)" }}>
                  {ev.evidence_description}
                </p>
              </div>
            )}

            <div className="mt-2">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-fg-subtle)" }}>
                Validators' rationale
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-default)" }}>
                {ev.rationale}
              </p>
            </div>

            {ev.evidence_refs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {ev.evidence_refs.map((ref) => (
                  <a
                    key={ref}
                    href={ref}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs underline decoration-dotted underline-offset-2"
                    style={{ color: "var(--color-accent-fg)", maxWidth: "22rem" }}
                  >
                    {ref}
                  </a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
