import { formatPercent } from "../../lib/format";

function band(bps: number): { fg: string; bg: string } {
  if (bps >= 6500) return { fg: "var(--color-success-fg)", bg: "var(--color-success-subtle)" };
  if (bps >= 3500) return { fg: "var(--color-attention-fg)", bg: "var(--color-attention-subtle)" };
  return { fg: "var(--color-danger-fg)", bg: "var(--color-danger-subtle)" };
}

export function ConfidenceGauge({
  bps,
  trendBps,
  size = "md",
}: {
  bps: number;
  trendBps?: number;
  size?: "sm" | "md" | "lg";
}) {
  const { fg, bg } = band(bps);
  const pct = (bps / 100).toFixed(1);
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";
  const padClass = size === "lg" ? "px-3 py-1.5" : "px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold ${sizeClass} ${padClass}`}
      style={{ color: fg, background: bg }}
    >
      {pct}%
      {trendBps !== undefined && trendBps !== 0 && (
        <span aria-hidden className="text-[0.85em]">
          {trendBps > 0 ? "▲" : "▼"}
        </span>
      )}
      {trendBps !== undefined && trendBps !== 0 && (
        <span className="sr-only">
          {trendBps > 0 ? "up" : "down"} {formatPercent(Math.abs(trendBps))}
        </span>
      )}
    </span>
  );
}
