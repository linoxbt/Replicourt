// A real GenLayer RPC round-trip (studio.genlayer.com / a testnet node) can
// take several seconds even for a plain read — plain "Loading…" text with no
// motion reads as a stuck/broken page during that wait. This gives every
// loading state the same visual cue main.tsx's boot screen already uses.
export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
      <span
        className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "var(--color-accent-emphasis)", borderTopColor: "transparent" }}
        aria-hidden
      />
      {label}
    </div>
  );
}
