import { z } from "zod";

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, "expected a SHA-256 digest");

export const candidateLabelSchema = z.enum(["A", "B"]);

export const publicCandidateSchema = z.object({
  label: candidateLabelSchema,
  file: z.string().min(1),
  sha256: sha256Schema,
});

export const reviewManifestSchema = z.object({
  schemaVersion: z.literal(1),
  battleId: z.uuid(),
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
  battleId: z.uuid(),
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
