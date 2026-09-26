# Blind Review Harness

A terminal-first workflow for comparing two code changes under the same task and test conditions, then collecting a structured human judgment.

The project is intentionally CLI-first. It produces inspectable files instead of requiring a dashboard, keeps candidate identities hidden during review, and records hashes for every input used in a decision.

## Status

Early implementation. The first milestone covers local battle creation, deterministic evidence capture, reviewer workflow integration, and report export.

## Requirements

- Node.js 22.12 or newer
- Git

## Development

```bash
npm install
npm run dev -- doctor
npm run check
```

## Create a local review battle

Prepare a Markdown task and two patch files, then run:

```bash
npm run dev -- battle create \
  --task ./task.md \
  --candidate-one ./candidate-one.patch \
  --candidate-two ./candidate-two.patch \
  --verify "npm test"
```

The command creates `.review-harness/battles/<id>/review`, which contains only anonymous reviewer material. The source-to-label mapping is kept under the battle's separate `private` directory.

## Prepare a reviewer bounty

Generate the exact public payload locally before authorizing any financial action:

```bash
npm run dev -- bounty prepare <battle-id> --pool 1.00 --min-payout 1.00
```

Preparation does not access a wallet or spend funds. It writes `bounty-draft.json` into the battle's review directory for inspection.

Publishing is deliberately separate and only supports the stage environment. Stage uses real mainnet USDC. The command requires a local keypair path and an explicit confirmation phrase:

```bash
npm run dev -- bounty publish <battle-id> \
  --keypair /absolute/path/to/keypair.json \
  --confirm-real-funds "I UNDERSTAND STAGE USES REAL USDC"
```

Never commit a keypair, seed phrase, private key, or populated environment file.

## Principles

- The same task and verification command apply to both candidates.
- Candidate identity is separated from the reviewer-facing bundle.
- Financial actions require explicit confirmation.
- Secrets and private repository contents are never published implicitly.
- Every decision remains auditable through local artifacts and content hashes.
