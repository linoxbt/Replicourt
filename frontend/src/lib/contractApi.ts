import type { GenLayerClient } from "genlayer-js/types";
import { TransactionStatus } from "genlayer-js/types";

export interface Claim {
  id: string;
  poster: string;
  description: string;
  effect_size_bps: number;
  study_design: string;
  source_url: string;
  category: string;
  stake: string;
  confidence_bps: number;
  // "active" until the first challenge; "contested" from then on — never a
  // terminal lock. A claim can be challenged repeatedly (see round_count);
  // that's the actual "continuously-updating registry" property.
  status: "active" | "contested";
  round_count: number;
  created_at: number;
}

// Free-text on the contract, but the frontend suggests these so the registry's
// category filter has a stable, predictable set to group by.
export const SUGGESTED_CATEGORIES = [
  "health",
  "psychology",
  "nutrition",
  "medicine",
  "neuroscience",
  "economics",
  "social science",
  "physics",
  "biology",
  "other",
] as const;

export interface EvidenceEvent {
  claim_id: string;
  challenge_id: string;
  delta_bps: number;
  evidence_refs: string[];
  evidence_description: string;
  mode: "comparative" | "non_comparative" | "escalated_comparative" | "escalated_non_comparative";
  rationale: string;
  round: number;
  timestamp: number;
}

export interface Challenge {
  id: string;
  claim_id: string;
  challenger: string;
  counter_refs: string[];
  evidence_description: string;
  mode: "comparative" | "non_comparative";
  stake: string;
  status: "resolved_claim_wins" | "resolved_challenge_wins";
  delta_bps: number;
  rationale: string;
  escalated: boolean;
  round: number;
  created_at: number;
  resolved_at: number;
}

// Bound to the currently selected network + (if connected) wallet — see
// ReplicourtProvider.tsx, which is the only place this gets constructed.
export interface ApiCtx {
  readClient: GenLayerClient<any>;
  writeClient: GenLayerClient<any> | null;
  account: `0x${string}` | null;
  contractAddress: `0x${string}`;
}

export function genToWei(gen: number): bigint {
  return BigInt(Math.round(gen * 1e6)) * 10n ** 12n;
}

function requireWrite(ctx: ApiCtx) {
  if (!ctx.writeClient || !ctx.account) {
    throw new Error("Connect a wallet first.");
  }
  return ctx.writeClient;
}

export async function getAllClaims(ctx: ApiCtx): Promise<Claim[]> {
  const result = await ctx.readClient.readContract({
    address: ctx.contractAddress,
    functionName: "get_all_claims",
    args: [],
  });
  return result as unknown as Claim[];
}

export async function getClaim(ctx: ApiCtx, claimId: string): Promise<Claim> {
  const result = await ctx.readClient.readContract({
    address: ctx.contractAddress,
    functionName: "get_claim",
    args: [claimId],
  });
  return result as unknown as Claim;
}

export async function getEvidenceTrail(ctx: ApiCtx, claimId: string): Promise<EvidenceEvent[]> {
  const result = await ctx.readClient.readContract({
    address: ctx.contractAddress,
    functionName: "get_evidence_trail",
    args: [claimId],
  });
  return result as unknown as EvidenceEvent[];
}

export async function getChallengesForClaim(ctx: ApiCtx, claimId: string): Promise<Challenge[]> {
  const result = await ctx.readClient.readContract({
    address: ctx.contractAddress,
    functionName: "get_challenges_for_claim",
    args: [claimId],
  });
  return result as unknown as Challenge[];
}

export async function postClaim(
  ctx: ApiCtx,
  params: {
    claimId: string;
    description: string;
    effectSizeBps: number;
    studyDesign: string;
    sourceUrl: string;
    category: string;
    stakeGen: number;
  }
): Promise<`0x${string}`> {
  const writeClient = requireWrite(ctx);
  const hash = await writeClient.writeContract({
    address: ctx.contractAddress,
    functionName: "post_claim",
    args: [
      params.claimId,
      params.description,
      params.effectSizeBps,
      params.studyDesign,
      params.sourceUrl,
      params.category,
    ],
    value: genToWei(params.stakeGen),
  });
  await writeClient.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
  return hash;
}

export async function challenge(
  ctx: ApiCtx,
  params: {
    challengeId: string;
    claimId: string;
    counterRefs: string[];
    evidenceDescription: string;
    mode: "comparative" | "non_comparative";
    stakeGen: number;
  }
): Promise<`0x${string}`> {
  const writeClient = requireWrite(ctx);
  const hash = await writeClient.writeContract({
    address: ctx.contractAddress,
    functionName: "challenge",
    args: [params.challengeId, params.claimId, params.counterRefs, params.evidenceDescription, params.mode],
    value: genToWei(params.stakeGen),
  });
  // Multi-validator LLM consensus (real web fetch + real model calls per
  // validator) routinely takes well over a minute — give this far more
  // headroom than the client's default wait.
  await writeClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 60,
  });
  return hash;
}

export async function escalate(
  ctx: ApiCtx,
  params: { challengeId: string; bondGen: number }
): Promise<`0x${string}`> {
  const writeClient = requireWrite(ctx);
  const hash = await writeClient.writeContract({
    address: ctx.contractAddress,
    functionName: "escalate",
    args: [params.challengeId],
    value: genToWei(params.bondGen),
  });
  await writeClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 60,
  });
  return hash;
}

// The protocol's own transaction-level appeal/finalize flow (as distinct from
// escalate()'s contract-level approximation above) — real genlayer-js client
// methods, not something this contract defines. Only usable on a tx hash this
// browser has locally (see lib/txLog.ts) since there's no server-side tx index.

export async function finalizeTx(ctx: ApiCtx, txId: `0x${string}`): Promise<`0x${string}`> {
  const writeClient = requireWrite(ctx);
  return writeClient.finalizeTransaction({ txId });
}

export async function getMinAppealBond(ctx: ApiCtx, txId: `0x${string}`): Promise<bigint> {
  const writeClient = requireWrite(ctx);
  return writeClient.getMinAppealBond({ txId });
}

export async function appealTx(ctx: ApiCtx, txId: `0x${string}`, valueWei: bigint): Promise<unknown> {
  const writeClient = requireWrite(ctx);
  return writeClient.appealTransaction({ txId, value: valueWei });
}
