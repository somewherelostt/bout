# Gibwork submission package

Use this document as the final assembly sheet for the bounty submission. Replace every `ADD BEFORE SUBMITTING` marker with real public evidence before pasting it into Gibwork.

![Bout cover](../web/public/bout-cover.png)

## Submission title

**Bout — paid blind review for competing code patches**

## Short description

Bout is a terminal-first workflow that turns two competing Git patches into an anonymous, paid code-review bounty. It uses the Gibwork SDK as the review transport, validates structured human verdicts, resolves consensus, and exports creator-only Markdown and JSON reports with the winning source identity.

## Paste-ready submission

### What I built

I built **Bout**, a terminal-first developer workflow for paid blind review of competing code patches.

Bout takes one task and two Git patches, assigns the candidates randomized A/B identities, records SHA-256 integrity evidence, and prepares a reviewer-safe bounty package. The creator can then publish the review through Gibwork, synchronize structured reviewer submissions, exclude malformed or rejected responses, calculate deterministic consensus, and export a private final report that maps the winning anonymous candidate back to its original source.

### Why it is useful

Automated tests can show that known expectations pass, but they often cannot decide which of two plausible implementations is safer, clearer, or easier to maintain. Ordinary review also exposes author identity and rarely provides a consistent evidence contract.

Bout adds a paid human judgment layer while keeping the comparison fair:

- both candidates receive the same task, verification command, and rubric;
- reviewers see neutral A/B labels rather than source identities;
- every public artifact is hashed and inspectable;
- verdicts require correctness, security, maintainability, evidence, rationale, and confidence;
- creator-only files retain the private identity map and final source resolution.

### How Gibwork is core to the workflow

Bout uses the **Gibwork SDK** to publish the anonymous review bounty and retrieve creator-visible submissions. Gibwork is not a decorative API call: it is the paid human-review transport between artifact preparation and consensus reporting.

The integration is intentionally guarded. Draft generation is offline. Publishing is a separate stage-only action with an exact confirmation phrase, a creator-defined maximum debit, and a private recovery record that blocks accidental duplicate funding when a network result is uncertain.

### Core workflow

1. Run `bout doctor` to verify Node.js, Git, SQLite, and workspace readiness.
2. Create a battle from one task and two real Git patch files.
3. Inspect the anonymous reviewer bundle and SHA-256 manifest.
4. Prepare the Gibwork bounty payload locally without moving funds.
5. Publish to stage with an explicit real-funds confirmation and debit ceiling.
6. Synchronize real reviewer submissions from Gibwork.
7. Generate the private Markdown and JSON consensus report.

### Links

- **Source:** https://github.com/somewherelostt/bout
- **Read-only visual showcase:** https://bout-omega.vercel.app
- **Project brief:** https://maaztwts.notion.site/Bout-Paid-Blind-Code-Review-3e732902e4a38129804adae0dbbb4820
- **Demo video:** ADD BEFORE SUBMITTING — paste the public recording URL
- **Published Gibwork task:** ADD BEFORE SUBMITTING — paste the task URL or ID

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

## Upload order for the Gibwork editor

1. Upload `web/public/bout-cover.png` as the first image.
2. Paste the submission text above.
3. Add `docs/screenshots/showcase-home.png` as the product overview image.
4. Add four redacted proof screenshots in this order:
   - battle creation and returned battle ID;
   - anonymous A/B bundle plus manifest hashes;
   - confirmed Gibwork publication receipt or task page;
   - final report with tally, evidence, and resolved winner.
5. Add the public demo video link.
6. Add the public project brief link.
7. Add the repository and hosted showcase links again at the end so they are visible without expanding the full text.

## Final evidence gate

Do not submit until each item is true:

- [ ] A real Gibwork stage task URL or ID is present.
- [ ] At least two real structured reviewer submissions were synchronized.
- [ ] The final report screenshot contains no private path, wallet address, key material, or reviewer profile data.
- [ ] The demo video is public and opens in a signed-out browser.
- [ ] The project brief, repository, showcase, and every screenshot URL open in a signed-out browser.
- [ ] Attendance for at least two hackathon Discord sessions is recorded.
