# Architecture

## Trust boundaries

The system keeps reviewer-visible evidence separate from creator-only state.

```text
task + source candidates
          |
          v
  battle constructor
      |           |
      v           v
review bundle   private state
      |           |
      v           v
bounty draft    identity mapping
      |
      v
explicit publish confirmation
      |
      v
remote task + local receipt
```

The review bundle contains only anonymous labels, normalized filenames, task instructions, verification metadata, and content hashes. Original source paths and label assignments remain in private local state.

## Local state

Each battle is written atomically under `.bout/battles/<battle-id>`:

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

## Safety properties

- Candidate inputs with identical hashes are rejected.
- Reviewer filenames never contain source identifiers.
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
