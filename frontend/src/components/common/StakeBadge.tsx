import { weiToGen } from "../../lib/format";

export function StakeBadge({ wei, label }: { wei: string; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-mono"
      style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
      title={label ?? "Staked GEN"}
    >
      <svg width="10" height="10" viewBox="0 0 100 110" aria-hidden>
        <polygon points="14,32 86,32 50,14" fill="currentColor" />
        <rect x="22" y="68" width="14" height="22" fill="currentColor" />
        <rect x="43" y="52" width="14" height="38" fill="currentColor" />
        <rect x="64" y="38" width="14" height="52" fill="currentColor" />
      </svg>
      {weiToGen(wei)} GEN
    </span>
  );
}
