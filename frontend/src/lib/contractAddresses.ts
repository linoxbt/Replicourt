// The single source of truth for deployed contract addresses, kept dependency-free
// (no genlayer-js/Reown imports) so both the browser app (src/lib/networks.ts) and
// the standalone Netlify Function (netlify/functions/badge.mts) can import it without
// pulling in browser-only code into the server function. This exists specifically
// because the two previously duplicated these addresses as separate literals and
// drifted out of sync after a redeploy — see the audit that caught it.
export const CONTRACT_ADDRESSES = {
  studionet: "0xE3c97A5D4dB7Ed8BEBfBb04e84A5169aA2e43312",
  testnetAsimov: "0xC576bd60228384Bd8F7345Ff106fb80BA6Ec8e70",
} as const;
