import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReplicourt } from "../lib/ReplicourtProvider";
import type { Claim, Challenge } from "../lib/contractApi";
import { ClaimCard } from "../components/claims/ClaimCard";
import { StakeBadge } from "../components/common/StakeBadge";
import { formatPercent, relativeTime, shortAddress } from "../lib/format";

interface ChallengeWithClaim extends Challenge {
  claimDescription: string;
}

function sameAddress(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function Dashboard() {
  const { api, address, isConnected, connect } = useReplicourt();
  const [myClaims, setMyClaims] = useState<Claim[] | null>(null);
  const [myChallenges, setMyChallenges] = useState<ChallengeWithClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;
    let cancelled = false;
    setMyClaims(null);
    setMyChallenges(null);
    setError(null);

    api
      .getAllClaims()
      .then(async (all) => {
        if (cancelled) return;
        setMyClaims(all.filter((c) => sameAddress(c.poster, address)));

        const perClaimChallenges = await Promise.all(
          all.map((c) =>
            api.getChallengesForClaim(c.id).then((chs) => chs.map((ch) => ({ ...ch, claimDescription: c.description })))
          )
        );
        if (cancelled) return;
        const mine = perClaimChallenges.flat().filter((ch) => sameAddress(ch.challenger, address));
        setMyChallenges(mine);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load dashboard"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, api]);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div
          className="border border-dashed p-10 text-center"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          <h1 className="text-lg font-semibold">Your dashboard</h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm" style={{ color: "var(--color-fg-muted)" }}>
            Connect a wallet to see the claims you've posted and the challenges you've made.
          </p>
          <button
            type="button"
            onClick={connect}
            className="mt-5 px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  const wins = myChallenges?.filter((c) => c.status === "resolved_challenge_wins").length ?? 0;
  const totalStakedWei = (myClaims ?? []).reduce((sum, c) => sum + BigInt(c.stake), 0n);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold">Your dashboard</h1>
        <p className="mt-0.5 font-mono text-sm" style={{ color: "var(--color-fg-muted)" }}>
          {shortAddress(address ?? "")}
        </p>
      </div>

      {error && (
        <div
          className="mt-6 border p-4 text-sm"
          style={{ borderColor: "var(--color-danger-fg)", color: "var(--color-danger-fg)" }}
        >
          {error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Claims posted" value={myClaims ? String(myClaims.length) : "…"} />
        <Stat label="Challenges made" value={myChallenges ? String(myChallenges.length) : "…"} />
        <Stat label="Challenges won" value={myChallenges ? String(wins) : "…"} />
        <Stat label="GEN staked (claims)" value={myClaims ? `${(Number(totalStakedWei) / 1e18).toFixed(2)}` : "…"} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold">Your claims</h2>
        {myClaims && myClaims.length === 0 && (
          <p className="mt-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
            You haven't posted any claims on this network yet.{" "}
            <Link to="/claims/new" style={{ color: "var(--color-accent-fg)" }}>
              Post one
            </Link>
            .
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myClaims?.map((c) => (
            <ClaimCard key={c.id} claim={c} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold">Your challenges</h2>
        {myChallenges && myChallenges.length === 0 && (
          <p className="mt-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
            You haven't challenged any claims on this network yet.
          </p>
        )}
        <ol className="mt-3 space-y-2">
          {myChallenges?.map((ch) => (
            <li
              key={ch.id}
              className="border p-3"
              style={{ borderColor: "var(--color-border-default)", background: "var(--color-canvas)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/claims/${ch.claim_id}`} className="text-sm font-medium hover:underline">
                  {ch.claimDescription}
                </Link>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: ch.delta_bps >= 0 ? "var(--color-success-fg)" : "var(--color-danger-fg)" }}
                >
                  {formatPercent(ch.delta_bps)}
                </span>
              </div>
              <div
                className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs"
                style={{ color: "var(--color-fg-muted)" }}
              >
                <span>{ch.status === "resolved_challenge_wins" ? "won" : "lost"}</span>
                <span>·</span>
                <span>{ch.mode.replace("_", " ")}</span>
                <span>·</span>
                <StakeBadge wei={ch.stake} />
                <span>·</span>
                <span>{relativeTime(ch.resolved_at)}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-3" style={{ borderColor: "var(--color-border-default)" }}>
      <p className="font-mono text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--color-fg-muted)" }}>
        {label}
      </p>
    </div>
  );
}
