import { z } from "zod";
import { verdictInputSchema } from "../core/schemas.js";

export const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const decimalAmountSchema = z
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

export const publicationRecordSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: z.uuid(),
  environment: z.literal("stage"),
  taskId: z.uuid(),
  intentId: z.uuid(),
  txHash: z.string().min(1),
  paymentQuote: z
    .object({
      symbol: z.string().min(1),
      mintAddress: z.string().min(1),
      fundingAmount: decimalAmountSchema,
      platformFeeAmount: z
        .string()
        .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/u, "expected a decimal with at most 6 places"),
      totalDebit: decimalAmountSchema,
    })
    .optional(),
  publishedAt: z.iso.datetime(),
});

export type PublicationRecord = z.infer<typeof publicationRecordSchema>;

export const submissionStatusSchema = z.enum([
  "OPEN",
  "REJECTED",
  "CLAIMING",
  "WAITING_CLAIM",
  "CLOSED",
  "CLAIMED",
  "PROCESSING",
]);

export const syncedSubmissionSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  content: z.string().min(1),
  status: submissionStatusSchema,
  createdAt: z.iso.datetime(),
  rating: z.number().finite().nullable(),
  media: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      mimeType: z.string().min(1),
      url: z.string().min(1),
    }),
  ),
  verdict: verdictInputSchema.nullable(),
  parseError: z.string().min(1).nullable(),
});

export const submissionSyncSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: z.uuid(),
  taskId: z.uuid(),
  syncedAt: z.iso.datetime(),
  submissions: z.array(syncedSubmissionSchema),
});

export type SyncedSubmission = z.infer<typeof syncedSubmissionSchema>;
export type SubmissionSync = z.infer<typeof submissionSyncSchema>;

export const aggregateOutcomeSchema = z.enum([
  "A",
  "B",
  "TIE",
  "BOTH_FAILED",
  "NO_CONSENSUS",
]);

export const reviewAggregateSchema = z.object({
  outcome: aggregateOutcomeSchema,
  validReviews: z.number().int().nonnegative(),
  invalidReviews: z.number().int().nonnegative(),
  excludedRejectedReviews: z.number().int().nonnegative(),
  averageConfidence: z.number().min(1).max(5).nullable(),
  votes: z.object({
    A: z.number().int().nonnegative(),
    B: z.number().int().nonnegative(),
    TIE: z.number().int().nonnegative(),
    BOTH_FAILED: z.number().int().nonnegative(),
  }),
});

export const finalReportSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: z.uuid(),
  taskId: z.uuid(),
  generatedAt: z.iso.datetime(),
  submissionsSyncedAt: z.iso.datetime(),
  candidates: z.object({
    A: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/u) }),
    B: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/u) }),
  }),
  aggregate: reviewAggregateSchema,
  resolvedWinner: z
    .object({
      sourceSlot: z.enum(["source-1", "source-2"]),
      sourcePath: z.string().min(1),
      assignedLabel: z.enum(["A", "B"]),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .nullable(),
  reviews: z.array(
    z.object({
      submissionId: z.string().min(1),
      status: submissionStatusSchema,
      verdict: verdictInputSchema,
    }),
  ),
});

export type ReviewAggregate = z.infer<typeof reviewAggregateSchema>;
export type FinalReport = z.infer<typeof finalReportSchema>;

export function decimalToMicros(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}
