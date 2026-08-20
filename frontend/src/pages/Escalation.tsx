import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Challenge, Claim } from "../lib/contractApi";
import { useReplicourt } from "../lib/ReplicourtProvider";
import { EscalationPanel } from "../components/escalation/EscalationPanel";

export function Escalation() {
  const { claimId } = useParams<{ claimId: string }>();
  const { api } = useReplicourt();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!claimId) return;
    Promise.all([api.getClaim(claimId), api.getChallengesForClaim(claimId)])
      .then(([c, ch]) => {
        setClaim(c);
        setChallenges(ch);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, api]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to={`/claims/${claimId}`} className="text-xs" style={{ color: "var(--color-accent-fg)" }}>
        ← Back to claim
      </Link>
      <h1 className="mt-2 text-lg font-semibold">Escalation</h1>
      <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
        {claim ? claim.description : "Loading…"}
      </p>

      {error && (
        <div
          className="mt-4 border p-4 text-sm"
          style={{ borderColor: "var(--color-danger-fg)", color: "var(--color-danger-fg)" }}
        >
          {error}
        </div>
      )}

      <div className="mt-5">
        <EscalationPanel challenges={challenges} onEscalated={load} />
      </div>
    </div>
  );
}
