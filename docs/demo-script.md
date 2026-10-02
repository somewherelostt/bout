# Bout demo runbook

This runbook keeps the final demonstration terminal-first and within five minutes.

## Before recording

- The single real-money publication in [`funded-stage-runbook.md`](funded-stage-runbook.md) is complete. Do **not** publish a second bounty for the recording.
- Use the existing published battle `9dace82d-cf59-4842-8698-e80792cf7f0f` and task `76bc62aa-5dca-4758-9f10-f77205cd0d01`.
- Close notifications and unrelated applications.
- Use a clean workspace with no personal paths in the terminal prompt.
- Confirm that the published bounty already has at least two real reviewer submissions.
- Never display a keypair file, private key, recovery phrase, or signer approval screen.

## Recording sequence

1. Introduce the problem: automated checks cannot always choose between two plausible patches, while ordinary reviews reveal authorship and provide no paid decision contract.
2. Run `bout doctor`.
3. Show the existing published battle in `bout battle list`, and explain that it was created from the two real patches in `examples/path-validation`. The original creator-private battle artifacts stay off camera.
4. Show the anonymous `candidate-a.patch`, `candidate-b.patch`, and manifest hashes for that same battle.
5. Show its already prepared public bounty payload; do not call `prepare` or `publish` again.
6. Show the existing Gibwork task ID and run `bout bounty publish-status 9dace82d-cf59-4842-8698-e80792cf7f0f` to display the confirmed receipt. The on-chain transaction is already finalized.
7. Run `bout bounty sync` with either the creator keypair path or external signer module path
   supplied through a shell variable; keep paths and wallet approvals outside the camera crop.
8. Run `bout report generate`.
9. Open `private/report.md` and point out the tally, evidence, consensus, and privately resolved source slot.
10. Optionally show the local workbench for no more than 20 seconds to demonstrate that the same artifact-backed state is inspectable visually.

If the two real reviews have not arrived, stop after step 6. That is only a publication proof clip, **not** the final end-to-end submission video. Resume or re-record after genuine review synchronization and report generation succeed. Neither requires another funded bounty.

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
