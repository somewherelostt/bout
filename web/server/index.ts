import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGibworkClient } from "@gibwork/sdk/node";
import { z } from "zod";
import { createBattle } from "../../src/core/battle.js";
import { sha256 } from "../../src/core/hash.js";
import { verdictInputSchema } from "../../src/core/schemas.js";
import { saveVerdict } from "../../src/core/verdict.js";
import {
  listIndexedBattles,
  reconcileWorkspaceDatabase,
  type IndexedBattle,
} from "../../src/db/store.js";
import { prepareBountyDraft } from "../../src/marketplace/draft.js";
import {
  genericPublicError,
  publicStorageDescriptor,
  toPublicErrorMessage,
} from "./public-state.js";
import type {
  BoutRecord,
  LiveBounty,
  WorkspaceSnapshot,
} from "../src/types.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(serverDirectory, "../..");
const workspace = path.resolve(process.env.BOUT_WORKSPACE ?? repositoryRoot);
const port = Number(process.env.BOUT_WEB_API_PORT ?? 4174);

const createBoutSchema = z.object({
  task: z.string().trim().min(1).max(100_000),
  repository: z.string().trim().min(1).max(500),
  candidateOne: z.string().min(1).max(5_000_000),
  candidateTwo: z.string().min(1).max(5_000_000),
  verificationCommand: z.string().trim().max(1_000).optional(),
  poolAmount: z.number().positive().max(1_000_000),
  minimumPayout: z.number().positive().max(1_000_000),
  deadline: z.iso.datetime().optional(),
});

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/health") {
      return sendJson(response, 200, {
        ok: true,
        storage: publicStorageDescriptor,
      });
    }

    if (request.method === "GET" && request.url === "/api/workspace") {
      return sendJson(response, 200, await loadWorkspaceSnapshot());
    }

    if (request.method === "POST" && request.url === "/api/battles") {
      const input = createBoutSchema.parse(await readJsonBody(request));
      if (input.minimumPayout > input.poolAmount) {
        throw new Error("Minimum payout cannot exceed the bounty pool.");
      }

      const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "bout-web-"));
      try {
        const taskPath = path.join(temporaryDirectory, "task.md");
        const firstPath = path.join(temporaryDirectory, "candidate-one.patch");
        const secondPath = path.join(temporaryDirectory, "candidate-two.patch");
        const title = extractTitle(input.task);
        const taskDocument = [
          `# ${title}`,
          "",
          `Repository: ${input.repository}`,
          "",
          input.task,
          "",
        ].join("\n");

        await Promise.all([
          writeFile(taskPath, taskDocument, "utf8"),
          writeFile(firstPath, input.candidateOne, "utf8"),
          writeFile(secondPath, input.candidateTwo, "utf8"),
        ]);

        const created = await createBattle({
          workspace,
          taskPath,
          firstCandidatePath: firstPath,
          secondCandidatePath: secondPath,
          ...(input.verificationCommand
            ? { verificationCommand: input.verificationCommand }
            : {}),
        });

        await prepareBountyDraft({
          workspace,
          battleId: created.battleId,
          poolAmount: toDecimal(input.poolAmount),
          minimumPayout: toDecimal(input.minimumPayout),
          ...(input.deadline ? { deadline: input.deadline } : {}),
        });

        return sendJson(response, 201, { battleId: created.battleId });
      } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
      }
    }

    const verdictMatch = request.url?.match(/^\/api\/battles\/([^/]+)\/verdict$/u);
    if (request.method === "POST" && verdictMatch) {
      const battleId = z.uuid().parse(decodeURIComponent(verdictMatch[1]));
      const input = verdictInputSchema.parse(await readJsonBody(request));
      const record = await saveVerdict({
        workspace,
        battleId,
        verdict: input,
      });
      return sendJson(response, 200, record);
    }

    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = toPublicErrorMessage(error);
    if (message === genericPublicError) {
      process.stderr.write(
        `Request failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
    return sendJson(response, 400, { error: message });
  }
});

async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const indexedBattles = await listIndexedBattles(workspace);
  const battleRecords = (await Promise.all(indexedBattles.map(loadBattle))).filter(
    (battle): battle is BoutRecord => battle !== null,
  );

  const live = await loadLiveBounties();
  const stats = {
    total: battleRecords.length,
    prepared: battleRecords.filter((battle) => battle.hasBountyDraft).length,
    published: battleRecords.filter((battle) => battle.hasPublicationReceipt).length,
    reviewed: battleRecords.filter((battle) => battle.verdict !== null).length,
    synced: battleRecords.filter((battle) => battle.submissionCount > 0).length,
    reported: battleRecords.filter((battle) => battle.report !== null).length,
    totalPool: battleRecords.reduce((sum, battle) => sum + battle.reward, 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    battles: battleRecords,
    liveBounties: live.items,
    liveStatus: live.status,
    liveMessage: live.message,
    storage: publicStorageDescriptor,
    stats,
  };
}

async function loadBattle(indexed: IndexedBattle): Promise<BoutRecord | null> {
  try {
    const [task, candidateA, candidateB] = await Promise.all([
      readFile(path.resolve(workspace, indexed.taskPath), "utf8"),
      readFile(path.resolve(workspace, indexed.candidateA.artifactPath), "utf8"),
      readFile(path.resolve(workspace, indexed.candidateB.artifactPath), "utf8"),
    ]);
    if (sha256(candidateA) !== indexed.candidateA.sha256) {
      throw new Error(`Candidate A for ${indexed.id} does not match its indexed hash.`);
    }
    if (sha256(candidateB) !== indexed.candidateB.sha256) {
      throw new Error(`Candidate B for ${indexed.id} does not match its indexed hash.`);
    }
    const cleanTask = task
      .split(/\r?\n/u)
      .filter((line) => !line.startsWith("Repository: "))
      .join("\n")
      .trim();

    const status: BoutRecord["status"] = indexed.report || indexed.verdict
      ? "Complete"
      : indexed.hasSubmissionSync && indexed.submissionCount > 0
        ? "Synced"
      : indexed.hasPublicationReceipt
        ? "Published"
        : indexed.hasBountyDraft
          ? "Prepared"
          : "Draft";

    return {
      id: indexed.id,
      title: indexed.title,
      repo: indexed.repository,
      reward: indexed.rewardMicros / 1_000_000,
      minimumPayout: indexed.minimumPayoutMicros / 1_000_000,
      createdAt: indexed.createdAt,
      deadline: indexed.deadline,
      status,
      task: cleanTask,
      verificationCommand: indexed.verificationCommand,
      patchA: { content: candidateA, ...withoutPathAndLabel(indexed.candidateA) },
      patchB: { content: candidateB, ...withoutPathAndLabel(indexed.candidateB) },
      verdict: indexed.verdict,
      publicationTaskId: indexed.publicationTaskId,
      hasBountyDraft: indexed.hasBountyDraft,
      hasPublicationReceipt: indexed.hasPublicationReceipt,
      hasSubmissionSync: indexed.hasSubmissionSync,
      submissionsSyncedAt: indexed.submissionsSyncedAt,
      submissionCount: indexed.submissionCount,
      validReviewCount: indexed.validReviewCount,
      report: indexed.report,
    };
  } catch {
    return null;
  }
}

async function loadLiveBounties(): Promise<{
  items: LiveBounty[];
  status: WorkspaceSnapshot["liveStatus"];
  message: string;
}> {
  const configuredKey = process.env.SOLANA_PRIVATE_KEY?.trim();
  if (!configuredKey) {
    return {
      items: [],
      status: "unconfigured",
      message: "Connect a local wallet credential to load live Gibwork review bounties.",
    };
  }

  try {
    const privateKey = configuredKey.startsWith("[")
      ? z.array(z.number().int().min(0).max(255)).min(32).max(64).parse(JSON.parse(configuredKey))
      : configuredKey;
    const client = createGibworkClient({
      privateKey,
      production: process.env.GIBWORK_PRODUCTION === "true",
    });
    const page = await client.tasks.listAvailable({ page: 1, limit: 100 });
    const items = page.results
      .filter((task) => task.tags.some((tag) => tag.toLowerCase() === "code review"))
      .map((task) => ({
        id: task.id,
        title: task.title,
        tags: task.tags,
        reward: task.asset ? Number(task.asset.amount) / 10 ** task.asset.decimals : 0,
        symbol: task.asset?.symbol ?? "USDC",
        submissions: task.totalSubmissions,
        deadline: task.deadline,
        minSubmissionAmount: Number(task.minSubmissionAmount ?? 0),
      }));
    return {
      items,
      status: "connected",
      message: `${items.length} live code-review bounties loaded from Gibwork.`,
    };
  } catch (error) {
    process.stderr.write(
      `Gibwork discovery failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return {
      items: [],
      status: "error",
      message: "Bout could not reach Gibwork. Check the local server configuration and try again.",
    };
  }
}

