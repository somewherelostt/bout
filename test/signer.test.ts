import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKeypairSigner } from "@gibwork/sdk/node";
import { signPreparedTransaction } from "@gibwork/sdk";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { afterEach, describe, expect, it } from "vitest";
import { loadWalletSigner, signerAddress } from "../src/marketplace/signer.js";

const temporaryDirectories: string[] = [];
const modulePath = fileURLToPath(new URL("./fixtures/external-signer.mjs", import.meta.url));
const expectedAddress = createKeypairSigner(new Uint8Array(32).fill(7)).publicKey.toBase58();

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("wallet signer sources", () => {
  it("accepts a trusted external signer without loading a key file", async () => {
    const signer = await loadWalletSigner({
      signerModule: modulePath,
      expectedWallet: expectedAddress,
    });
    expect(signerAddress(signer)).toBe(expectedAddress);
    expect(await signer.signMessage(new TextEncoder().encode("bout-test"))).toHaveLength(64);
    const unsigned = new VersionedTransaction(
      new TransactionMessage({
        payerKey: signer.publicKey,
        recentBlockhash: "11111111111111111111111111111111",
        instructions: [],
      }).compileToV0Message(),
    );
    const signed = await signPreparedTransaction(
      Buffer.from(unsigned.serialize()).toString("base64"),
      signer,
    );
    const transaction = VersionedTransaction.deserialize(Buffer.from(signed, "base64"));
    expect(transaction.signatures[0]).not.toEqual(new Uint8Array(64));
  });

  it("rejects missing, conflicting, and unpinned signer sources", async () => {
    await expect(loadWalletSigner({})).rejects.toThrow("exactly one signer source");
    await expect(loadWalletSigner({ keypair: "key.json", signerModule: modulePath }))
      .rejects.toThrow("exactly one signer source");
    await expect(loadWalletSigner({ signerModule: modulePath }))
      .rejects.toThrow("requires --expected-wallet");
  });

  it("rejects an unexpected external account before an SDK request", async () => {
    await expect(loadWalletSigner({
      signerModule: modulePath,
      expectedWallet: "11111111111111111111111111111111",
    })).rejects.toThrow("does not match --expected-wallet");
  });

  it("preserves the existing keypair path and checks its expected address", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "bout-signer-"));
    temporaryDirectories.push(directory);
    const keypairPath = path.join(directory, "test-key.json");
    await writeFile(keypairPath, JSON.stringify(Array(32).fill(7)));
    const signer = await loadWalletSigner({ keypair: keypairPath, expectedWallet: expectedAddress });
    expect(signerAddress(signer)).toBe(expectedAddress);
  });

  it("rejects malformed signer modules", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "bout-signer-"));
    temporaryDirectories.push(directory);
    const badModule = path.join(directory, "bad.mjs");
    await writeFile(badModule, "export default async () => ({ publicKey: null });\n");
    await expect(loadWalletSigner({
      signerModule: badModule,
      expectedWallet: expectedAddress,
    })).rejects.toThrow("Signer must provide");
  });
});
