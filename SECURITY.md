# Security

## Wallet material

Wallet keys are read only from an explicit local file during the publish command. Key contents are never written to battle state, command output, logs, or repository files. Use a dedicated low-balance wallet for testing. Publishing prepares the Gibwork transaction, checks its total debit against the explicit `--max-total` ceiling, and signs only when the quote is within that limit.

Before network submission, Bout atomically claims a per-battle publish attempt and stores the prepared task ID, intent, block height, and quote under creator-private state. An ambiguous or non-confirmed response preserves that record and blocks automatic retry. Use `bout bounty publish-status <battle-id>` to inspect it and resolve the task with Gibwork before taking any further financial action.

## Public review material

Everything under a battle's `review` directory should be treated as publishable. Do not place proprietary code, credentials, personal information, internal hostnames, or secret-bearing logs in task or candidate files.

The `private` directory contains the source identity mapping, publication attempt/receipt, synchronized review responses, and final reports. It is creator-only local state and must not be distributed to reviewers without deliberate redaction.

## Dependency advisories

The required external transaction SDK currently brings moderate-severity transitive advisories through its blockchain client dependency. There is no upstream fix available in the published dependency graph as of 2026-09-26. The affected streaming and UUID paths are not called directly by this project, but releases should continue to run `npm audit` and update as soon as an upstream fix is available.
