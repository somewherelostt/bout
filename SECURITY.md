# Security

## Wallet material

Wallet keys are read only from an explicit local file during the publish command. Key contents are never written to battle state, command output, logs, or repository files. Use a dedicated low-balance wallet for testing.

## Public review material

Everything under a battle's `review` directory should be treated as publishable. Do not place proprietary code, credentials, personal information, internal hostnames, or secret-bearing logs in task or candidate files.

The `private` directory contains the source identity mapping, publication receipt, synchronized review responses, and final reports. It is creator-only local state and must not be distributed to reviewers without deliberate redaction.

## Dependency advisories

The required external transaction SDK currently brings moderate-severity transitive advisories through its blockchain client dependency. There is no upstream fix available in the published dependency graph as of 2026-09-26. The affected streaming and UUID paths are not called directly by this project, but releases should continue to run `npm audit` and update as soon as an upstream fix is available.
