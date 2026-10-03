# Gibwork submission package

Use this document as the final assembly sheet for the bounty submission. The current demo proves a real Gibwork publication; live reviewer consensus remains explicitly pending.

![Bout cover](../web/public/bout-cover.png)

## Submission title

**Bout — two code changes, one fair review**

## Short description

Bout helps a developer compare two code changes fairly. It hides who wrote each change, publishes a paid review task through Gibwork, and brings the reviewers' reasons back into the developer's terminal.

## Paste-ready submission

### Why I made Bout

Choosing between two fixes can be harder than writing them. One change might be shorter; another might handle awkward edge cases better. Automated tests help, but they do not always tell you which approach will be safer or easier to maintain.

I built **Bout** to make that decision easier to review. A developer gives it two proposed code changes for the same task. Bout hides who produced each one, then uses Gibwork to offer a paid review. The reviewer can focus on the code and explain their choice.

That is what “blind review” means here: reviewers see **Patch A** and **Patch B**, while the developer keeps the original identities privately.

### How it works

1. **Give both changes the same brief.** The developer supplies one task and two patch files, which contain the proposed code changes.
2. **Prepare a fair comparison.** Bout labels the patches A and B and records a digital fingerprint for each file, so the exact code being reviewed can be checked later.
3. **Publish the paid review.** The Gibwork SDK creates the bounty from the terminal. Preparing the files does not move money; publication is a separate, confirmed step.
4. **Collect reasons, not just a vote.** Reviewers are asked to assess correctness, security, and maintainability and explain their choice with evidence from the code.
5. **Bring the result back.** Bout downloads the submissions through the SDK, checks their format, and can generate a private report showing whether the reviewers agree. It does not force a winner when the votes are tied.

The main product runs from the **command line**. The local visual workbench is a companion for inspecting the same files and demonstrating the workflow. No browser is required for the core CLI workflow.

### What the real demo shows

The example compares two fixes for a path-handling bug: the code should keep file access inside the intended workspace. Reviewers can inspect how each patch handles unsafe paths and explain which approach is stronger.

I created the anonymous bundle and published one real Gibwork stage bounty with a **2 USDC pool**. The payment transaction is finalized. Its task ID is `76bc62aa-5dca-4758-9f10-f77205cd0d01`.

The demo follows the workflow from the anonymous patch bundle through real, funded bounty publication. The review-validation and reporting paths are also implemented and covered by automated tests.

The 48-second film includes actual workflow footage. The longer walkthrough and screenshots below let reviewers inspect the details. The project passed 34 automated tests and its build checks. I have also attended both required Discord hackathon sessions.

### Links

- **Source:** https://github.com/somewherelostt/bout
- **Read-only visual showcase:** https://bout-omega.vercel.app
- **Project brief:** https://maaztwts.notion.site/Bout-Paid-Blind-Code-Review-3e732902e4a38129804adae0dbbb4820
- **Demo video:** https://drive.google.com/file/d/1CZz1mFeRgoaPFVXod2Sl9rXLHf3po-hK/view (48-second launch film; 1080p/60fps, original music, and 32 seconds of actual workflow recording)
- **Extended walkthrough:** https://drive.google.com/file/d/1dRq8T6-v6-5_P7YPNd9MOo8MkGT-iQGp/view (original 72-second captioned recording)
- **Published Gibwork stage task:** `76bc62aa-5dca-4758-9f10-f77205cd0d01` (SDK-verified; a public stage task URL has not yet been verified)
- **Publication proof:** https://explorer.solana.com/tx/3w4B2qPPbFxfa2hUxHcY3xHydeWyAFKjA9LUjFLAj2fiyCfbHaGPcEyL2Lm3kcySWGSYHf8mCcEvtNTNG2BcNohG
- **Screenshot gallery:** https://github.com/somewherelostt/bout/tree/main/docs/screenshots

### Setup

```bash
git clone https://github.com/somewherelostt/bout.git
cd bout
npm install
npm run build
npm link
bout doctor
```

Run the included safe example:

```bash
bout battle create \
  --task ./examples/path-validation/task.md \
  --candidate-one ./examples/path-validation/candidate-one.patch \
  --candidate-two ./examples/path-validation/candidate-two.patch \
  --verify "npm test"
```

Prepare its bounty draft with the battle ID returned above:

```bash
bout bounty prepare <battle-id> --pool 2.00 --min-payout 1.00
```

The README documents the guarded stage publishing, synchronization, and reporting commands. A dedicated low-balance wallet is required for the real stage demonstration because the stage environment uses real mainnet USDC.

### Validation completed

- Complete automated test suite passes.
- CLI, root TypeScript, web TypeScript, API server, and production web build pass.
- The hosted showcase returns no seeded tasks or reviewer records and rejects write requests.
- Secret, personal-path, and private-workspace scans pass.
- High- and critical-severity dependency checks pass.
- One real stage bounty was published for exactly `2.00 USDC`; its Solana payment transaction finalized without error. Reviewer sync and final report are pending real submissions.

## Upload order for the Gibwork editor

1. Upload `web/public/bout-cover.png` as the first image.
2. Paste the submission text above.
3. Add `docs/screenshots/showcase-home.png` as the product overview image.
4. Add the redacted proof screenshots in this order:
   - `docs/screenshots/created-bout-history.png` — the real battle in local history;
   - `docs/screenshots/anonymous-patches.png` — anonymous A/B patches and hash prefixes;
   - `docs/screenshots/published-stage-task.png` — published status, task ID, and honest review count;
   - `docs/screenshots/evidence-workflow.png` — publication completed, review sync and final report pending.
5. Add the public demo video link.
6. Add the public project brief link.
7. Add the repository and hosted showcase links again at the end so they are visible without expanding the full text.

## Final evidence gate

Required checks before submitting:

- [x] A real Gibwork stage task URL or ID is present.
- [x] The current screenshots contain no private path, wallet address, key material, or reviewer profile data.
- [x] The demo video is shared as "Anyone with the link · Viewer" in Google Drive, its preview plays, and its direct download returns HTTP 200 as `video/mp4` without account cookies.
- [x] Unauthenticated requests return HTTP 200 for the project brief, repository, showcase, screenshot gallery, each proof image, and the Drive video download.
- [x] User confirmed attendance at two hackathon Discord sessions; proof should remain available privately.

Optional extension after submission: synchronize at least two independent real structured reviewer submissions and add a redacted final report. There are currently zero live reviews; the submission and demo explicitly say so.
