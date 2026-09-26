import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { ZodType } from "zod";
import { sha256 } from "../core/hash.js";
import { reviewManifestSchema, verdictRecordSchema, type VerdictRecord } from "../core/schemas.js";
import {
  bountyDraftSchema,
  decimalToMicros,
  finalReportSchema,
  publicationRecordSchema,
  submissionSyncSchema,
} from "../marketplace/schemas.js";
import { applyMigrations } from "./migrations.js";
import {
  artifacts,
  battles,
  bountyDrafts,
  candidates,
  publications,
  reports,
  submissionSyncs,
  verdicts,
  workflowEvents,
} from "./schema.js";

export interface IndexedCandidate {
  label: "A" | "B";
  artifactPath: string;
  sha256: string;
  additions: number;
  deletions: number;
  files: number;
}

export interface IndexedBattle {
  id: string;
  createdAt: string;
  title: string;
  repository: string;
  taskPath: string;
  verificationCommand: string | null;
  candidateA: IndexedCandidate;
  candidateB: IndexedCandidate;
  rewardMicros: number;
  minimumPayoutMicros: number;
  deadline: string | null;
  verdict: VerdictRecord | null;
  publicationTaskId: string | null;
  hasBountyDraft: boolean;
  hasPublicationReceipt: boolean;
  submissionCount: number;
  validReviewCount: number;
  report: IndexedReport | null;
}

export interface IndexedReport {
  outcome: "A" | "B" | "TIE" | "BOTH_FAILED" | "NO_CONSENSUS";
  validReviewCount: number;
  averageConfidence: number | null;
  resolvedLabel: "A" | "B" | null;
  generatedAt: string;
}

export interface ReconciliationResult {
  imported: number;
  removed: number;
  skipped: Array<{ battleId: string; reason: string }>;
}

interface OpenDatabase {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle>;
}

interface ArtifactDefinition {
  kind: string;
  visibility: "review" | "private";
  relativePath: string;
}

interface IndexedArtifact extends ArtifactDefinition {
  sha256: string;
  bytes: number;
}

export function getBoutDatabasePath(workspace: string): string {
  return path.resolve(workspace, ".bout", "bout.sqlite");
}

export function getBoutArtifactRoot(workspace: string): string {
  return path.resolve(workspace, ".bout", "battles");
}

