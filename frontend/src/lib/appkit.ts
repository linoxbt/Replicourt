import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { REOWN_NETWORKS } from "./networks";
import { REOWN_PROJECT_ID as projectId } from "./reownConfig";

if (projectId) {
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [REOWN_NETWORKS[0], ...REOWN_NETWORKS.slice(1)],
    projectId,
    metadata: {
      name: "RepliCourt",
      description: "A staked, continuously-updating registry of empirical scientific claims",
      url: typeof window !== "undefined" ? window.location.origin : "https://replicourt.app",
      icons: typeof window !== "undefined" ? [`${window.location.origin}/favicon.svg`] : [],
    },
    features: { analytics: false, email: false, socials: false },
    themeVariables: {
      "--w3m-accent": "#0f6a6a",
      "--apkt-accent": "#0f6a6a",
      "--w3m-border-radius-master": "2px",
    },
  });
} else {
  console.warn(
    "[RepliCourt] VITE_REOWN_PROJECT_ID is not set — wallet connect is disabled. " +
      "Get a free Project ID at https://cloud.reown.com and add it to frontend/.env.local."
  );
}
