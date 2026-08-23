// Public embeddable badge: GET /.netlify/functions/badge?claim=<id>&network=studionet
// Returns a live SVG showing a claim's current on-chain confidence score — meant to
// be dropped as an <img> into the paper/blog post/README the claim is about, e.g.
//   ![RepliCourt confidence](https://replicourt.netlify.app/.netlify/functions/badge?claim=my-claim-id)
// Addresses come from the shared, dependency-free contractAddresses.ts (not from
// networks.ts directly, which pulls in Reown/AppKit browser-only code that has no
// place in a server function) — previously duplicated as separate literals here,
// which drifted out of sync after a redeploy. See the audit that caught it.
import { createClient } from "genlayer-js";
import * as chains from "genlayer-js/chains";
import { CONTRACT_ADDRESSES } from "../../src/lib/contractAddresses";

const NETWORKS: Record<string, { chain: (typeof chains)["studionet"]; address: `0x${string}` }> = {
  studionet: { chain: chains.studionet, address: CONTRACT_ADDRESSES.studionet },
  testnetAsimov: { chain: chains.testnetAsimov, address: CONTRACT_ADDRESSES.testnetAsimov },
};

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c);
}

function textWidth(s: string): number {
  return Math.round(s.length * 6.5) + 20;
}

function svgBadge(label: string, value: string, color: string): string {
  const labelW = textWidth(label);
  const valueW = textWidth(value);
  const totalW = labelW + valueW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".08"/>
    <stop offset="1" stop-opacity=".08"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="0"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#1a1a1a"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">
    <text x="${labelW / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelW + valueW / 2}" y="14" font-weight="700">${escapeXml(value)}</text>
  </g>
</svg>`;
}

function errorBadge(message: string): string {
  return svgBadge("RepliCourt", message, "#6e6e6e");
}

// A contract-level revert (e.g. "[EXPECTED] unknown claim") never shows up in
// error.message for a failed readContract call — viem's InvalidInputRpcError
// wraps it as a generic "Missing or invalid parameters" message instead. The
// actual revert text is base64-encoded inside error.cause.data.receipt.result
// (confirmed against a real failing read, not guessed: decoding it yields the
// exact "[EXPECTED] unknown claim" string the contract raises). Checking
// e.message for "unknown claim" — the previous approach — could never match,
// since that substring never appears there.
function extractRevertReason(e: unknown): string | null {
  const receipt = (e as { cause?: { data?: { receipt?: unknown } } })?.cause?.data?.receipt as
    | { execution_result?: string; result?: string }
    | undefined;
  if (!receipt || receipt.execution_result !== "ERROR" || typeof receipt.result !== "string") {
    return null;
  }
  try {
    return Buffer.from(receipt.result, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const claimId = url.searchParams.get("claim");
  const networkId = url.searchParams.get("network") ?? "studionet";
  const network = NETWORKS[networkId];
  const headers = { "content-type": "image/svg+xml", "cache-control": "public, max-age=300" };

  if (!claimId || !network) {
    return new Response(errorBadge("invalid request"), { headers, status: 400 });
  }

  try {
    const client = createClient({ chain: network.chain });
    const claim = (await client.readContract({
      address: network.address,
      functionName: "get_claim",
      args: [claimId],
    })) as { confidence_bps: number };

    const confidencePct = claim.confidence_bps / 100;
    const color = confidencePct >= 66 ? "#0f6a6a" : confidencePct >= 33 ? "#c98a12" : "#b3261e";
    return new Response(svgBadge("RepliCourt confidence", `${confidencePct.toFixed(1)}%`, color), { headers });
  } catch (e) {
    // Distinguish a real "no such claim" (the contract's own [EXPECTED] unknown
    // claim revert) from RPC/network failures — collapsing both into one generic
    // message masked real operational issues and gave misleading info to anyone
    // viewing the badge. Errors get a short cache so a transient RPC blip doesn't
    // freeze a wrong badge for the full 5-minute window.
    const message = extractRevertReason(e) ?? (e instanceof Error ? e.message : String(e));
    const errorHeaders = { ...headers, "cache-control": "public, max-age=30" };
    if (message.includes("unknown claim")) {
      return new Response(errorBadge("claim not found"), { headers: errorHeaders, status: 404 });
    }
    return new Response(errorBadge("temporarily unavailable"), { headers: errorHeaders, status: 503 });
  }
};
