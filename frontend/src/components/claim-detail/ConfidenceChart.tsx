import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Claim, EvidenceEvent } from "../../lib/contractApi";
import { formatPercent, formatTimestamp } from "../../lib/format";

interface Point {
  t: number;
  label: string;
  confidence: number;
  delta: number | null;
  mode: string | null;
  rationale: string | null;
}

function buildSeries(claim: Claim, trail: EvidenceEvent[]): Point[] {
  const sorted = [...trail].sort((a, b) => a.timestamp - b.timestamp);
  let running = 5000;
  const points: Point[] = [
    { t: claim.created_at, label: "Posted", confidence: running / 100, delta: null, mode: null, rationale: null },
  ];
  for (const ev of sorted) {
    running = Math.max(0, Math.min(10000, running + ev.delta_bps));
    points.push({
      t: ev.timestamp,
      label: formatTimestamp(ev.timestamp),
      confidence: running / 100,
      delta: ev.delta_bps,
      mode: ev.mode,
      rationale: ev.rationale,
    });
  }
  return points;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Point = payload[0].payload;
  return (
    <div
      className="max-w-xs border p-3 text-xs shadow-sm"
      style={{ background: "var(--color-canvas-overlay)", borderColor: "var(--color-border-default)" }}
    >
      <p className="font-mono font-semibold" style={{ color: "var(--color-fg-default)" }}>
        {p.confidence.toFixed(1)}% confidence
      </p>
      <p style={{ color: "var(--color-fg-muted)" }}>{p.label}</p>
      {p.delta !== null && (
        <>
          <p
            className="mt-1 font-mono"
            style={{ color: p.delta >= 0 ? "var(--color-success-fg)" : "var(--color-danger-fg)" }}
          >
            {formatPercent(p.delta)} · {p.mode?.replace(/_/g, " ")}
          </p>
          <p className="mt-1 line-clamp-3" style={{ color: "var(--color-fg-muted)" }}>
            {p.rationale}
          </p>
        </>
      )}
    </div>
  );
}

export function ConfidenceChart({ claim, trail }: { claim: Claim; trail: EvidenceEvent[] }) {
  const data = buildSeries(claim, trail);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-fg)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-accent-fg)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border-muted)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
            axisLine={{ stroke: "var(--color-border-default)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}%`}
          />
          <ReferenceLine y={50} stroke="var(--color-border-default)" strokeDasharray="3 3" />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="confidence"
            stroke="var(--color-accent-fg)"
            strokeWidth={2}
            fill="url(#confidenceFill)"
            dot={{ r: 3, fill: "var(--color-accent-fg)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
