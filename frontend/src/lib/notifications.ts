// localStorage-backed "seen" set, scoped per network + wallet address, so a
// resolved claim/challenge you've already looked at doesn't keep re-alerting you.
const STORAGE_KEY = "replicourt.notifications.seen.v1";

type SeenLog = Record<string, string[]>; // `${networkId}:${address}` -> event ids

function scopeKey(networkId: string, address: string): string {
  return `${networkId}:${address.toLowerCase()}`;
}

function readLog(): SeenLog {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SeenLog;
  } catch {
    return {};
  }
}

export function getSeen(networkId: string, address: string): Set<string> {
  return new Set(readLog()[scopeKey(networkId, address)] ?? []);
}

export function markSeen(networkId: string, address: string, ids: string[]) {
  const log = readLog();
  const key = scopeKey(networkId, address);
  const merged = new Set([...(log[key] ?? []), ...ids]);
  log[key] = Array.from(merged);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // ignore — worst case a notification re-appears once
  }
}