export async function syncBattleToDatabase(workspace: string, battleId: string): Promise<void> {
  const battleDirectory = path.resolve(workspace, ".bout", "battles", battleId);
  const reviewDirectory = path.join(battleDirectory, "review");
  const [
    manifest,
    taskBuffer,
    candidateABuffer,
    candidateBBuffer,
    draft,
    publication,
    verdict,
    submissionSync,
    report,
  ] =
    await Promise.all([
      readJson(path.join(reviewDirectory, "manifest.json"), reviewManifestSchema),
      readFile(path.join(reviewDirectory, "task.md")),
      readFile(path.join(reviewDirectory, "candidate-a.patch")),
      readFile(path.join(reviewDirectory, "candidate-b.patch")),
      readOptionalJson(path.join(reviewDirectory, "bounty-draft.json"), bountyDraftSchema),
      readOptionalJson(
        path.join(battleDirectory, "private", "publication.json"),
        publicationRecordSchema,
      ),
      readOptionalJson(path.join(reviewDirectory, "verdict.json"), verdictRecordSchema),
      readOptionalJson(
        path.join(battleDirectory, "private", "submissions.json"),
        submissionSyncSchema,
      ),
      readOptionalJson(
        path.join(battleDirectory, "private", "report.json"),
        finalReportSchema,
      ),
    ]);

  if (manifest.battleId !== battleId) {
    throw new Error(`Battle directory ${battleId} does not match manifest ${manifest.battleId}.`);
  }
  if (submissionSync && publication?.taskId !== submissionSync.taskId) {
    throw new Error("Synced submissions do not match the published Gibwork task.");
  }
  if (report && (report.taskId !== submissionSync?.taskId || report.battleId !== battleId)) {
    throw new Error("The final report does not match this battle and submission sync.");
  }

  const task = taskBuffer.toString("utf8");
  const updatedAt = new Date().toISOString();
  const artifactDefinitions = createArtifactDefinitions(battleId);
  const indexedArtifacts = (
    await Promise.all(
      artifactDefinitions.map(async (definition): Promise<IndexedArtifact | null> => {
        const content = await readOptionalBuffer(path.resolve(workspace, definition.relativePath));
        return content
          ? { ...definition, sha256: sha256(content), bytes: content.byteLength }
          : null;
      }),
    )
  ).filter((artifact): artifact is IndexedArtifact => artifact !== null);

  const candidateA = buildCandidate(
    "A",
    artifactPath(battleId, "review/candidate-a.patch"),
    candidateABuffer.toString("utf8"),
    manifest.candidates[0].sha256,
  );
  const candidateB = buildCandidate(
    "B",
    artifactPath(battleId, "review/candidate-b.patch"),
    candidateBBuffer.toString("utf8"),
    manifest.candidates[1].sha256,
  );
  const title = (draft?.task.title ?? extractTitle(task)).replace(/^Blind code review:\s*/iu, "");
  const repository = extractRepository(task);
  const opened = await openDatabase(workspace);

  try {
    opened.db.transaction((transaction) => {
      transaction
        .insert(battles)
        .values({
          id: battleId,
          schemaVersion: manifest.schemaVersion,
          createdAt: manifest.createdAt,
          title,
          repository,
          taskPath: artifactPath(battleId, "review/task.md"),
          verificationCommand: manifest.verification.command,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: battles.id,
          set: {
            schemaVersion: manifest.schemaVersion,
            createdAt: manifest.createdAt,
            title,
            repository,
            taskPath: artifactPath(battleId, "review/task.md"),
            verificationCommand: manifest.verification.command,
            updatedAt,
          },
        })
        .run();

      for (const candidate of [candidateA, candidateB]) {
        transaction
          .insert(candidates)
          .values({ battleId, ...candidate })
          .onConflictDoUpdate({
            target: [candidates.battleId, candidates.label],
            set: {
              artifactPath: candidate.artifactPath,
              sha256: candidate.sha256,
              additions: candidate.additions,
              deletions: candidate.deletions,
              files: candidate.files,
            },
          })
          .run();
      }

      transaction.delete(artifacts).where(eq(artifacts.battleId, battleId)).run();
      if (indexedArtifacts.length > 0) {
        transaction
          .insert(artifacts)
          .values(indexedArtifacts.map((artifact) => ({ battleId, ...artifact, updatedAt })))
          .run();
      }

      if (draft) {
        transaction
          .insert(bountyDrafts)
          .values({
            battleId,
            title: draft.task.title,
            poolMicros: safeMicros(draft.task.payment.amount),
            minimumPayoutMicros: safeMicros(draft.task.minSubmissionAmount),
            deadline: draft.task.deadline,
            verifiedReviewersOnly: draft.task.allowOnlyVerifiedSubmissions,
            draftPath: artifactPath(battleId, "review/bounty-draft.json"),
            updatedAt,
          })
          .onConflictDoUpdate({
            target: bountyDrafts.battleId,
            set: {
              title: draft.task.title,
              poolMicros: safeMicros(draft.task.payment.amount),
              minimumPayoutMicros: safeMicros(draft.task.minSubmissionAmount),
              deadline: draft.task.deadline,
              verifiedReviewersOnly: draft.task.allowOnlyVerifiedSubmissions,
              draftPath: artifactPath(battleId, "review/bounty-draft.json"),
              updatedAt,
            },
          })
          .run();
      } else {
        transaction.delete(bountyDrafts).where(eq(bountyDrafts.battleId, battleId)).run();
      }

      if (publication) {
        transaction
          .insert(publications)
          .values({
            battleId,
            environment: publication.environment,
            taskId: publication.taskId,
            intentId: publication.intentId,
            transactionHash: publication.txHash,
            publishedAt: publication.publishedAt,
            receiptPath: artifactPath(battleId, "private/publication.json"),
          })
          .onConflictDoUpdate({
            target: publications.battleId,
            set: {
              environment: publication.environment,
              taskId: publication.taskId,
              intentId: publication.intentId,
              transactionHash: publication.txHash,
              publishedAt: publication.publishedAt,
              receiptPath: artifactPath(battleId, "private/publication.json"),
            },
          })
          .run();
      } else {
        transaction.delete(publications).where(eq(publications.battleId, battleId)).run();
      }

      if (verdict) {
        transaction
          .insert(verdicts)
          .values({
            battleId,
            winner: verdict.winner,
            confidence: verdict.confidence,
            correctness: verdict.correctness,
            security: verdict.security,
            maintainability: verdict.maintainability,
            evidence: verdict.evidence,
            rationale: verdict.rationale,
            submittedAt: verdict.submittedAt,
            verdictPath: artifactPath(battleId, "review/verdict.json"),
          })
          .onConflictDoUpdate({
            target: verdicts.battleId,
            set: {
              winner: verdict.winner,
              confidence: verdict.confidence,
              correctness: verdict.correctness,
              security: verdict.security,
              maintainability: verdict.maintainability,
              evidence: verdict.evidence,
              rationale: verdict.rationale,
              submittedAt: verdict.submittedAt,
              verdictPath: artifactPath(battleId, "review/verdict.json"),
            },
          })
          .run();
      } else {
        transaction.delete(verdicts).where(eq(verdicts.battleId, battleId)).run();
      }

      if (submissionSync) {
        const validReviewCount = submissionSync.submissions.filter(
          (submission) => submission.status !== "REJECTED" && submission.verdict !== null,
        ).length;
        transaction
          .insert(submissionSyncs)
          .values({
            battleId,
            taskId: submissionSync.taskId,
            syncedAt: submissionSync.syncedAt,
            submissionCount: submissionSync.submissions.length,
            validReviewCount,
            submissionsPath: artifactPath(battleId, "private/submissions.json"),
          })
          .onConflictDoUpdate({
            target: submissionSyncs.battleId,
            set: {
              taskId: submissionSync.taskId,
              syncedAt: submissionSync.syncedAt,
              submissionCount: submissionSync.submissions.length,
              validReviewCount,
              submissionsPath: artifactPath(battleId, "private/submissions.json"),
            },
          })
          .run();
      } else {
        transaction.delete(submissionSyncs).where(eq(submissionSyncs.battleId, battleId)).run();
      }

      if (report) {
        transaction
          .insert(reports)
          .values({
            battleId,
            outcome: report.aggregate.outcome,
            validReviewCount: report.aggregate.validReviews,
            averageConfidenceMilli: report.aggregate.averageConfidence === null
              ? null
              : Math.round(report.aggregate.averageConfidence * 1_000),
            resolvedLabel: report.resolvedWinner?.assignedLabel ?? null,
            generatedAt: report.generatedAt,
            jsonPath: artifactPath(battleId, "private/report.json"),
            markdownPath: artifactPath(battleId, "private/report.md"),
          })
          .onConflictDoUpdate({
            target: reports.battleId,
            set: {
              outcome: report.aggregate.outcome,
              validReviewCount: report.aggregate.validReviews,
              averageConfidenceMilli: report.aggregate.averageConfidence === null
                ? null
                : Math.round(report.aggregate.averageConfidence * 1_000),
              resolvedLabel: report.resolvedWinner?.assignedLabel ?? null,
              generatedAt: report.generatedAt,
              jsonPath: artifactPath(battleId, "private/report.json"),
              markdownPath: artifactPath(battleId, "private/report.md"),
            },
          })
          .run();
      } else {
        transaction.delete(reports).where(eq(reports.battleId, battleId)).run();
      }

      insertWorkflowEvent(transaction, {
        eventKey: `${battleId}:created`,
        battleId,
        eventType: "battle.created",
        occurredAt: manifest.createdAt,
        payload: { candidateAHash: candidateA.sha256, candidateBHash: candidateB.sha256 },
      });

      if (draft) {
        insertWorkflowEvent(transaction, {
          eventKey: `${battleId}:prepared:${artifactHash(indexedArtifacts, "bounty_draft")}`,
          battleId,
          eventType: "bounty.prepared",
          occurredAt: updatedAt,
          payload: {
            poolMicros: safeMicros(draft.task.payment.amount),
            minimumPayoutMicros: safeMicros(draft.task.minSubmissionAmount),
          },
        });
      }
      if (publication) {
        insertWorkflowEvent(transaction, {
          eventKey: `${battleId}:published:${publication.taskId}`,
          battleId,
          eventType: "bounty.published",
          occurredAt: publication.publishedAt,
          payload: { taskId: publication.taskId, transactionHash: publication.txHash },
        });
      }
      if (verdict) {
        insertWorkflowEvent(transaction, {
          eventKey: `${battleId}:verdict:${verdict.submittedAt}`,
          battleId,
          eventType: "verdict.saved",
          occurredAt: verdict.submittedAt,
          payload: { winner: verdict.winner, confidence: verdict.confidence },
        });
      }
      if (submissionSync) {
        insertWorkflowEvent(transaction, {
          eventKey: `${battleId}:submissions:${submissionSync.syncedAt}`,
          battleId,
          eventType: "submissions.synced",
          occurredAt: submissionSync.syncedAt,
          payload: {
            taskId: submissionSync.taskId,
            submissionCount: submissionSync.submissions.length,
          },
        });
      }
      if (report) {
        insertWorkflowEvent(transaction, {
          eventKey: `${battleId}:report:${report.generatedAt}`,
          battleId,
          eventType: "report.generated",
          occurredAt: report.generatedAt,
          payload: {
            outcome: report.aggregate.outcome,
            validReviews: report.aggregate.validReviews,
          },
        });
      }
    });
  } finally {
    opened.sqlite.close();
  }
}

