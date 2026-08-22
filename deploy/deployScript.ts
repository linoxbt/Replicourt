// Deploy script for RepliCourt — targets any GenLayer chain preset.
//
// Usage:
//   GL_CHAIN=studionet KEYSTORE_PATH=~/.genlayer/keystores/x.json KEYSTORE_PASSWORD=*** npx tsx deploy/deployScript.ts
//   GL_CHAIN=localnet npx tsx deploy/deployScript.ts   (uses a fresh random account, localnet only)
//
// GL_CHAIN selects the chain preset from genlayer-js/chains: localnet | studionet | testnetAsimov | testnetBradbury.
// When KEYSTORE_PATH/KEYSTORE_PASSWORD are set, decrypts that V3 keystore in-memory (never logged) and
// deploys as that account. Otherwise generates a fresh random account (localnet convenience only).
//
// Reads contracts/replicourt.py, deploys it, waits for acceptance, then writes the resulting address
// directly into frontend/src/lib/contractAddresses.ts — the actual module the running app imports for
// both studionet and testnetAsimov (see NetworkConfig in frontend/src/lib/networks.ts). Previously this
// wrote VITE_CONTRACT_ADDRESS into frontend/.env.local instead, which nothing in the app ever read —
// a fresh deploy's address never reached the running frontend without a manual copy-paste edit. Caught
// during a GenLayer Foundation Portal review.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createAccount, createClient } from "genlayer-js";
import * as chains from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { Wallet } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const contractPath = resolve(repoRoot, "contracts/replicourt.py");
const addressesPath = resolve(repoRoot, "frontend/src/lib/contractAddresses.ts");

function expandHome(p: string): string {
  return p.startsWith("~") ? resolve(homedir(), p.slice(1).replace(/^\//, "")) : p;
}

async function resolveAccount(chainName: string) {
  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  if (keystorePath && keystorePassword) {
    const json = readFileSync(expandHome(keystorePath), "utf-8");
    const wallet = await Wallet.fromEncryptedJson(json, keystorePassword);
    return createAccount(wallet.privateKey as `0x${string}`);
  }
  // A fresh, unfunded throwaway account only makes sense on localnet/studionet
  // (gasless/simulated) — silently doing the same thing for a real testnet used
  // to fail confusingly at the deployContract step ("insufficient funds") instead
  // of erroring here with a clear reason.
  if (chainName !== "localnet" && chainName !== "studionet") {
    throw new Error(
      `GL_CHAIN=${chainName} needs a funded account — set KEYSTORE_PATH and KEYSTORE_PASSWORD ` +
        `(a fresh unfunded account only works on localnet/studionet).`
    );
  }
  return createAccount();
}

async function main() {
  const chainName = (process.env.GL_CHAIN ?? "localnet") as keyof typeof chains;
  const chain = chains[chainName];
  if (!chain) {
    throw new Error(`Unknown GL_CHAIN "${chainName}". Options: ${Object.keys(chains).join(", ")}`);
  }

  const code = readFileSync(contractPath, "utf-8");
  const account = await resolveAccount(chainName);
  const client = createClient({ chain, account });

  console.log(`Deploying replicourt.py to ${chainName} from deployer ${account.address} ...`);
  const hash = await client.deployContract({ code, args: [] });
  console.log(`Deploy tx: ${hash}`);

  // Real testnets (unlike studionet) can take several minutes to reach ACCEPTED
  // under load — hit this in practice during the audit-fix redeploy (testnet
  // Asimov took ~5 minutes once). 40 retries * 3s = 120s was too short and failed
  // the deploy even though the tx eventually went through fine.
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 100,
  });
  // Receipt shape differs by network: studionet nests it under `data.contract_address`;
  // testnet Asimov's raw receipt has no `data` wrapper and the deployed address shows
  // up as the top-level `recipient` field instead.
  const address =
    (receipt as any).data?.contract_address ??
    (receipt as any).contract_address ??
    (receipt as any).recipient;

  if (!address) {
    console.error("Could not determine deployed contract address from receipt:");
    console.error(JSON.stringify(receipt, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    process.exit(1);
  }

  console.log(`Deployed at: ${address}`);

  // contractAddresses.ts only has entries for the two networks the frontend
  // actually exposes a network switcher for (studionet, testnetAsimov) — see
  // NetworkId in networks.ts. localnet/testnetBradbury deploys are reported
  // but have nowhere in the frontend config to be wired into.
  const existing = readFileSync(addressesPath, "utf-8");
  const keyPattern = new RegExp(`(^\\s*${chainName}:\\s*")0x[a-fA-F0-9]+(",?\\s*$)`, "m");
  if (!keyPattern.test(existing)) {
    console.log(
      `${addressesPath} has no "${chainName}:" entry — this chain isn't one the frontend's network ` +
        `switcher exposes, so there's nowhere to wire this address into. Address was still deployed ` +
        `successfully above; nothing further to do here.`
    );
    return;
  }
  const updated = existing.replace(keyPattern, `$1${address}$2`);
  writeFileSync(addressesPath, updated);
  console.log(`Wrote ${chainName} address into ${addressesPath} — the running app will pick it up on next build/reload.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
