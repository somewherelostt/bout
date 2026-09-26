import { z } from "zod";

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, "expected a SHA-256 digest");
export const battleIdSchema = z.uuid();

export const candidateLabelSchema = z.enum(["A", "B"]);

export const publicCandidateSchema = z.object({
  label: candidateLabelSchema,
  file: z.string().min(1),
  sha256: sha256Schema,
});

export const reviewManifestSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: battleIdSchema,
  createdAt: z.iso.datetime(),
  task: z.object({
    file: z.literal("task.md"),
    sha256: sha256Schema,
  }),
  candidates: z.tuple([publicCandidateSchema, publicCandidateSchema]),
  verification: z.object({
    command: z.string().min(1).nullable(),
    status: z.literal("not_run"),
  }),
});

export type ReviewManifest = z.infer<typeof reviewManifestSchema>;

export const identityMapSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: battleIdSchema,
  candidates: z.tuple([
    z.object({
      sourceSlot: z.literal("source-1"),
      sourcePath: z.string().min(1),
      assignedLabel: candidateLabelSchema,
      sha256: sha256Schema,
    }),
    z.object({
      sourceSlot: z.literal("source-2"),
      sourcePath: z.string().min(1),
      assignedLabel: candidateLabelSchema,
      sha256: sha256Schema,
    }),
  ]),
});

export type IdentityMap = z.infer<typeof identityMapSchema>;

export const verdictInputSchema = z.object({
  winner: z.enum(["A", "B", "TIE", "BOTH_FAILED"]),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  correctness: z.string().trim().min(1).max(20_000),
  security: z.string().trim().min(1).max(20_000),
  maintainability: z.string().trim().min(1).max(20_000),
  evidence: z.array(z.string().trim().min(1).max(2_000)).min(1).max(50),
  rationale: z.string().trim().min(1).max(20_000),
});

export const verdictRecordSchema = verdictInputSchema.extend({
  schemaVersion: z.literal(1),
  submittedAt: z.iso.datetime(),
});

export type VerdictInput = z.infer<typeof verdictInputSchema>;
export type VerdictRecord = z.infer<typeof verdictRecordSchema>;
