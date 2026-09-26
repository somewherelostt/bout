import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CreateTaskResult, TaskSubmission } from "@gibwork/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { createBattle } from "../src/core/battle.js";
import { listIndexedBattles } from "../src/db/store.js";
import { prepareBountyDraft } from "../src/marketplace/draft.js";
import { publishBounty } from "../src/marketplace/publish.js";
import {
  aggregateReviews,
  generateFinalReport,
  parseReviewSubmission,
  syncBountySubmissions,
} from "../src/marketplace/reviews.js";

const temporaryDirectories: string[] = [];
const battleId = "66666666-6666-4666-8666-666666666666";
const taskId = "77777777-7777-4777-8777-777777777777";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("Gibwork review results", () => {
  it("parses plain text and HTML structured reviews", () => {
    const parsed = parseReviewSubmission(`
      <p>WINNER: A</p>
      <p>CONFIDENCE: 5</p>
      <p>CORRECTNESS: Candidate A handles the missing branch.</p>
      <p>SECURITY: Input remains validated.</p>
      <p>MAINTAINABILITY: The change is smaller.</p>
      <p>EVIDENCE:</p><ul><li>parser.ts adds the required guard.</li><li>Tests cover empty input.</li></ul>
      <p>RATIONALE: A is complete and focused.</p>
    `);

    expect(parsed.parseError).toBeNull();
    expect(parsed.verdict).toMatchObject({
      winner: "A",
      confidence: 5,
      evidence: ["parser.ts adds the required guard.", "Tests cover empty input."],
    });
  });

  it("reports no consensus for tied top-level votes", () => {
    const first = syncedSubmission("one", validReview("A", 4));
    const second = syncedSubmission("two", validReview("B", 5));
    const aggregate = aggregateReviews([first, second]);

    expect(aggregate).toMatchObject({
      outcome: "NO_CONSENSUS",
      validReviews: 2,
      votes: { A: 1, B: 1, TIE: 0, BOTH_FAILED: 0 },
    });
  });

  it("handles majority, rejected, malformed, and zero-review aggregates deterministically", () => {
    const rejected = {
      ...syncedSubmission("rejected", validReview("B", 5)),
      status: "REJECTED" as const,
    };
    const malformed = syncedSubmission("malformed", "WINNER: A");
    const aggregate = aggregateReviews([
      syncedSubmission("one", validReview("A", 3)),
      syncedSubmission("two", validReview("A", 5)),
      syncedSubmission("three", validReview("B", 4)),
      rejected,
      malformed,
    ]);

    expect(aggregate).toMatchObject({
      outcome: "A",
      validReviews: 3,
      invalidReviews: 1,
      excludedRejectedReviews: 1,
      averageConfidence: 4,
      votes: { A: 2, B: 1, TIE: 0, BOTH_FAILED: 0 },
    });
    expect(aggregateReviews([])).toMatchObject({
      outcome: "NO_CONSENSUS",
      validReviews: 0,
      averageConfidence: null,
    });
  });

  it("syncs real-shaped SDK submissions and exports creator-only reports", async () => {
    const workspace = await createPublishedBattle();
    const strong = sdkSubmission(
      "88888888-8888-4888-8888-888888888888",
      validReview("A", 5),
    );
    const malformed = sdkSubmission(
      "99999999-9999-4999-8999-999999999999",
      "I prefer A but did not follow the requested contract.",
    );

    const synced = await syncBountySubmissions({
      workspace,
      battleId,
      lister: { list: async () => ({ results: [strong, malformed] }) },
      now: () => new Date("2026-09-26T18:00:00.000Z"),
    });
    expect(synced.record.submissions).toHaveLength(2);
    expect(synced.record.submissions[0]?.verdict?.winner).toBe("A");
    expect(synced.record.submissions[1]?.parseError).toContain("Invalid structured review");

    const generated = await generateFinalReport({
      workspace,
      battleId,
      now: () => new Date("2026-09-26T18:05:00.000Z"),
    });
    expect(generated.report.aggregate).toMatchObject({
      outcome: "A",
      validReviews: 1,
      invalidReviews: 1,
    });
    expect(generated.report.resolvedWinner).toMatchObject({
      sourceSlot: "source-1",
      assignedLabel: "A",
    });
    const markdown = await readFile(generated.markdownPath, "utf8");
    expect(markdown).toContain("Consensus: **A**");
    expect(markdown).toContain("**Correctness**");
    expect(markdown).toContain("**Security**");
    expect(markdown).toContain("**Maintainability**");

    const indexed = await listIndexedBattles(workspace);
    expect(indexed[0]).toMatchObject({
      submissionCount: 2,
      validReviewCount: 1,
      report: { outcome: "A", resolvedLabel: "A" },
      hasSubmissionSync: true,
    });
  });

  it("rejects cross-task submissions without replacing the prior sync", async () => {
    const workspace = await createPublishedBattle();
    const original = sdkSubmission("88888888-8888-4888-8888-888888888888", validReview("A", 5));
    await syncBountySubmissions({
      workspace,
      battleId,
      lister: { list: async () => ({ results: [original] }) },
    });
    const submissionsPath = path.join(
      workspace,
      ".bout",
      "battles",
      battleId,
      "private",
      "submissions.json",
    );
    const before = await readFile(submissionsPath, "utf8");

    await expect(
      syncBountySubmissions({
        workspace,
        battleId,
        lister: {
          list: async () => ({
            results: [
              sdkSubmission(
                "99999999-9999-4999-8999-999999999999",
                validReview("B", 4),
                { taskId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
              ),
            ],
          }),
        },
      }),
    ).rejects.toThrow("different task; nothing was saved");
    expect(await readFile(submissionsPath, "utf8")).toBe(before);
  });

  it("rejects duplicate submission IDs and preserves empty malformed content", async () => {
    const workspace = await createPublishedBattle();
    const duplicate = sdkSubmission(
      "88888888-8888-4888-8888-888888888888",
      validReview("A", 5),
    );
    await expect(
      syncBountySubmissions({
        workspace,
        battleId,
        lister: { list: async () => ({ results: [duplicate, duplicate] }) },
      }),
    ).rejects.toThrow("duplicate submission IDs; nothing was saved");

    const empty = sdkSubmission("99999999-9999-4999-8999-999999999999", "");
    const synced = await syncBountySubmissions({
      workspace,
      battleId,
      lister: { list: async () => ({ results: [empty] }) },
    });
    expect(synced.record.submissions[0]).toMatchObject({
      content: "",
      verdict: null,
    });
    expect(synced.record.submissions[0]?.parseError).toContain("Invalid structured review");
  });

  it("records an empty successful sync and invalidates a stale report on resync", async () => {
    const workspace = await createPublishedBattle();
    const review = sdkSubmission("88888888-8888-4888-8888-888888888888", validReview("A", 5));
    await syncBountySubmissions({
      workspace,
      battleId,
      lister: { list: async () => ({ results: [review] }) },
    });
    const generated = await generateFinalReport({ workspace, battleId });
    await syncBountySubmissions({
      workspace,
      battleId,
      lister: { list: async () => ({ results: [] }) },
    });

    await expect(access(generated.jsonPath)).rejects.toThrow();
    await expect(access(generated.markdownPath)).rejects.toThrow();
    const indexed = await listIndexedBattles(workspace);
    expect(indexed[0]).toMatchObject({
      hasSubmissionSync: true,
      submissionCount: 0,
      validReviewCount: 0,
      report: null,
    });
    const regenerated = await generateFinalReport({ workspace, battleId });
    expect(regenerated.report.aggregate.outcome).toBe("NO_CONSENSUS");
  });
});

async function createPublishedBattle(): Promise<string> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "bout-reviews-"));
  temporaryDirectories.push(workspace);
  await mkdir(workspace, { recursive: true });
  const taskPath = path.join(workspace, "task.md");
  const firstPath = path.join(workspace, "candidate-one.patch");
  const secondPath = path.join(workspace, "candidate-two.patch");
  await Promise.all([
    writeFile(taskPath, "# Repair the parser\n\nRepository: https://example.test/repo\n"),
    writeFile(firstPath, "diff --git a/parser.ts b/parser.ts\n+first\n"),
    writeFile(secondPath, "diff --git a/parser.ts b/parser.ts\n+second\n"),
  ]);
  await createBattle(
    {
      workspace,
      taskPath,
      firstCandidatePath: firstPath,
      secondCandidatePath: secondPath,
      verificationCommand: "npm test",
    },
    {
      idFactory: () => battleId,
      now: () => new Date("2026-09-26T17:00:00.000Z"),
      shouldSwap: () => false,
    },
  );
  await prepareBountyDraft({
    workspace,
    battleId,
    poolAmount: "2.00",
    minimumPayout: "1.00",
  });
  await publishBounty({
    workspace,
    battleId,
    creator: {
      create: async () => ({
        taskId,
        intentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        txHash: "test-transaction",
        lastValidBlockHeight: 1,
        status: "confirmed",
        paymentQuote: {
          token: { mintAddress: "mint", symbol: "USDC", decimals: 6 },
          fundingAmount: "2.00",
          platformFee: { percent: 0, amount: "0.00" },
          totalDebit: "2.00",
        },
      }) as CreateTaskResult,
    },
  });
  return workspace;
}

