import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useReplicourt } from "../lib/ReplicourtProvider";
import type { Challenge, Claim } from "../lib/contractApi";
import { shortAddress, weiToGen } from "../lib/format";

interface Row {
  address: string;
  claimsPosted: number;
  claimsDefended: number;
  challengesMade: number;
  challengesWon: number;
  totalWins: number;
  totalActions: number;
  totalStakedWei: bigint;
}

function addStake(rows: Map<string, Row>, address: string) {
  const key = address.toLowerCase();
  if (!rows.has(key)) {
    rows.set(key, {
      address,
      claimsPosted: 0,
      claimsDefended: 0,
      challengesMade: 0,
      challengesWon: 0,
      totalWins: 0,
      totalActions: 0,
      totalStakedWei: 0n,
    });
  }
  return rows.get(key)!;
}

export function Leaderboard() {
  const { api } = useReplicourt();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);

    api
      .getAllClaims()
      .then(async (claims: Claim[]) => {
        const perClaim = await Promise.all(claims.map((c) => api.getChallengesForClaim(c.id)));
        if (cancelled) return;

        // A claim can now be challenged repeatedly (round 1, round 2, ...) —
        // count every round, not just the first, for every claim.
        const table = new Map<string, Row>();
        claims.forEach((claim, i) => {
          const poster = addStake(table, claim.poster);
          poster.claimsPosted += 1;
          poster.totalStakedWei += BigInt(claim.stake);

          const challenges: Challenge[] = perClaim[i];
          for (const ch of challenges) {
            const challenger = addStake(table, ch.challenger);
            challenger.challengesMade += 1;
            challenger.totalStakedWei += BigInt(ch.stake);
            challenger.totalActions += 1;
            poster.totalActions += 1;

            if (ch.status === "resolved_challenge_wins") {
              challenger.challengesWon += 1;
              challenger.totalWins += 1;
            } else {
              poster.claimsDefended += 1;
              poster.totalWins += 1;
            }
          }
        });

        setRows(Array.from(table.values()).sort((a, b) => b.totalWins - a.totalWins || b.totalActions - a.totalActions));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load leaderboard"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const maxWins = useMemo(() => Math.max(1, ...(rows ?? []).map((r) => r.totalWins)), [rows]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-lg font-semibold">Leaderboard</h1>
      <p className="mt-0.5 text-sm" style={{ color: "var(--color-fg-muted)" }}>
        Ranked by resolutions won — claims successfully defended plus challenges that moved confidence
        against a claim.
      </p>

      {error && (
        <div
          className="mt-6 border p-4 text-sm"
          style={{ borderColor: "var(--color-danger-fg)", color: "var(--color-danger-fg)" }}
        >
          {error}
        </div>
      )}

      {!rows && !error && (
        <p className="mt-8 text-sm" style={{ color: "var(--color-fg-muted)" }}>
          Loading leaderboard…
        </p>
      )}

      {rows && rows.length === 0 && !error && (
        <div
          className="mt-8 border border-dashed p-8 text-center text-sm"
          style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-muted)" }}
        >
          No resolved activity yet on this network.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-5 overflow-x-auto border" style={{ borderColor: "var(--color-border-default)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: "var(--color-border-default)", color: "var(--color-fg-subtle)" }}>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">Claims posted</th>
                <th className="px-3 py-2 font-medium">Challenges made</th>
                <th className="px-3 py-2 font-medium">Wins</th>
                <th className="px-3 py-2 font-medium">Win rate</th>
                <th className="px-3 py-2 font-medium">GEN staked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const winRate = r.totalActions > 0 ? Math.round((r.totalWins / r.totalActions) * 100) : 0;
                return (
                  <tr key={r.address} className="border-b last:border-0" style={{ borderColor: "var(--color-border-default)" }}>
                    <td className="px-3 py-2 font-mono" style={{ color: "var(--color-fg-subtle)" }}>
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <Link to="/dashboard" style={{ color: "var(--color-accent-fg)" }}>
                        {shortAddress(r.address)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono">{r.claimsPosted}</td>
                    <td className="px-3 py-2 font-mono">{r.challengesMade}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{r.totalWins}</span>
                        <span className="h-1.5 w-16 bg-[var(--color-canvas-inset)]">
                          <span
                            className="block h-full"
                            style={{
                              width: `${(r.totalWins / maxWins) * 100}%`,
                              background: "var(--color-accent-emphasis)",
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono">{r.totalActions > 0 ? `${winRate}%` : "—"}</td>
                    <td className="px-3 py-2 font-mono">{weiToGen(r.totalStakedWei)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
