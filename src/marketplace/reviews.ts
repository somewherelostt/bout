import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type {
  Paginated,
  SubmissionPaginationQuery,
  TaskSubmission,
} from "@gibwork/sdk";
import { type ZodType } from "zod";
import {
  battleIdSchema,
  identityMapSchema,
  reviewManifestSchema,
  verdictInputSchema,
  type VerdictInput,
} from "../core/schemas.js";
import { readJson, writeJson, writeText } from "../core/json.js";
import { syncBattleToDatabase } from "../db/store.js";
import { createStageGibworkClient } from "./publish.js";
import {
  finalReportSchema,
  publicationRecordSchema,
  reviewAggregateSchema,
  submissionSyncSchema,
  type FinalReport,
  type ReviewAggregate,
  type SubmissionSync,
  type SyncedSubmission,
} from "./schemas.js";

export interface SubmissionLister {
  list(
    taskId: string,
    query?: SubmissionPaginationQuery,
  ): Promise<Pick<Paginated<TaskSubmission>, "results">>;
}

export async function createStageSubmissionLister(keypairPath: string): Promise<SubmissionLister> {
  const client = await createStageGibworkClient(keypairPath);
  return {
    list: (taskId, query) => client.submissions.list(taskId, query),
  };
}

export async function syncBountySubmissions(input: {
  workspace: string;
  battleId: string;
  lister: SubmissionLister;
  now?: () => Date;
}): Promise<{ record: SubmissionSync; submissionsPath: string }> {
  const battleId = battleIdSchema.parse(input.battleId);
  const battleDirectory = battlePath(input.workspace, battleId);
  const publication = await readRequiredJson(
    path.join(battleDirectory, "private", "publication.json"),
    publicationRecordSchema,
    "This battle has not been published. Publish it before synchronizing reviews.",
  );
  const page = await input.lister.list(publication.taskId, { pageAll: true });
  if (page.results.some((submission) => submission.taskId !== publication.taskId)) {
    throw new Error("Gibwork returned a submission for a different task; nothing was saved.");
  }
  const submissionIds = new Set(page.results.map((submission) => submission.id));
  if (submissionIds.size !== page.results.length) {
    throw new Error("Gibwork returned duplicate submission IDs; nothing was saved.");
  }
  const submissions = page.results
    .map(normalizeSubmission)
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  const record = submissionSyncSchema.parse({
    schemaVersion: 1,
    battleId,
    taskId: publication.taskId,
    syncedAt: (input.now ?? (() => new Date()))().toISOString(),
    submissions,
  });

  const privateDirectory = path.join(battleDirectory, "private");
  await mkdir(privateDirectory, { recursive: true });
  const submissionsPath = path.join(privateDirectory, "submissions.json");
  // report.json is the commit marker for the report pair. Remove it before the
  // synchronized input changes so an interrupted resync cannot expose a stale report.
  await rm(path.join(privateDirectory, "report.json"), { force: true });
  await syncBattleToDatabase(input.workspace, battleId);
  await writeJson(submissionsPath, record);
  await rm(path.join(privateDirectory, "report.md"), { force: true });
  await syncBattleToDatabase(input.workspace, battleId);
  return { record, submissionsPath };
}

export function parseReviewSubmission(content: string): {
  verdict: VerdictInput | null;
  parseError: string | null;
} {
  const plainText = htmlToPlainText(content);
  const winner = captureScalar(plainText, "WINNER")?.toUpperCase();
  const confidenceText = captureScalar(plainText, "CONFIDENCE");
  const correctness = captureSection(plainText, "CORRECTNESS");
  const security = captureSection(plainText, "SECURITY");
  const maintainability = captureSection(plainText, "MAINTAINABILITY");
  const evidenceText = captureSection(plainText, "EVIDENCE");
  const rationale = captureSection(plainText, "RATIONALE");
  const evidence = evidenceText
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/u, "").trim())
    .filter(Boolean);

  const result = verdictInputSchema.safeParse({
    winner,
    confidence: confidenceText ? Number(confidenceText.match(/\d+/u)?.[0]) : undefined,
    correctness,
    security,
    maintainability,
    evidence,
    rationale,
  });
  if (result.success) return { verdict: result.data, parseError: null };

  const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? "response")))];
  return {
    verdict: null,
    parseError: `Invalid structured review: check ${fields.join(", ")}.`,
  };
}

