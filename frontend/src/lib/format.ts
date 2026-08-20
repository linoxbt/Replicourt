export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function formatPercent(bps: number, digits = 1): string {
  const pct = bpsToPercent(bps);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

export function weiToGen(wei: string | bigint, digits = 2): string {
  const v = typeof wei === "string" ? BigInt(wei) : wei;
  const whole = v / 10n ** 18n;
  const frac = v % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, "0").slice(0, digits);
  return `${whole}.${fracStr}`;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(unixSeconds: number): string {
  const deltaSec = Math.round(Date.now() / 1000 - unixSeconds);
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let val = deltaSec;
  for (const [size, label] of units) {
    if (val < size) return `${Math.max(val, 0)}${label} ago`;
    val = Math.floor(val / size);
  }
  return `${val}y ago`;
}
