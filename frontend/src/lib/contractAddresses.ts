// The single source of truth for deployed contract addresses, kept dependency-free
// (no genlayer-js/Reown imports) so both the browser app (src/lib/networks.ts) and
// the standalone Netlify Function (netlify/functions/badge.mts) can import it without
// pulling in browser-only code into the server function. This exists specifically
// because the two previously duplicated these addresses as separate literals and
// drifted out of sync after a redeploy — see the audit that caught it.
export const CONTRACT_ADDRESSES = {
  studionet: "0x89CF9b74DC2F8E17aF26013683E0D953f227ad4b",
  testnetAsimov: "0x304253B50d2F8FC1f91aBa5DDEfe36EA26443434",
} as const;