function validReview(winner: "A" | "B", confidence: number): string {
  return [
    `WINNER: ${winner}`,
    `CONFIDENCE: ${confidence}`,
    "",
    "CORRECTNESS:",
    "The selected candidate satisfies the acceptance criteria.",
    "",
    "SECURITY:",
    "No unsafe behavior was introduced.",
    "",
    "MAINTAINABILITY:",
    "The selected change is smaller and clearer.",
    "",
    "EVIDENCE:",
    "- parser.ts contains the required guard.",
    "- The test patch covers the failure mode.",
    "",
    "RATIONALE:",
    "The evidence supports this outcome.",
  ].join("\n");
}

function sdkSubmission(
  id: string,
  content: string,
  overrides: Partial<TaskSubmission> = {},
): TaskSubmission {
  return {
    id,
    taskId,
    content,
    status: "OPEN",
    assetId: null,
    transactionId: null,
    rejectReason: null,
    blinks: false,
    isHidden: false,
    referralId: null,
    createdBy: "reviewer",
    createdAt: "2026-09-26T17:30:00.000Z",
    rating: null,
    user: {} as TaskSubmission["user"],
    comments: [],
    media: [],
    asset: null,
    ...overrides,
  };
}

function syncedSubmission(id: string, content: string) {
  const parsed = parseReviewSubmission(content);
  return {
    id,
    taskId,
    content,
    status: "OPEN" as const,
    createdAt: "2026-09-26T17:30:00.000Z",
    rating: null,
    media: [],
    verdict: parsed.verdict,
    parseError: parsed.parseError,
  };
}
