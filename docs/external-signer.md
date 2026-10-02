# External wallet signer

Bout can use the Gibwork SDK's `WalletSigner` contract instead of reading a private-key file.
This is an integration point for a trusted wallet adapter, hardware-wallet provider, or
custody service that can sign Solana messages and versioned transactions. The signer module
runs **locally with the same permissions as Bout**. Never load a module you do not trust.

The external wallet must already be the active wallet for the Gibwork account in the selected
stage environment. A wallet address by itself does not authorize SDK calls or task creation.

## Contract

Create a local ESM module outside the repository that exports `createBoutSigner()` (or a default
factory). It must resolve to the SDK's `WalletSigner` shape:

```js
export async function createBoutSigner() {
  const wallet = await connectToYourTrustedSigner();
  return {
    publicKey: wallet.publicKey, // @solana/web3.js PublicKey
    signMessage: (message) => wallet.signMessage(message), // Uint8Array -> Uint8Array
    signTransaction: (transaction) => wallet.signTransaction(transaction),
    // VersionedTransaction -> VersionedTransaction; do not broadcast here
  };
}
```

`connectToYourTrustedSigner` represents your provider's own connection API; it is not a Bout
function. The module must not submit or broadcast the transaction itself. Bout submits the
signed transaction once through the SDK after saving a recovery record.

For example, with a compatible provider module at `C:\secure\bout-signer.mjs`:

```powershell
$boutWallet = "<full Solana address linked to Gibwork>"
$boutSigner = "C:\secure\bout-signer.mjs"
$boutBattle = "<battle UUID>"

bout wallet-check --signer-module $boutSigner --expected-wallet $boutWallet
bout bounty quote $boutBattle --signer-module $boutSigner --expected-wallet $boutWallet
```

`wallet-check` makes no network request and does not sign. `quote` asks the external signer
to sign Gibwork authentication messages and prepares an unpaid intent, but it does not sign
or submit the payment transaction. Only after reviewing the quote and funding the exact
verified wallet should you use:

```powershell
bout bounty publish $boutBattle `
  --signer-module $boutSigner `
  --expected-wallet $boutWallet `
  --max-total <quoted-total> `
  --confirm-real-funds "I UNDERSTAND STAGE USES REAL USDC"

bout bounty sync $boutBattle --signer-module $boutSigner --expected-wallet $boutWallet
bout report generate $boutBattle
```

Only one signer source may be selected: `--signer-module` or `--keypair`. For external modules,
`--expected-wallet` is mandatory and checked before any SDK request or transaction signing.
The existing keypair commands remain available.

## Gibwork app limitation

The Gibwork website currently displays a wallet managed in the Gibwork mobile app. An **Export
private key** control is not the same as a wallet-adapter or remote signing connection. We have
not verified that the app can respond to third-party `signMessage` and `signTransaction`
requests. Do not assume that this module route works with that managed wallet unless Gibwork
provides a compatible signing interface. If it does not, use a separate active platform wallet
with a supported adapter, ask Gibwork about external-wallet linking, or choose the explicit
local keypair route after understanding its security trade-off. Do not fund a wallet until the
stage quote succeeds.
