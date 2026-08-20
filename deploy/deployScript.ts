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
// into frontend/.env.local as VITE_CONTRACT_ADDRESS (studionet/localnet only — see note at the end for
// why testnet Asimov's address is reported but not auto-written).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
const envPath = resolve(repoRoot, "frontend/.env.local");

function expandHome(p: string): string {
  return p.startsWith("~") ? resolve(homedir(), p.slice(1).replace(/^\//, "")) : p;
}

async function resolveAccount() {
  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  if (keystorePath && keystorePassword) {
    const json = readFileSync(expandHome(keystorePath), "utf-8");
    const wallet = await Wallet.fromEncryptedJson(json, keystorePassword);
    return createAccount(wallet.privateKey as `0x${string}`);
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
  const account = await resolveAccount();
  const client = createClient({ chain, account });

  console.log(`Deploying replicourt.py to ${chainName} from deployer ${account.address} ...`);
  const hash = await client.deployContract({ code, args: [] });
  console.log(`Deploy tx: ${hash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 40,
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

  if (chainName === "localnet" || chainName === "studionet") {
    const envLine = `VITE_CONTRACT_ADDRESS=${address}\n`;
    if (existsSync(envPath)) {
      const existing = readFileSync(envPath, "utf-8");
      const updated = existing.match(/^VITE_CONTRACT_ADDRESS=.*$/m)
        ? existing.replace(/^VITE_CONTRACT_ADDRESS=.*$/m, envLine.trim())
        : existing.trimEnd() + "\n" + envLine;
      writeFileSync(envPath, updated);
    } else {
      writeFileSync(envPath, envLine);
    }
    console.log(`Wrote VITE_CONTRACT_ADDRESS to ${envPath}`);
  } else {
    console.log(
      `Not auto-writing frontend/.env.local (chain is ${chainName}, not localnet/studionet) — ` +
        `set VITE_CONTRACT_ADDRESS manually if you want the frontend pointed at this deployment.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
