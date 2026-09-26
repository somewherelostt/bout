import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createBattle } from "../src/core/battle.js";
import { saveVerdict } from "../src/core/verdict.js";
import {
  getBoutDatabasePath,
  listIndexedBattles,
  reconcileWorkspaceDatabase,
} from "../src/db/store.js";

const temporaryDirectories: string[] = [];
const battleId = "55555555-5555-4555-8555-555555555555";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("SQLite workspace index", () => {
  it("indexes structured metadata while keeping patch bodies as files", async () => {
    const workspace = await createFixture();
    await createFixtureBattle(workspace);

    const indexed = await listIndexedBattles(workspace);
    expect(indexed).toHaveLength(1);
    expect(indexed[0]).toMatchObject({
      id: battleId,
      repository: "https://example.test/repository",
      verificationCommand: "npm test",
      hasBountyDraft: false,
    });
    expect(indexed[0]?.candidateA.additions).toBe(1);

    const sqlite = new Database(getBoutDatabasePath(workspace), { readonly: true });
    try {
      expect(
        sqlite.prepare("SELECT COUNT(*) AS count FROM artifacts WHERE battle_id = ?").get(battleId),
      ).toEqual({ count: 5 });
      expect(
        sqlite.prepare("SELECT COUNT(*) AS count FROM workflow_events WHERE battle_id = ?").get(battleId),
      ).toEqual({ count: 1 });
      expect(
        sqlite.prepare("SELECT COUNT(*) AS count FROM bout_migrations").get(),
      ).toEqual({ count: 2 });
    } finally {
      sqlite.close();
    }

    const databaseBytes = await readFile(getBoutDatabasePath(workspace));
    expect(databaseBytes.includes(Buffer.from("PATCH_BODY_ONLY_ALPHA"))).toBe(false);
  });

  it("rebuilds the index from legacy battle artifacts and persists verdict metadata", async () => {
    const workspace = await createFixture();
    await createFixtureBattle(workspace);
    await rm(getBoutDatabasePath(workspace));

    const reconciliation = await reconcileWorkspaceDatabase(workspace);
    expect(reconciliation).toMatchObject({ imported: 1, removed: 0, skipped: [] });

    await saveVerdict({
      workspace,
      battleId,
      verdict: {
        winner: "A",
        confidence: 4,
        correctness: "Candidate A satisfies the task.",
        security: "No new unsafe behavior observed.",
        maintainability: "The smaller change is easier to review.",
        evidence: ["Candidate A adds the required branch."],
        rationale: "A is the more focused implementation.",
      },
      now: () => new Date("2026-09-26T15:00:00.000Z"),
    });

    const indexed = await listIndexedBattles(workspace);
    expect(indexed[0]?.verdict).toMatchObject({ winner: "A", confidence: 4 });

    const sqlite = new Database(getBoutDatabasePath(workspace), { readonly: true });
    try {
      expect(
        sqlite.prepare("SELECT event_type FROM workflow_events ORDER BY id").all(),
      ).toEqual([{ event_type: "battle.created" }, { event_type: "verdict.saved" }]);
    } finally {
      sqlite.close();
    }
  });
});

async function createFixture(): Promise<string> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "bout-database-"));
  temporaryDirectories.push(workspace);
  await Promise.all([
    writeFile(
      path.join(workspace, "task.md"),
      "# Repair the parser\n\nRepository: https://example.test/repository\n",
    ),
    writeFile(
      path.join(workspace, "candidate-one.patch"),
      "diff --git a/parser.ts b/parser.ts\n+PATCH_BODY_ONLY_ALPHA\n",
    ),
    writeFile(
      path.join(workspace, "candidate-two.patch"),
      "diff --git a/parser.ts b/parser.ts\n+PATCH_BODY_ONLY_BETA\n",
    ),
  ]);
  return workspace;
}

async function createFixtureBattle(workspace: string): Promise<void> {
  await createBattle(
    {
      workspace,
      taskPath: path.join(workspace, "task.md"),
      firstCandidatePath: path.join(workspace, "candidate-one.patch"),
      secondCandidatePath: path.join(workspace, "candidate-two.patch"),
      verificationCommand: "npm test",
    },
    {
      idFactory: () => battleId,
      now: () => new Date("2026-09-26T12:00:00.000Z"),
      shouldSwap: () => false,
    },
  );
}