export function aggregateReviews(submissions: readonly SyncedSubmission[]): ReviewAggregate {
  const eligible = submissions.filter((submission) => submission.status !== "REJECTED");
  const valid = eligible.filter(
    (submission): submission is SyncedSubmission & { verdict: VerdictInput } =>
      submission.verdict !== null,
  );
  const votes = {
    A: valid.filter((submission) => submission.verdict.winner === "A").length,
    B: valid.filter((submission) => submission.verdict.winner === "B").length,
    TIE: valid.filter((submission) => submission.verdict.winner === "TIE").length,
    BOTH_FAILED: valid.filter((submission) => submission.verdict.winner === "BOTH_FAILED").length,
  };
  const maximum = Math.max(...Object.values(votes));
  const leaders = maximum === 0
    ? []
    : (Object.entries(votes) as Array<[keyof typeof votes, number]>)
      .filter(([, count]) => count === maximum)
      .map(([outcome]) => outcome);
  const averageConfidence = valid.length === 0
    ? null
    : valid.reduce((total, submission) => total + submission.verdict.confidence, 0) / valid.length;

  return reviewAggregateSchema.parse({
    outcome: leaders.length === 1 ? leaders[0] : "NO_CONSENSUS",
    validReviews: valid.length,
    invalidReviews: eligible.length - valid.length,
    excludedRejectedReviews: submissions.length - eligible.length,
    averageConfidence,
    votes,
  });
}

export async function generateFinalReport(input: {
  workspace: string;
  battleId: string;
  now?: () => Date;
}): Promise<{ report: FinalReport; jsonPath: string; markdownPath: string }> {
  const battleId = battleIdSchema.parse(input.battleId);
  const battleDirectory = battlePath(input.workspace, battleId);
  const [manifest, identityMap, sync] = await Promise.all([
    readRequiredJson(
      path.join(battleDirectory, "review", "manifest.json"),
      reviewManifestSchema,
      "The battle manifest is missing.",
    ),
    readRequiredJson(
      path.join(battleDirectory, "private", "identity-map.json"),
      identityMapSchema,
      "The private identity map is missing.",
    ),
    readRequiredJson(
      path.join(battleDirectory, "private", "submissions.json"),
      submissionSyncSchema,
      "No synchronized submissions were found. Run bout bounty sync first.",
    ),
  ]);
  const aggregate = aggregateReviews(sync.submissions);
  const resolvedWinner = aggregate.outcome === "A" || aggregate.outcome === "B"
    ? identityMap.candidates.find((candidate) => candidate.assignedLabel === aggregate.outcome) ?? null
    : null;
  const report = finalReportSchema.parse({
    schemaVersion: 2,
    generationId: randomUUID(),
    battleId,
    taskId: sync.taskId,
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
    submissionsSyncedAt: sync.syncedAt,
    candidates: {
      A: { sha256: manifest.candidates[0].sha256 },
      B: { sha256: manifest.candidates[1].sha256 },
    },
    aggregate,
    resolvedWinner,
    reviews: sync.submissions
      .filter(
        (submission): submission is SyncedSubmission & { verdict: VerdictInput } =>
          submission.status !== "REJECTED" && submission.verdict !== null,
      )
      .map((submission) => ({
        submissionId: submission.id,
        status: submission.status,
        verdict: submission.verdict,
      })),
  });

  const privateDirectory = path.join(battleDirectory, "private");
  await mkdir(privateDirectory, { recursive: true });
  const jsonPath = path.join(privateDirectory, "report.json");
  const markdownPath = path.join(privateDirectory, "report.md");
  // The JSON file commits a matching JSON/Markdown generation. Removing the old
  // marker first means a crash can leave an incomplete pair, never a trusted mixed pair.
  await rm(jsonPath, { force: true });
  await syncBattleToDatabase(input.workspace, battleId);
  await writeText(markdownPath, renderMarkdownReport(report));
  await writeJson(jsonPath, report);
  await syncBattleToDatabase(input.workspace, battleId);
  return { report, jsonPath, markdownPath };
}

