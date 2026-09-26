import type Database from "better-sqlite3";

interface Migration {
  id: string;
  sql: string;
}

const migrations: readonly Migration[] = [
  {
    id: "0001_hybrid_persistence",
    sql: `
      CREATE TABLE IF NOT EXISTS battles (
        id TEXT PRIMARY KEY NOT NULL,
        schema_version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        title TEXT NOT NULL,
        repository TEXT NOT NULL,
        task_path TEXT NOT NULL,
        verification_command TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS battles_created_at_idx ON battles(created_at);

      CREATE TABLE IF NOT EXISTS candidates (
        battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        label TEXT NOT NULL CHECK(label IN ('A', 'B')),
        artifact_path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        additions INTEGER NOT NULL,
        deletions INTEGER NOT NULL,
        files INTEGER NOT NULL,
        PRIMARY KEY (battle_id, label)
      );
      CREATE INDEX IF NOT EXISTS candidates_sha256_idx ON candidates(sha256);

      CREATE TABLE IF NOT EXISTS bounty_drafts (
        battle_id TEXT PRIMARY KEY NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        pool_micros INTEGER NOT NULL,
        minimum_payout_micros INTEGER NOT NULL,
        deadline TEXT,
        verified_reviewers_only INTEGER NOT NULL,
        draft_path TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS publications (
        battle_id TEXT PRIMARY KEY NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        task_id TEXT NOT NULL,
        intent_id TEXT NOT NULL,
        transaction_hash TEXT NOT NULL,
        published_at TEXT NOT NULL,
        receipt_path TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS publications_task_id_uq ON publications(task_id);

      CREATE TABLE IF NOT EXISTS verdicts (
        battle_id TEXT PRIMARY KEY NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        winner TEXT NOT NULL CHECK(winner IN ('A', 'B', 'TIE', 'BOTH_FAILED')),
        confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 5),
        correctness TEXT NOT NULL,
        security TEXT NOT NULL,
        maintainability TEXT NOT NULL,
        evidence TEXT NOT NULL,
        rationale TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        verdict_path TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        visibility TEXT NOT NULL CHECK(visibility IN ('review', 'private')),
        relative_path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS artifacts_battle_kind_uq ON artifacts(battle_id, kind);
      CREATE INDEX IF NOT EXISTS artifacts_sha256_idx ON artifacts(sha256);

      CREATE TABLE IF NOT EXISTS workflow_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        event_key TEXT NOT NULL,
        battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS workflow_events_event_key_uq ON workflow_events(event_key);
      CREATE INDEX IF NOT EXISTS workflow_events_battle_time_idx ON workflow_events(battle_id, occurred_at);
    `,
  },
];

export function applyMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS bout_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  for (const migration of migrations) {
    sqlite.transaction(() => {
      const applied = sqlite
        .prepare("SELECT 1 FROM bout_migrations WHERE id = ?")
        .get(migration.id);
      if (applied) return;
      sqlite.exec(migration.sql);
      sqlite
        .prepare("INSERT OR IGNORE INTO bout_migrations (id, applied_at) VALUES (?, ?)")
        .run(migration.id, new Date().toISOString());
    }).immediate();
  }
}
