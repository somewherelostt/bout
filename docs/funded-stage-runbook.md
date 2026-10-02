# Funded Gibwork stage runbook

Use this runbook for the one real-money demonstration. Stop immediately on any unexpected
wallet, quote, intent, task, or transaction value.

## Current prepared run

- Battle ID: `9dace82d-cf59-4842-8698-e80792cf7f0f`
- Pool: `1.00 USDC`
- Minimum payout: `0.50 USDC`
- Capacity: two approved reviews at the minimum payout
- Publication state: not started
- Network: Gibwork stage, using real Solana-mainnet USDC

Do not send funds until the signing wallet is active on the Gibwork account and
`bout bounty quote` succeeds. The wallet currently shown for the signed-in account is managed
in the Gibwork app; its export-key control does not prove that it supports external signing.

## 1. Choose and verify the signing wallet

1. Decide whether to use a separate, low-balance wallet or the Gibwork-managed primary wallet.
   The primary wallet is not isolated from the account, even if its current balance is zero.
2. The wallet must be active on the Gibwork account. Check its full **Solana** address; an EVM
   `0x` address is not interchangeable. If Gibwork does not offer a way to link a separate wallet,
   ask Gibwork support before funding it.
3. Prefer a compatible external signer when available. Bout accepts a trusted local module via
   `--signer-module`; see [the signer contract](external-signer.md). Gibwork's app export-key
   option by itself is **not** an external signing interface, and we have not verified that the
   managed wallet can answer third-party signing requests.
4. The fallback is an owner-only local file containing the chosen wallet's **Solana private key**,
   outside the repository and cloud-synced folders. Never paste a private key or recovery phrase
   into chat, shell history, screenshots, or the demo recording. Bout accepts a base58 32/64-byte
   key or a JSON array of 32/64 bytes.

Exporting the primary Gibwork wallet's key gives local software full control over that wallet.
Do not do so by default; make an informed choice after checking whether a compatible external
signer is available. MetaMask's [private-key export warning](https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key/)
explains the general risk of exposing wallet keys.

## 2. Validate locally before funding

From the repository root, set local variables. The key file contents must not be printed:

```powershell
$boutBattleId = "9dace82d-cf59-4842-8698-e80792cf7f0f"
$boutKeyPath = "C:\secure\bout-stage-keypair.txt"
$boutWallet = "<full active Gibwork Solana address>"

npm run build
node dist/cli.js doctor
node dist/cli.js bounty publish-status $boutBattleId
node dist/cli.js wallet-check --keypair $boutKeyPath --expected-wallet $boutWallet
```

For a compatible external signer module, replace the final command with:

```powershell
$boutSigner = "C:\secure\bout-signer.mjs"
node dist/cli.js wallet-check --signer-module $boutSigner --expected-wallet $boutWallet
```

`wallet-check` makes no network request or signature. Its printed address must match the
Gibwork wallet and the address that will receive USDC.

## 3. Request the live quote without paying

```powershell
node dist/cli.js bounty quote $boutBattleId --keypair $boutKeyPath --expected-wallet $boutWallet
```

External signer: replace `--keypair $boutKeyPath` with
`--signer-module $boutSigner --expected-wallet $boutWallet`. Use this replacement for publish
and sync as well. The quote may request authentication signatures from the external wallet.

Expected shape:

```text
FUNDING    1.00 USDC
FEE        <current fee> USDC
TOTAL      <exact debit> USDC
SPEND      none; payment transaction was not signed or submitted
```

This request signs API authentication messages, creates a temporary unpaid intent, and prepares
an unsigned transaction. It does not sign or submit the payment transaction.

Stop if any of these occur:

- `403` or an inactive/unlinked-wallet message;
- a token other than USDC;
- a funding amount other than `1.00`;
- a fee or total that you do not accept;
- a task title or payload different from the prepared battle.

Gibwork limits prepare calls. Do not repeat the quote rapidly; wait at least one minute before a
new prepare/publish attempt and follow any returned retry interval.

## 4. Fund only the verified Solana address

1. Send **Solana-network USDC**, not Ethereum/Base/Polygon USDC.
2. Verify the USDC mint is `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
3. Send at least the printed `TOTAL`. A `$1.00` transfer is sufficient only if `TOTAL` is exactly
   `1.00 USDC`; otherwise it will fail safely before publication.
4. Wait until MetaMask shows the confirmed Solana balance.
5. Do not add unrelated funds or assets to this wallet.

## 5. Publish once

Use the exact `TOTAL` printed by the quote as the ceiling:

```powershell
$boutQuotedTotal = "<TOTAL from quote>"

node dist/cli.js bounty publish $boutBattleId `
  --keypair $boutKeyPath `
  --expected-wallet $boutWallet `
  --max-total $boutQuotedTotal `
  --confirm-real-funds "I UNDERSTAND STAGE USES REAL USDC"
```

Before this command is run, the operator must explicitly approve the real-money action. Never
repeat it after a timeout, `processing` response, or ambiguous error.

Immediately inspect durable state:

```powershell
node dist/cli.js bounty publish-status $boutBattleId
```

- `confirmed`: save the task ID and transaction hash.
- `unresolved`: save the intent/task/transaction identifiers and do not publish again.
- `not started`: the payment was not submitted; diagnose before attempting anything else.

## 6. Collect, synchronize, and report

Give two reviewers the public Gibwork task and require the response contract embedded in the
bounty. After two real submissions appear:

```powershell
node dist/cli.js bounty sync $boutBattleId --keypair $boutKeyPath --expected-wallet $boutWallet
node dist/cli.js report generate $boutBattleId
node dist/cli.js battle list
```

The sync must show two submissions and two valid structured reviews before the final report is
used as evidence. If a submission is malformed, ask the reviewer to follow the exact response
contract and synchronize again. A split A/B vote correctly produces `NO_CONSENSUS`; it is not a
software failure.

## 7. Evidence capture

Capture these files only after the real run. Crop or redact local usernames, key-file paths,
wallet addresses, and reviewer identities.

1. `01-battle-created.png` — battle ID, anonymous A/B creation, and no source identities.
2. `02-anonymous-hashes.png` — `manifest.json`, both SHA-256 hashes, and the shared task.
3. `03-gibwork-task.png` — public task page, task ID, pool, and review instructions.
4. `04-reviews-synced.png` — submission count and valid structured-review count.
5. `05-final-report.png` — vote tally, consensus, evidence summary, and resolved source slot.

Computer use may capture browser pages and the local read-only workbench. Wallet unlocks,
recovery phrases, private keys, and the final transfer/transaction confirmation stay under direct
user control and must never be captured.

## 8. Five-minute recording plan

- **0:00–0:20** — State the problem and show the repository title.
- **0:20–0:45** — Run `bout doctor` and create the anonymous battle.
- **0:45–1:20** — Show Candidate A/B and the manifest hashes.
- **1:20–2:00** — Show the public Gibwork task and confirmed publication receipt.
- **2:00–2:35** — Show the two real structured reviewer submissions without profiles.
- **2:35–3:10** — Run `bout bounty sync` and show `2` submissions / `2` valid.
- **3:10–4:10** — Run `bout report generate`; explain tally and private source resolution.
- **4:10–4:40** — Briefly show the hosted read-only workbench and architecture boundary.
- **4:40–5:00** — Close with repository, Notion brief, and the practical value of Gibwork.

Publish the recording as unlisted/public and verify it in a signed-out browser before adding the
URL to the README and Gibwork submission.