function withoutPathAndLabel(candidate: IndexedBattle["candidateA"]): Omit<BoutRecord["patchA"], "content"> {
  return {
    sha256: candidate.sha256,
    additions: candidate.additions,
    deletions: candidate.deletions,
    files: candidate.files,
  };
}

function extractTitle(task: string): string {
  const line = task
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find((value) => value.length > 0 && !value.startsWith("Repository: "));
  return line?.replace(/^#+\s*/u, "").trim() || "Untitled code review";
}

function toDecimal(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/u, "");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 12_000_000) throw new Error("Request body exceeds 12 MB.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const payload = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  response.end(payload);
}

async function startServer(): Promise<void> {
  const reconciliation = await reconcileWorkspaceDatabase(workspace);
  if (reconciliation.skipped.length > 0) {
    for (const skipped of reconciliation.skipped) {
      process.stderr.write(`Skipped legacy battle ${skipped.battleId}: ${skipped.reason}\n`);
    }
  }

  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`Bout API listening on http://127.0.0.1:${port}\n`);
    process.stdout.write("Storage: local SQLite index + readable artifact bundles\n");
    process.stdout.write(`Indexed: ${reconciliation.imported} battle(s)\n`);
  });
}

void startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to initialize Bout storage: ${message}\n`);
  process.exitCode = 1;
});
