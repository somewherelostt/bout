import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { WalletSigner } from "@gibwork/sdk";
import { createKeypairSigner } from "@gibwork/sdk/node";
import { z } from "zod";

export interface SignerSource {
  keypair?: string;
  signerModule?: string;
  expectedWallet?: string;
}

/** Loads exactly one local signing source without exposing its secret in CLI arguments. */
export async function loadWalletSigner(source: SignerSource): Promise<WalletSigner> {
  if (Boolean(source.keypair) === Boolean(source.signerModule)) {
    throw new Error("Choose exactly one signer source: --keypair or --signer-module.");
  }
  if (source.signerModule && !source.expectedWallet) {
    throw new Error("--signer-module requires --expected-wallet to pin the account.");
  }

  const signer = source.keypair
    ? createKeypairSigner(await readPrivateKeyFile(source.keypair))
    : await loadSignerModule(source.signerModule!);
  const address = signerAddress(signer);
  if (source.expectedWallet && address !== source.expectedWallet) {
    throw new Error(
      `Signer address ${address} does not match --expected-wallet ${source.expectedWallet}. Nothing was submitted.`,
    );
  }
  return signer;
}

export function signerAddress(signer: WalletSigner): string {
  if (
    !signer ||
    typeof signer.signMessage !== "function" ||
    typeof signer.signTransaction !== "function" ||
    typeof signer.publicKey?.toBase58 !== "function"
  ) {
    throw new Error(
      "Signer must provide publicKey, signMessage(message), and signTransaction(transaction).",
    );
  }
  const address = signer.publicKey.toBase58();
  if (typeof address !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(address)) {
    throw new Error("Signer returned an invalid Solana public address.");
  }
  return address;
}

async function loadSignerModule(modulePath: string): Promise<WalletSigner> {
  const absolutePath = path.resolve(modulePath);
  const module = await import(pathToFileURL(absolutePath).href);
  const factory: unknown = module.createBoutSigner ?? module.default;
  if (typeof factory !== "function") {
    throw new Error("Signer module must export a createBoutSigner() function (or default factory).");
  }
  const signer: unknown = await factory();
  signerAddress(signer as WalletSigner);
  return signer as WalletSigner;
}

async function readPrivateKeyFile(keypairPath: string): Promise<string | readonly number[]> {
  const content = await readFile(path.resolve(keypairPath), "utf8");
  const trimmed = content.trim();
  if (trimmed.startsWith("[")) {
    try {
      const key = z.array(z.number().int().min(0).max(255)).parse(JSON.parse(trimmed));
      if (key.length !== 32 && key.length !== 64) throw new Error("Invalid length");
      return key;
    } catch {
      throw new Error("Keypair file must contain a 32- or 64-byte JSON array.");
    }
  }
  if (!trimmed) throw new Error("The configured keypair file is empty.");
  return trimmed;
}
