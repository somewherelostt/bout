<div align="center">

# Bout

### Paid blind review for competing code patches, powered by Gibwork.

Turn two candidate patches into one evidence-backed human verdict—without revealing who produced either candidate.

</div>

---

Bout is a terminal-first evaluation workflow for code changes. It packages two patches against the same task, randomizes their reviewer-facing identities, records tamper-evident hashes, and prepares a paid review bounty with a strict response contract.

No dashboard is required. Every task, patch, decision, and receipt remains inspectable as a local file.

## Why Bout

Automated tests answer whether known expectations pass. They do not reliably determine which implementation is safer, clearer, or more maintainable when both candidates appear correct.

Bout adds a structured human judgment layer:

```text
one task + two patches
          │
          ▼
  anonymous candidates
       A       B
        \     /
         human review
              │
              ▼
      evidence-backed verdict
```

The same task and verification command apply to both candidates. Original source identities stay private while reviewers receive normalized filenames, hashes, and an identical evaluation rubric.

## What works today

| Capability | Status |
| --- | --- |
| Environment diagnostics | Ready |
| Atomic battle creation | Ready |
| Randomized A/B assignment | Ready |
| SHA-256 evidence manifests | Ready |
| Private identity mapping | Ready |
| Offline bounty preview | Ready |
| Guarded stage publishing | Ready |
| Submission retrieval and verdict aggregation | Next |
| Final Markdown and JSON reports | Next |

## Quick start

### Requirements

- Node.js 22.12 or newer
- Git

### Install

```bash
npm install
npm run build
npm link
bout doctor
```

Expected result:

```text
PASS  Node.js  v22+
PASS  Git      git version ...
```

## Run a blind battle

Prepare three files:

```text
task.md
candidate-one.patch
candidate-two.patch
```

`task.md` should define the problem, constraints, acceptance criteria, and the expected verification command. Candidate files should be standard Git patches without author or model identifiers.

Create the battle:

```bash
bout battle create \
  --task ./task.md \
  --candidate-one ./candidate-one.patch \
  --candidate-two ./candidate-two.patch \
  --verify "npm test"
```

Bout returns a battle UUID and creates an isolated local record:

```text
.bout/battles/<battle-id>/
├── review/
│   ├── task.md
│   ├── candidate-a.patch
│   ├── candidate-b.patch
│   └── manifest.json
└── private/
    └── identity-map.json
```

Only the `review` directory belongs in reviewer-facing material. The `private` directory contains the source-to-label mapping and must remain local.

## Prepare the paid review

Generate the complete bounty payload locally:

```bash
bout bounty prepare <battle-id> \
  --pool 1.00 \
  --min-payout 1.00
```

This command:

- reads only the anonymous review bundle;
- validates the pool and minimum payout;
- embeds the task, both patches, hashes, and review rubric;
- writes `review/bounty-draft.json` for inspection;
- performs no network request and spends no funds.

Review the generated draft before publishing it.

## Publish to stage

> [!WARNING]
> The stage environment uses real mainnet USDC. Use a dedicated low-balance wallet and review every amount before continuing.

Publishing is a separate, explicitly gated action:

```bash
bout bounty publish <battle-id> \
  --keypair /absolute/path/to/keypair.json \
  --confirm-real-funds "I UNDERSTAND STAGE USES REAL USDC"
```

Bout refuses to publish unless the confirmation phrase matches exactly. Wallet material is read from the supplied file, used locally for signing, and never written into battle state or command output.

## Reviewer contract

Every reviewer is asked to return a structured decision:

```text
WINNER: A | B | TIE | BOTH_FAILED
CONFIDENCE: 1-5

CORRECTNESS:
...

SECURITY:
...

MAINTAINABILITY:
...

EVIDENCE:
- cite concrete files, lines, tests, or behavior

RATIONALE:
...
```

Responses without concrete evidence can be rejected or returned for clarification.

## Trust model

Bout is designed around explicit boundaries:

- Candidate inputs with identical hashes are rejected.
- A/B assignment is randomized for every battle.
- Reviewer filenames never reveal source identities.
- Public drafts are generated exclusively from the anonymous review bundle.
- Draft preparation never loads wallet credentials.
- Publishing currently supports stage only.
- Financial actions require explicit confirmation.
- Wallet secrets are never persisted or logged.

Do not place proprietary code, credentials, personal information, internal hostnames, or secret-bearing logs in reviewer-facing files.

## Command reference

```text
bout doctor
bout battle create [options]
bout bounty prepare <battle-id> [options]
bout bounty publish <battle-id> [options]
```

Run `bout <command> --help` for complete options.

## Development

```bash
npm install
npm run check
```

`npm run check` compiles the TypeScript project and runs the complete test suite. Remote verification also rejects high- or critical-severity dependency advisories.

## Documentation

- [Architecture and trust boundaries](docs/architecture.md)
- [Security policy](SECURITY.md)

## License

[MIT](LICENSE)
