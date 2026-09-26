import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./hash.js";
import {
  identityMapSchema,
  reviewManifestSchema,
  type IdentityMap,
  type ReviewManifest,
} from "./schemas.js";

export interface CreateBattleInput {
  workspace: string;
  taskPath: string;
  firstCandidatePath: string;
  secondCandidatePath: string;
  verificationCommand?: string;
}

export interface CreateBattleDependencies {
  now?: () => Date;
  idFactory?: () => string;
  shouldSwap?: () => boolean;
}

export interface CreatedBattle {
  battleId: string;
  battleDirectory: string;
  reviewDirectory: string;
  manifest: ReviewManifest;
}

interface LoadedInput {
  absolutePath: string;
  content: Buffer;
  sha256: string;
}

export async function createBattle(
  input: CreateBattleInput,
  dependencies: CreateBattleDependencies = {},
): Promise<CreatedBattle> {
  const now = dependencies.now ?? (() => new Date());
  const idFactory = dependencies.idFactory ?? randomUUID;
  const shouldSwap = dependencies.shouldSwap ?? (() => randomInt(2) === 1);

  const [task, firstCandidate, secondCandidate] = await Promise.all([
    loadInput(input.taskPath, "task"),
    loadInput(input.firstCandidatePath, "first candidate"),
    loadInput(input.secondCandidatePath, "second candidate"),
  ]);

  if (firstCandidate.sha256 === secondCandidate.sha256) {
    throw new Error("Candidate inputs are identical; a blind comparison requires two different changes.");
  }

  const battleId = idFactory();
  const createdAt = now().toISOString();
  const rootDirectory = path.resolve(input.workspace, ".bout", "battles");
  const battleDirectory = path.join(rootDirectory, battleId);
  const temporaryDirectory = path.join(rootDirectory, `.creating-${battleId}`);
  const reviewDirectory = path.join(temporaryDirectory, "review");
  const privateDirectory = path.join(temporaryDirectory, "private");

  const sourceCandidates = shouldSwap()
    ? [
        { sourceSlot: "source-1" as const, loaded: firstCandidate, assignedLabel: "B" as const },
        { sourceSlot: "source-2" as const, loaded: secondCandidate, assignedLabel: "A" as const },
      ]
    : [
        { sourceSlot: "source-1" as const, loaded: firstCandidate, assignedLabel: "A" as const },
        { sourceSlot: "source-2" as const, loaded: secondCandidate, assignedLabel: "B" as const },
      ];

  const byLabel = [...sourceCandidates].sort((left, right) =>
    left.assignedLabel.localeCompare(right.assignedLabel),
  );

  const reviewManifest: ReviewManifest = reviewManifestSchema.parse({
    schemaVersion: 1,
    battleId,
    createdAt,
    task: {
      file: "task.md",
      sha256: task.sha256,
    },
    candidates: byLabel.map((candidate) => ({
      label: candidate.assignedLabel,
      file: `candidate-${candidate.assignedLabel.toLowerCase()}.patch`,
      sha256: candidate.loaded.sha256,
    })),
    verification: {
      command: input.verificationCommand?.trim() || null,
      status: "not_run",
    },
  });

  const identityMap: IdentityMap = identityMapSchema.parse({
    schemaVersion: 1,
    battleId,
    candidates: sourceCandidates.map((candidate) => ({
      sourceSlot: candidate.sourceSlot,
      sourcePath: candidate.loaded.absolutePath,
      assignedLabel: candidate.assignedLabel,
      sha256: candidate.loaded.sha256,
    })),
  });

  await mkdir(rootDirectory, { recursive: true });
  await rm(temporaryDirectory, { recursive: true, force: true });

  try {
    await Promise.all([
      mkdir(reviewDirectory, { recursive: true }),
      mkdir(privateDirectory, { recursive: true }),
    ]);

    await Promise.all([
      writeFile(path.join(reviewDirectory, "task.md"), task.content),
      ...byLabel.map((candidate) =>
        writeFile(
          path.join(reviewDirectory, `candidate-${candidate.assignedLabel.toLowerCase()}.patch`),
          candidate.loaded.content,
        ),
      ),
      writeJson(path.join(reviewDirectory, "manifest.json"), reviewManifest),
      writeJson(path.join(privateDirectory, "identity-map.json"), identityMap),
    ]);

    await rename(temporaryDirectory, battleDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    battleId,
    battleDirectory,
    reviewDirectory: path.join(battleDirectory, "review"),
    manifest: reviewManifest,
  };
}

async function loadInput(inputPath: string, label: string): Promise<LoadedInput> {
  const absolutePath = path.resolve(inputPath);

  let content: Buffer;
  try {
    content = await readFile(absolutePath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${label} at ${absolutePath}: ${reason}`);
  }

  if (content.length === 0) {
    throw new Error(`The ${label} file is empty: ${absolutePath}`);
  }

  return {
    absolutePath,
    content,
    sha256: sha256(content),
  };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
