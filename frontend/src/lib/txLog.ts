// A localStorage-backed map from a RepliCourt-generated key (claim id, challenge id,
// or an escalation on one) to the tx hash that produced it, scoped per network.
// Only used to offer real on-chain finalize/appeal actions for transactions this
// browser itself submitted — there's no server-side transaction index, so a claim
// opened in a different browser/session won't have these actions available. See
// the README's "Explicitly deferred" section for the scope this implies.

const STORAGE_KEY = "replicourt.txlog.v1";

type TxLog = Record<string, Record<string, `0x${string}`>>;

function readLog(): TxLog {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as TxLog;
  } catch {
    return {};
  }
}

export function recordTx(networkId: string, key: string, hash: `0x${string}`) {
  const log = readLog();
  log[networkId] = { ...(log[networkId] ?? {}), [key]: hash };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // localStorage unavailable (private mode, quota) — finalize/appeal actions
    // simply won't be offered for this tx; not fatal.
  }
}

export function getTx(networkId: string, key: string): `0x${string}` | undefined {
  return readLog()[networkId]?.[key];
}
