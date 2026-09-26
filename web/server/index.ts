import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGibworkClient } from "@gibwork/sdk/node";
import { z } from "zod";
import { createBattle } from "../../src/core/battle.js";
import { prepareBountyDraft } from "../../src/marketplace/draft.js";
import type {
  BoutRecord,
  LiveBounty,
  VerdictRecord,
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

const verdictInputSchema = z.object({
  winner: z.enum(["A", "B"]),
  rationale: z.string().trim().min(1).max(20_000),
});

const verdictRecordSchema = verdictInputSchema.extend({
  submittedAt: z.iso.datetime(),
});

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/health") {
      return sendJson(response, 200, { ok: true, workspace });
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
      const record = verdictRecordSchema.parse({
        ...input,
        submittedAt: new Date().toISOString(),
      });
      const verdictPath = path.resolve(workspace, ".bout", "battles", battleId, "review", "verdict.json");
      await writeFile(verdictPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      return sendJson(response, 200, record);
    }

    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return sendJson(response, 400, { error: message });
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Bout API listening on http://127.0.0.1:${port}\n`);
  process.stdout.write(`Workspace: ${workspace}\n`);
});

async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const battlesDirectory = path.resolve(workspace, ".bout", "battles");
  let directoryNames: string[] = [];
  try {
    directoryNames = (await readdir(battlesDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".creating-"))
      .map((entry) => entry.name);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  const battles = (await Promise.all(directoryNames.map(loadBattle))).filter(
    (battle): battle is BoutRecord => battle !== null,
  );
  battles.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const live = await loadLiveBounties();
  const stats = {
    total: battles.length,
    prepared: battles.filter((battle) => battle.status === "Prepared").length,
    published: battles.filter((battle) => battle.status === "Published").length,
    reviewed: battles.filter((battle) => battle.status === "Complete").length,
    totalPool: battles.reduce((sum, battle) => sum + battle.reward, 0),
  };

  return {
    battles,
    liveBounties: live.items,
    liveStatus: live.status,
    liveMessage: live.message,
    workspacePath: workspace,
    stats,
  };
}

async function loadBattle(battleId: string): Promise<BoutRecord | null> {
  const battleDirectory = path.resolve(workspace, ".bout", "battles", battleId);
  const reviewDirectory = path.join(battleDirectory, "review");
  try {
    const [manifest, task, candidateA, candidateB, draft, publication, verdict] = await Promise.all([
      readJsonFile<Record<string, unknown>>(path.join(reviewDirectory, "manifest.json")),
      readFile(path.join(reviewDirectory, "task.md"), "utf8"),
      readFile(path.join(reviewDirectory, "candidate-a.patch"), "utf8"),
      readFile(path.join(reviewDirectory, "candidate-b.patch"), "utf8"),
      readOptionalJson(path.join(reviewDirectory, "bounty-draft.json")),
      readOptionalJson(path.join(battleDirectory, "private", "publication.json")),
      readOptionalJson(path.join(reviewDirectory, "verdict.json")),
    ]);

    const typedManifest = manifest as {
      createdAt?: string;
      verification?: { command?: string | null };
      candidates?: Array<{ sha256?: string }>;
    };
    const typedDraft = draft as {
      task?: {
        title?: string;
        deadline?: string | null;
        payment?: { amount?: string };
        minSubmissionAmount?: string;
      };
    } | null;
    const typedPublication = publication as { taskId?: string } | null;
    const parsedVerdict = verdict ? verdictRecordSchema.safeParse(verdict) : null;
    const repoLine = task.split(/\r?\n/u).find((line) => line.startsWith("Repository: "));
    const cleanTask = task
      .split(/\r?\n/u)
      .filter((line) => !line.startsWith("Repository: "))
      .join("\n")
      .trim();

    const status: BoutRecord["status"] = parsedVerdict?.success
      ? "Complete"
      : publication
        ? "Published"
        : draft
          ? "Prepared"
          : "Draft";

    return {
      id: battleId,
      title: (typedDraft?.task?.title ?? extractTitle(task)).replace(/^Blind code review:\s*/iu, ""),
      repo: repoLine?.slice("Repository: ".length).trim() || "Not recorded",
      reward: Number(typedDraft?.task?.payment?.amount ?? 0),
      minimumPayout: Number(typedDraft?.task?.minSubmissionAmount ?? 0),
      createdAt: typedManifest.createdAt ?? new Date(0).toISOString(),
      deadline: typedDraft?.task?.deadline ?? null,
      status,
      task: cleanTask,
      verificationCommand: typedManifest.verification?.command ?? null,
      patchA: buildPatch(candidateA, typedManifest.candidates?.[0]?.sha256 ?? ""),
      patchB: buildPatch(candidateB, typedManifest.candidates?.[1]?.sha256 ?? ""),
      verdict: parsedVerdict?.success ? parsedVerdict.data : null,
      publicationTaskId: typedPublication?.taskId ?? null,
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
      message: "Set SOLANA_PRIVATE_KEY on the local API process to load live Gibwork review bounties.",
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
    return {
      items: [],
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildPatch(content: string, sha256: string): BoutRecord["patchA"] {
  const lines = content.split(/\r?\n/u);
  return {
    content,
    sha256,
    additions: lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length,
    deletions: lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length,
    files: Math.max(1, lines.filter((line) => line.startsWith("diff --git ")).length),
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

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readOptionalJson(filePath: string): Promise<unknown | null> {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
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
