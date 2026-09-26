import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CreateTaskInput } from "@gibwork/sdk";
import { z } from "zod";
import { readJson, writeJson } from "../core/json.js";
import { reviewManifestSchema } from "../core/schemas.js";

const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const decimalAmountSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/u, "expected a positive decimal with at most 6 places")
  .refine((value) => decimalToMicros(value) > 0n, "amount must be greater than zero");

export const bountyDraftSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: z.uuid(),
  environment: z.literal("stage"),
  task: z.object({
    title: z.string().min(1).max(160),
    content: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    payment: z.object({
      mintAddress: z.literal(USDC_MINT_ADDRESS),
      amount: decimalAmountSchema,
    }),
    minSubmissionAmount: decimalAmountSchema,
    deadline: z.iso.datetime().nullable(),
    allowOnlyVerifiedSubmissions: z.boolean(),
  }),
});

export type BountyDraft = z.infer<typeof bountyDraftSchema>;

export interface PrepareBountyDraftInput {
  workspace: string;
  battleId: string;
  poolAmount: string;
  minimumPayout: string;
  deadline?: string;
  verifiedReviewersOnly?: boolean;
}

export async function prepareBountyDraft(input: PrepareBountyDraftInput): Promise<{
  draft: BountyDraft;
  draftPath: string;
}> {
  const battleDirectory = path.resolve(input.workspace, ".review-harness", "battles", input.battleId);
  const reviewDirectory = path.join(battleDirectory, "review");

  const [manifest, task, candidateA, candidateB] = await Promise.all([
    readJson(path.join(reviewDirectory, "manifest.json"), reviewManifestSchema),
    readFile(path.join(reviewDirectory, "task.md"), "utf8"),
    readFile(path.join(reviewDirectory, "candidate-a.patch"), "utf8"),
    readFile(path.join(reviewDirectory, "candidate-b.patch"), "utf8"),
  ]);

  const poolAmount = decimalAmountSchema.parse(input.poolAmount);
  const minimumPayout = decimalAmountSchema.parse(input.minimumPayout);
  if (decimalToMicros(minimumPayout) > decimalToMicros(poolAmount)) {
    throw new Error("Minimum payout cannot exceed the total bounty pool.");
  }

  const deadline = input.deadline === undefined ? null : z.iso.datetime().parse(input.deadline);
  const title = extractTitle(task);
  const content = renderReviewContent({
    battleId: input.battleId,
    task,
    candidateA,
    candidateB,
    candidateAHash: manifest.candidates[0].sha256,
    candidateBHash: manifest.candidates[1].sha256,
    verificationCommand: manifest.verification.command,
  });

  const draft = bountyDraftSchema.parse({
    schemaVersion: 1,
    battleId: input.battleId,
    environment: "stage",
    task: {
      title: `Blind code review: ${title}`.slice(0, 160),
      content,
      tags: ["Development", "Code Review"],
      payment: {
        mintAddress: USDC_MINT_ADDRESS,
        amount: poolAmount,
      },
      minSubmissionAmount: minimumPayout,
      deadline,
      allowOnlyVerifiedSubmissions: input.verifiedReviewersOnly ?? true,
    },
  });

  const draftPath = path.join(reviewDirectory, "bounty-draft.json");
  await writeJson(draftPath, draft);
  return { draft, draftPath };
}

export function toCreateTaskInput(draft: BountyDraft): CreateTaskInput {
  return {
    title: draft.task.title,
    content: draft.task.content,
    tags: draft.task.tags,
    payment: draft.task.payment,
    minSubmissionAmount: draft.task.minSubmissionAmount,
    deadline: draft.task.deadline,
    allowOnlyVerifiedSubmissions: draft.task.allowOnlyVerifiedSubmissions,
  };
}

function renderReviewContent(input: {
  battleId: string;
  task: string;
  candidateA: string;
  candidateB: string;
  candidateAHash: string;
  candidateBHash: string;
  verificationCommand: string | null;
}): string {
  const verification = input.verificationCommand
    ? `<p><strong>Common verification command:</strong> <code>${escapeHtml(input.verificationCommand)}</code></p>`
    : "<p><strong>Common verification command:</strong> not provided</p>";

  return [
    `<h1>Blind code review</h1>`,
    `<p>Battle ID: <code>${escapeHtml(input.battleId)}</code></p>`,
    `<p>Compare both candidates against the same task. Do not infer or speculate about authorship.</p>`,
    verification,
    `<h2>Task and acceptance criteria</h2>`,
    `<pre>${escapeHtml(input.task)}</pre>`,
    `<h2>Candidate A</h2>`,
    `<p>SHA-256: <code>${input.candidateAHash}</code></p>`,
    `<pre>${escapeHtml(input.candidateA)}</pre>`,
    `<h2>Candidate B</h2>`,
    `<p>SHA-256: <code>${input.candidateBHash}</code></p>`,
    `<pre>${escapeHtml(input.candidateB)}</pre>`,
    `<h2>Required response format</h2>`,
    `<pre>WINNER: A | B | TIE | BOTH_FAILED\nCONFIDENCE: 1-5\n\nCORRECTNESS:\n...\n\nSECURITY:\n...\n\nMAINTAINABILITY:\n...\n\nEVIDENCE:\n- cite concrete files, lines, tests, or behavior\n\nRATIONALE:\n...</pre>`,
    `<p>Responses without concrete evidence may be rejected or returned for clarification.</p>`,
  ].join("\n");
}

function extractTitle(task: string): string {
  const firstMeaningfulLine = task
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const withoutHeading = firstMeaningfulLine?.replace(/^#+\s*/u, "").trim();
  return withoutHeading || "compare two candidate changes";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decimalToMicros(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}