function normalizeSubmission(submission: TaskSubmission): SyncedSubmission {
  const parsed = parseReviewSubmission(submission.content);
  return {
    id: submission.id,
    taskId: submission.taskId,
    content: submission.content,
    status: submission.status,
    createdAt: submission.createdAt,
    rating: submission.rating,
    media: submission.media.map((item) => ({
      id: item.id,
      type: item.type,
      mimeType: item.mimeType,
      url: item.url,
    })),
    verdict: parsed.verdict,
    parseError: parsed.parseError,
  };
}

function captureScalar(content: string, label: string): string | null {
  const match = content.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

function captureSection(content: string, label: string): string {
  const headings = "WINNER|CONFIDENCE|CORRECTNESS|SECURITY|MAINTAINABILITY|EVIDENCE|RATIONALE";
  const match = content.match(
    new RegExp(
      `(?:^|\\n)\\s*${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${headings})\\s*:|$)`,
      "iu",
    ),
  );
  return match?.[1]?.trim() ?? "";
}

function htmlToPlainText(content: string): string {
  return content
    .replace(/<\s*br\s*\/?>/giu, "\n")
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|pre)\s*>/giu, "\n")
    .replace(/<\s*li(?:\s[^>]*)?>/giu, "- ")
    .replace(/<[^>]+>/gu, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\r\n?/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function renderMarkdownReport(report: FinalReport): string {
  const resolved = report.resolvedWinner
    ? `${report.resolvedWinner.sourceSlot} (${report.resolvedWinner.assignedLabel})`
    : "No single source candidate resolved";
  const confidence = report.aggregate.averageConfidence === null
    ? "n/a"
    : report.aggregate.averageConfidence.toFixed(2);
  const reviewSections = report.reviews.length === 0
    ? "No valid structured reviews were available."
    : report.reviews.map((review, index) => [
      `### Review ${index + 1}`,
      "",
      `- Submission: \`${review.submissionId}\``,
      `- Outcome: **${review.verdict.winner}**`,
      `- Confidence: ${review.verdict.confidence}/5`,
      "",
      "**Correctness**",
      "",
      escapeMarkdown(review.verdict.correctness),
      "",
      "**Security**",
      "",
      escapeMarkdown(review.verdict.security),
      "",
      "**Maintainability**",
      "",
      escapeMarkdown(review.verdict.maintainability),
      "",
      "**Evidence**",
      "",
      ...review.verdict.evidence.map((item) => `- ${escapeMarkdown(item)}`),
      "",
      "**Rationale**",
      "",
      escapeMarkdown(review.verdict.rationale),
    ].join("\n")).join("\n\n");

  return [
    `<!-- bout-report-generation:${report.generationId} -->`,
    "",
    "# Bout final report",
    "",
    `- Battle: \`${report.battleId}\``,
    `- Gibwork task: \`${report.taskId}\``,
    `- Generated: ${report.generatedAt}`,
    `- Consensus: **${report.aggregate.outcome}**`,
    `- Resolved source: ${resolved}`,
    `- Average confidence: ${confidence}`,
    "",
    "## Candidate integrity",
    "",
    `- Candidate A SHA-256: \`${report.candidates.A.sha256}\``,
    `- Candidate B SHA-256: \`${report.candidates.B.sha256}\``,
    "",
    "## Vote tally",
    "",
    "| Outcome | Votes |",
    "| --- | ---: |",
    `| A | ${report.aggregate.votes.A} |`,
    `| B | ${report.aggregate.votes.B} |`,
    `| Tie | ${report.aggregate.votes.TIE} |`,
    `| Both failed | ${report.aggregate.votes.BOTH_FAILED} |`,
    "",
    `Valid reviews: ${report.aggregate.validReviews}. Invalid reviews: ${report.aggregate.invalidReviews}. Rejected reviews excluded: ${report.aggregate.excludedRejectedReviews}.`,
    "",
    "## Evidence-backed reviews",
    "",
    reviewSections,
    "",
  ].join("\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]{}()#+\-.!|>])/gu, "\\$1");
}

function battlePath(workspace: string, battleId: string): string {
  return path.resolve(workspace, ".bout", "battles", battleId);
}

async function readRequiredJson<T>(
  filePath: string,
  schema: ZodType<T>,
  missingMessage: string,
): Promise<T> {
  try {
    return await readJson(filePath, schema);
  } catch (error) {
    if (isMissingFile(error)) throw new Error(missingMessage);
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
