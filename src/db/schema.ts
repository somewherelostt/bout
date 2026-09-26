import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const battles = sqliteTable(
  "battles",
  {
    id: text("id").primaryKey(),
    schemaVersion: integer("schema_version").notNull(),
    createdAt: text("created_at").notNull(),
    title: text("title").notNull(),
    repository: text("repository").notNull(),
    taskPath: text("task_path").notNull(),
    verificationCommand: text("verification_command"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("battles_created_at_idx").on(table.createdAt)],
);

export const candidates = sqliteTable(
  "candidates",
  {
    battleId: text("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    label: text("label").$type<"A" | "B">().notNull(),
    artifactPath: text("artifact_path").notNull(),
    sha256: text("sha256").notNull(),
    additions: integer("additions").notNull(),
    deletions: integer("deletions").notNull(),
    files: integer("files").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.battleId, table.label] }),
    index("candidates_sha256_idx").on(table.sha256),
  ],
);

export const bountyDrafts = sqliteTable("bounty_drafts", {
  battleId: text("battle_id")
    .primaryKey()
    .references(() => battles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  poolMicros: integer("pool_micros").notNull(),
  minimumPayoutMicros: integer("minimum_payout_micros").notNull(),
  deadline: text("deadline"),
  verifiedReviewersOnly: integer("verified_reviewers_only", { mode: "boolean" }).notNull(),
  draftPath: text("draft_path").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const publications = sqliteTable(
  "publications",
  {
    battleId: text("battle_id")
      .primaryKey()
      .references(() => battles.id, { onDelete: "cascade" }),
    environment: text("environment").notNull(),
    taskId: text("task_id").notNull(),
    intentId: text("intent_id").notNull(),
    transactionHash: text("transaction_hash").notNull(),
    publishedAt: text("published_at").notNull(),
    receiptPath: text("receipt_path").notNull(),
  },
  (table) => [uniqueIndex("publications_task_id_uq").on(table.taskId)],
);

export const verdicts = sqliteTable("verdicts", {
  battleId: text("battle_id")
    .primaryKey()
    .references(() => battles.id, { onDelete: "cascade" }),
  winner: text("winner").$type<"A" | "B" | "TIE" | "BOTH_FAILED">().notNull(),
  confidence: integer("confidence").$type<1 | 2 | 3 | 4 | 5>().notNull(),
  correctness: text("correctness").notNull(),
  security: text("security").notNull(),
  maintainability: text("maintainability").notNull(),
  evidence: text("evidence", { mode: "json" }).$type<string[]>().notNull(),
  rationale: text("rationale").notNull(),
  submittedAt: text("submitted_at").notNull(),
  verdictPath: text("verdict_path").notNull(),
});

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    battleId: text("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    visibility: text("visibility").$type<"review" | "private">().notNull(),
    relativePath: text("relative_path").notNull(),
    sha256: text("sha256").notNull(),
    bytes: integer("bytes").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("artifacts_battle_kind_uq").on(table.battleId, table.kind),
    index("artifacts_sha256_idx").on(table.sha256),
  ],
);

export const workflowEvents = sqliteTable(
  "workflow_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventKey: text("event_key").notNull(),
    battleId: text("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    occurredAt: text("occurred_at").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex("workflow_events_event_key_uq").on(table.eventKey),
    index("workflow_events_battle_time_idx").on(table.battleId, table.occurredAt),
  ],
);
