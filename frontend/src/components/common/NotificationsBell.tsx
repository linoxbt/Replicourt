import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReplicourt } from "../../lib/ReplicourtProvider";
import { getSeen, markSeen } from "../../lib/notifications";
import { shortAddress } from "../../lib/format";

interface Notification {
  id: string; // stable event id used for the seen-set
  claimId: string;
  claimDescription: string;
  text: string;
  positive: boolean;
}

function sameAddress(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

const POLL_MS = 60_000;

export function NotificationsBell() {
  const { api, address, isConnected, networkId } = useReplicourt();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setItems([]);
      return;
    }
    let cancelled = false;

    async function poll() {
      const seen = getSeen(networkId, address!);
      const all = await api.getAllClaims();
      const perClaim = await Promise.all(all.map((c) => api.getChallengesForClaim(c.id)));
      if (cancelled) return;

      // A claim can now be challenged repeatedly — walk every round, not just
      // the first, so a claim's 2nd+ challenge doesn't silently go unnoticed.
      const found: Notification[] = [];
      all.forEach((claim, i) => {
        for (const ch of perClaim[i]) {
          if (sameAddress(claim.poster, address)) {
            const id = `poster:${ch.id}`;
            if (!seen.has(id)) {
              found.push({
                id,
                claimId: claim.id,
                claimDescription: claim.description,
                text:
                  ch.status === "resolved_challenge_wins"
                    ? `Your claim lost round ${ch.round} to a challenge from ${shortAddress(ch.challenger)}`
                    : `Your claim survived round ${ch.round}, challenged by ${shortAddress(ch.challenger)}`,
                positive: ch.status !== "resolved_challenge_wins",
              });
            }
          }
          if (sameAddress(ch.challenger, address)) {
            const id = `challenger:${ch.id}`;
            if (!seen.has(id)) {
              found.push({
                id,
                claimId: claim.id,
                claimDescription: claim.description,
                text:
                  ch.status === "resolved_challenge_wins"
                    ? `Your round ${ch.round} challenge won — confidence moved`
                    : `Your round ${ch.round} challenge was resolved against you`,
                positive: ch.status === "resolved_challenge_wins",
              });
            }
          }
        }
      });
      if (!cancelled) setItems(found);
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, networkId, api]);

  if (!isConnected || !address) return null;

  function handleOpen() {
    setOpen((v) => !v);
  }

  function handleDismissAll() {
    if (!address) return;
    markSeen(networkId, address, items.map((n) => n.id));
    setItems([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center border"
        style={{ borderColor: "var(--color-border-default)" }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 1.5c-2 0-3.5 1.6-3.5 3.6v2.4L3 10.5h10l-1.5-3V5.1C11.5 3.1 10 1.5 8 1.5Z"
            stroke="var(--color-fg-default)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M6.3 12.5a1.7 1.7 0 0 0 3.4 0" stroke="var(--color-fg-default)" strokeWidth="1.2" />
        </svg>
        {items.length > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-0.5 text-[10px] font-semibold text-white"
            style={{ background: "var(--color-danger-fg)" }}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div
            className="absolute right-0 z-40 mt-1 w-80 border shadow-sm"
            style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
          >
            <div
              className="flex items-center justify-between border-b px-3 py-2"
              style={{ borderColor: "var(--color-border-default)" }}
            >
              <span className="text-xs font-semibold">Notifications</span>
              {items.length > 0 && (
                <button type="button" onClick={handleDismissAll} className="text-xs" style={{ color: "var(--color-accent-fg)" }}>
                  Dismiss all
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs" style={{ color: "var(--color-fg-muted)" }}>
                Nothing new.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border-default)" }}>
                    <Link
                      to={`/claims/${n.claimId}`}
                      onClick={() => {
                        if (address) markSeen(networkId, address, [n.id]);
                        setOpen(false);
                      }}
                      className="block px-3 py-2 hover:bg-[var(--color-canvas-inset)]"
                    >
                      <p
                        className="border-l-2 pl-2 text-xs font-medium"
                        style={{
                          borderLeftColor: n.positive ? "var(--color-success-fg)" : "var(--color-danger-fg)",
                          color: n.positive ? "var(--color-success-fg)" : "var(--color-danger-fg)",
                        }}
                      >
                        {n.text}
                      </p>
                      <p className="mt-0.5 line-clamp-1 pl-2 text-xs" style={{ color: "var(--color-fg-muted)" }}>
                        {n.claimDescription}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
