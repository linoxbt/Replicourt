import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Challenge, Claim } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { EscalationPanel } from "../components/escalation/EscalationPanel";
import { friendlyLoadError } from "../lib/format";

export function Escalation() {
  const { claimId } = useParams<{ claimId: string }>();
  const { api } = useReplicourt();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!claimId) return () => {};
    let cancelled = false;
    Promise.all([api.getClaim(claimId), api.getChallengesForClaim(claimId)])
      .then(([c, ch]) => {
        if (cancelled) return;
        setClaim(c);
        setChallenges(ch);
      })
      .catch((e) => !cancelled && setError(friendlyLoadError("this claim", e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, api]);

  useEffect(() => load(), [load]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to={`/claims/${claimId}`} className="text-xs" style={{ color: "var(--color-accent-fg)" }}>
        ← Back to claim
      </Link>
      <h1 className="mt-2 text-lg font-semibold">Escalation</h1>

      {error ? (
        <div
          className="mt-4 border p-4 text-sm"
          style={{ borderColor: "var(--color-danger-fg)", color: "var(--color-danger-fg)" }}
        >
          {error}
        </div>
      ) : (
        <>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
            {claim ? claim.description : "Loading…"}
          </p>
          <div className="mt-5">
            <EscalationPanel challenges={challenges} onEscalated={load} />
          </div>
        </>
      )}
    </div>
  );
}
