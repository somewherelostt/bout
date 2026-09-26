import { z } from "zod";

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
  publishedAt: z.iso.datetime(),
});

export type PublicationRecord = z.infer<typeof publicationRecordSchema>;

export function decimalToMicros(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}
