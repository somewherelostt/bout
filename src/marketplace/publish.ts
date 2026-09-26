import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { CreateTaskInput, CreateTaskResult } from "@gibwork/sdk";
import { createGibworkClient } from "@gibwork/sdk/node";
import { z } from "zod";
import { readJson, writeJson } from "../core/json.js";
import { syncBattleToDatabase } from "../db/store.js";
import { toCreateTaskInput } from "./draft.js";
import { bountyDraftSchema, publicationRecordSchema } from "./schemas.js";

export interface TaskCreator {
  create(input: CreateTaskInput): Promise<CreateTaskResult>;
}

export interface PublishBountyInput {
  workspace: string;
  battleId: string;
  creator: TaskCreator;
}

export async function publishBounty(input: PublishBountyInput): Promise<{
  taskId: string;
  publicationPath: string;
  indexWarning?: string;
}> {
  const battleDirectory = path.resolve(input.workspace, ".bout", "battles", input.battleId);
  const draft = await readJson(
    path.join(battleDirectory, "review", "bounty-draft.json"),
    bountyDraftSchema,
  );

  const result = await input.creator.create(toCreateTaskInput(draft));
  const publication = publicationRecordSchema.parse({
    schemaVersion: 1,
    battleId: input.battleId,
    environment: "stage",
    taskId: result.taskId,
    intentId: result.intentId,
    txHash: result.txHash,
    publishedAt: new Date().toISOString(),
  });

  const privateDirectory = path.join(battleDirectory, "private");
  await mkdir(privateDirectory, { recursive: true });
  const publicationPath = path.join(privateDirectory, "publication.json");
  await writeJson(publicationPath, publication);
  let indexWarning: string | undefined;
  try {
    await syncBattleToDatabase(input.workspace, input.battleId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    indexWarning = `The bounty was published and its receipt was saved, but the SQLite index could not be refreshed: ${reason}`;
  }

  return {
    taskId: publication.taskId,
    publicationPath,
    ...(indexWarning ? { indexWarning } : {}),
  };
}

export async function createStageTaskCreator(keypairPath: string): Promise<TaskCreator> {
  const privateKey = await readPrivateKeyFile(keypairPath);
  const client = createGibworkClient({ privateKey, production: false });
  return {
    create: (input) => client.tasks.create(input),
  };
}

async function readPrivateKeyFile(keypairPath: string): Promise<string | readonly number[]> {
  const content = await readFile(path.resolve(keypairPath), "utf8");
  const trimmed = content.trim();

  if (trimmed.startsWith("[")) {
    return z.array(z.number().int().min(0).max(255)).min(32).max(64).parse(JSON.parse(trimmed));
  }

  if (trimmed.length === 0) {
    throw new Error("The configured keypair file is empty.");
  }

  return trimmed;
}