export async function reconcileWorkspaceDatabase(workspace: string): Promise<ReconciliationResult> {
  const opened = await openDatabase(workspace);
  opened.sqlite.close();

  const battleRoot = getBoutArtifactRoot(workspace);
  let battleIds: string[] = [];
  try {
    battleIds = (await readdir(battleRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".creating-"))
      .map((entry) => entry.name);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  const skipped: ReconciliationResult["skipped"] = [];
  const successfullyIndexed = new Set<string>();
  let imported = 0;
  for (const battleId of battleIds) {
    try {
      await syncBattleToDatabase(workspace, battleId);
      imported += 1;
      successfullyIndexed.add(battleId);
    } catch (error) {
      skipped.push({
        battleId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const cleanup = await openDatabase(workspace);
  let removed = 0;
  try {
    const indexedIds = cleanup.db.select({ id: battles.id }).from(battles).all();
    cleanup.db.transaction((transaction) => {
      for (const row of indexedIds) {
        if (!successfullyIndexed.has(row.id)) {
          transaction.delete(battles).where(eq(battles.id, row.id)).run();
          removed += 1;
        }
      }
    });
  } finally {
    cleanup.sqlite.close();
  }

  return { imported, removed, skipped };
}

export async function listIndexedBattles(workspace: string): Promise<IndexedBattle[]> {
  const opened = await openDatabase(workspace);
  try {
    const battleRows = opened.db.select().from(battles).orderBy(desc(battles.createdAt)).all();
    const candidateRows = opened.db.select().from(candidates).all();
    const draftRows = opened.db.select().from(bountyDrafts).all();
    const publicationRows = opened.db.select().from(publications).all();
    const verdictRows = opened.db.select().from(verdicts).all();
    const submissionSyncRows = opened.db.select().from(submissionSyncs).all();
    const reportRows = opened.db.select().from(reports).all();

    const candidateMap = new Map(
      candidateRows.map((candidate) => [`${candidate.battleId}:${candidate.label}`, candidate]),
    );
    const draftMap = new Map(draftRows.map((draft) => [draft.battleId, draft]));
    const publicationMap = new Map(
      publicationRows.map((publication) => [publication.battleId, publication]),
    );
    const verdictMap = new Map(verdictRows.map((verdict) => [verdict.battleId, verdict]));
    const submissionSyncMap = new Map(
      submissionSyncRows.map((submissionSync) => [submissionSync.battleId, submissionSync]),
    );
    const reportMap = new Map(reportRows.map((report) => [report.battleId, report]));
    const indexed: IndexedBattle[] = [];

    for (const battle of battleRows) {
      const candidateA = candidateMap.get(`${battle.id}:A`);
      const candidateB = candidateMap.get(`${battle.id}:B`);
      if (!candidateA || !candidateB) continue;
      const draft = draftMap.get(battle.id);
      const publication = publicationMap.get(battle.id);
      const verdict = verdictMap.get(battle.id);
      const submissionSync = submissionSyncMap.get(battle.id);
      const report = reportMap.get(battle.id);

      indexed.push({
        id: battle.id,
        createdAt: battle.createdAt,
        title: battle.title,
        repository: battle.repository,
        taskPath: battle.taskPath,
        verificationCommand: battle.verificationCommand,
        candidateA: toIndexedCandidate(candidateA),
        candidateB: toIndexedCandidate(candidateB),
        rewardMicros: draft?.poolMicros ?? 0,
        minimumPayoutMicros: draft?.minimumPayoutMicros ?? 0,
        deadline: draft?.deadline ?? null,
        verdict: verdict
          ? verdictRecordSchema.parse({
              schemaVersion: 1,
              winner: verdict.winner,
              confidence: verdict.confidence,
              correctness: verdict.correctness,
              security: verdict.security,
              maintainability: verdict.maintainability,
              evidence: verdict.evidence,
              rationale: verdict.rationale,
              submittedAt: verdict.submittedAt,
            })
          : null,
        publicationTaskId: publication?.taskId ?? null,
        hasBountyDraft: draft !== undefined,
        hasPublicationReceipt: publication !== undefined,
        submissionCount: submissionSync?.submissionCount ?? 0,
        validReviewCount: submissionSync?.validReviewCount ?? 0,
        report: report
          ? {
              outcome: report.outcome,
              validReviewCount: report.validReviewCount,
              averageConfidence: report.averageConfidenceMilli === null
                ? null
                : report.averageConfidenceMilli / 1_000,
              resolvedLabel: report.resolvedLabel,
              generatedAt: report.generatedAt,
            }
          : null,
      });
    }

    return indexed;
  } finally {
    opened.sqlite.close();
  }
}

async function openDatabase(workspace: string): Promise<OpenDatabase> {
  const databasePath = getBoutDatabasePath(workspace);
  await mkdir(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  applyMigrations(sqlite);
  return { sqlite, db: drizzle(sqlite) };
}

function createArtifactDefinitions(battleId: string): ArtifactDefinition[] {
  return [
    { kind: "task", visibility: "review", relativePath: artifactPath(battleId, "review/task.md") },
    {
      kind: "candidate_a",
      visibility: "review",
      relativePath: artifactPath(battleId, "review/candidate-a.patch"),
    },
    {
      kind: "candidate_b",
      visibility: "review",
      relativePath: artifactPath(battleId, "review/candidate-b.patch"),
    },
    {
      kind: "manifest",
      visibility: "review",
      relativePath: artifactPath(battleId, "review/manifest.json"),
    },
    {
      kind: "bounty_draft",
      visibility: "review",
      relativePath: artifactPath(battleId, "review/bounty-draft.json"),
    },
    {
      kind: "verdict",
      visibility: "review",
      relativePath: artifactPath(battleId, "review/verdict.json"),
    },
    {
      kind: "identity_map",
      visibility: "private",
      relativePath: artifactPath(battleId, "private/identity-map.json"),
    },
    {
      kind: "publication_receipt",
      visibility: "private",
      relativePath: artifactPath(battleId, "private/publication.json"),
    },
    {
      kind: "submissions",
      visibility: "private",
      relativePath: artifactPath(battleId, "private/submissions.json"),
    },
    {
      kind: "final_report_json",
      visibility: "private",
      relativePath: artifactPath(battleId, "private/report.json"),
    },
    {
      kind: "final_report_markdown",
      visibility: "private",
      relativePath: artifactPath(battleId, "private/report.md"),
    },
  ];
}

function buildCandidate(
  label: "A" | "B",
  relativePath: string,
  content: string,
  expectedHash: string,
): IndexedCandidate {
  const actualHash = sha256(content);
  if (actualHash !== expectedHash) {
    throw new Error(`Candidate ${label} no longer matches its manifest hash.`);
  }
  const lines = content.split(/\r?\n/u);
  return {
    label,
    artifactPath: relativePath,
    sha256: actualHash,
    additions: lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length,
    deletions: lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length,
    files: Math.max(1, lines.filter((line) => line.startsWith("diff --git ")).length),
  };
}

function toIndexedCandidate(candidate: typeof candidates.$inferSelect): IndexedCandidate {
  return {
    label: candidate.label,
    artifactPath: candidate.artifactPath,
    sha256: candidate.sha256,
    additions: candidate.additions,
    deletions: candidate.deletions,
    files: candidate.files,
  };
}

function insertWorkflowEvent(
  transaction: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
  event: typeof workflowEvents.$inferInsert,
): void {
  transaction.insert(workflowEvents).values(event).onConflictDoNothing().run();
}

function artifactPath(battleId: string, suffix: string): string {
  return [".bout", "battles", battleId, ...suffix.split("/")].join("/");
}

function artifactHash(indexedArtifacts: IndexedArtifact[], kind: string): string {
  return indexedArtifacts.find((artifact) => artifact.kind === kind)?.sha256 ?? "missing";
}

function extractRepository(task: string): string {
  const line = task.split(/\r?\n/u).find((value) => value.startsWith("Repository: "));
  return line?.slice("Repository: ".length).trim() || "Not recorded";
}

function extractTitle(task: string): string {
  const line = task
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find((value) => value.length > 0 && !value.startsWith("Repository: "));
  return line?.replace(/^#+\s*/u, "").trim() || "Untitled code review";
}

function safeMicros(value: string): number {
  const amount = Number(decimalToMicros(value));
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`Amount ${value} exceeds SQLite's safe JavaScript integer range.`);
  }
  return amount;
}

async function readJson<T>(filePath: string, schema: ZodType<T>): Promise<T> {
  return schema.parse(JSON.parse(await readFile(filePath, "utf8")));
}

async function readOptionalJson<T>(filePath: string, schema: ZodType<T>): Promise<T | null> {
  try {
    return await readJson(filePath, schema);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

async function readOptionalBuffer(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
