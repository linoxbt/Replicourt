// Public embeddable badge: GET /.netlify/functions/badge?claim=<id>&network=studionet
// Returns a live SVG showing a claim's current on-chain confidence score — meant to
// be dropped as an <img> into the paper/blog post/README the claim is about, e.g.
//   ![RepliCourt confidence](https://replicourt.netlify.app/.netlify/functions/badge?claim=my-claim-id)
// Duplicates the two live contract addresses from src/lib/networks.ts rather than
// importing that module directly — it pulls in Reown/AppKit browser-only code that
// has no place in a server function.
import { createClient } from "genlayer-js";
import * as chains from "genlayer-js/chains";

const NETWORKS: Record<string, { chain: (typeof chains)["studionet"]; address: `0x${string}` }> = {
  studionet: { chain: chains.studionet, address: "0x62bb3DF3DC9a0F176f601460509a1DAb4cC0fdB0" },
  testnetAsimov: { chain: chains.testnetAsimov, address: "0xf6a56C9ec97E80479c0e430A10FE47663bBA61D5" },
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
  } catch {
    return new Response(errorBadge("claim not found"), { headers, status: 404 });
  }
};
