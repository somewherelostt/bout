// Test-only signer: the fixed seed is public and must never hold funds.
import { createKeypairSigner } from "@gibwork/sdk/node";

export async function createBoutSigner() {
  return createKeypairSigner(new Uint8Array(32).fill(7));
}
