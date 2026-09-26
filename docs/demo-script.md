# Bout demo runbook

This runbook keeps the final demonstration terminal-first and within five minutes.

## Before recording

- Use a dedicated low-balance stage wallet.
- Close notifications and unrelated applications.
- Use a clean workspace with no personal paths in the terminal prompt.
- Confirm that the published bounty already has at least two real reviewer submissions.
- Never display the keypair file or its contents.

## Recording sequence

1. Introduce the problem: automated checks cannot always choose between two plausible patches, while ordinary reviews reveal authorship and provide no paid decision contract.
2. Run `bout doctor`.
3. Create a battle from the files in `examples/path-validation`.
4. Show the anonymous `candidate-a.patch`, `candidate-b.patch`, and manifest hashes.
5. Run `bout bounty prepare` and inspect the generated public payload.
6. Show the already published Gibwork task and its task ID. Do not broadcast a new transaction during the recording unless the amount has been checked separately.
7. Run `bout bounty sync` with the creator wallet path kept outside the camera crop or supplied through a shell variable.
8. Run `bout report generate`.
9. Open `private/report.md` and point out the tally, evidence, consensus, and privately resolved source slot.
10. Optionally show the local workbench for no more than 20 seconds to demonstrate that the same artifact-backed state is inspectable visually.

## Claims to make

- Gibwork is the paid human-review transport, not a decorative integration.
- Draft preparation is offline; publication is a separate real-funds action.
- Reviewers see only A/B identities and identical task context.
- Malformed and rejected reviews do not enter consensus.
- Tied top-level votes remain `NO_CONSENSUS`.
- Source identity resolution happens only in creator-private output.

## Claims to avoid

- Do not claim that prepared pool amounts prove escrow.
- Do not claim that patches were executed unless execution evidence was captured separately.
- Do not describe the optional workbench as the core product.
