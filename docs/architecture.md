# Architecture

## Trust boundaries

The system keeps reviewer-visible evidence separate from creator-only state.

```text
task + source candidates
          |
          v
  battle constructor
      |           |              |
      v           v              v
review bundle   private state   SQLite index
      |           |              |
      v           v              v
bounty draft    identity map    queryable metadata
      |
      v
explicit publish confirmation
      |
      v
remote task + local receipt
```

The review bundle contains only anonymous labels, normalized filenames, task instructions, verification metadata, and content hashes. Original source paths and label assignments remain in private local state.

## Hybrid local state

Each battle is written atomically under `.bout/battles/<battle-id>`. Structured metadata is then transactionally indexed in `.bout/bout.sqlite`:

```text
review/
  task.md
  candidate-a.patch
  candidate-b.patch
  manifest.json
  bounty-draft.json
  verdict.json
private/
  identity-map.json
  publication.json
```

`bounty-draft.json` is safe to inspect before publication. `publication.json` is written only after the external create operation returns successfully.

`verdict.json` is written only after the local reviewer completes the full structured contract: outcome (`A`, `B`, `TIE`, or `BOTH_FAILED`), confidence, correctness, security, maintainability, evidence, and rationale. Only schema-versioned verdicts count toward evidence metrics; incomplete historical files are left on disk but are not presented as valid results.

The SQLite index contains normalized `battles`, `candidates`, `bounty_drafts`, `publications`, `verdicts`, `artifacts`, and `workflow_events` tables. Patch and task bodies are deliberately excluded. Artifact rows contain paths, sizes, visibility, and SHA-256 digests so files remain inspectable with normal developer tools.

Database migrations are versioned and applied during storage initialization. API startup reconciles existing file-only battle directories into the index, and every supported write path refreshes the relevant battle transactionally. The artifact bundle remains the recovery source: deleting only `bout.sqlite` and restarting rebuilds the index.

## Safety properties

- Candidate inputs with identical hashes are rejected.
- Reviewer filenames never contain source identifiers.
- Patch bodies remain outside the database.
- SQLite foreign keys and transactions keep related metadata consistent.
- Draft preparation performs no network or wallet operation.
- The current publisher is stage-only.
- Real-fund publishing requires an exact confirmation phrase.
- Wallet material is read from an explicit file and never persisted.
- Financial calls are injectable so tests never broadcast transactions.

## Planned slices

1. Run both patches in isolated Git worktrees under the same verification command.
2. Capture structured stdout, stderr, duration, and exit status in the review bundle.
3. Fetch and validate reviewer submissions against a strict decision schema.
4. Require a local confirmation before approval or rejection actions.
5. Export a signed-off Markdown report and machine-readable evaluation record.
