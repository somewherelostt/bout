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

## Principles

- The same task and verification command apply to both candidates.
- Candidate identity is separated from the reviewer-facing bundle.
- Financial actions require explicit confirmation.
- Secrets and private repository contents are never published implicitly.
- Every decision remains auditable through local artifacts and content hashes.
