import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CreateTaskResult } from "@gibwork/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBattle } from "../src/core/battle.js";
import { prepareBountyDraft } from "../src/marketplace/draft.js";
import {
  assertAuthorizedTotal,
  inspectPublicationState,
  publishBounty,
  type TaskCreator,
} from "../src/marketplace/publish.js";

const temporaryDirectories: string[] = [];
const battleId = "22222222-2222-4222-8222-222222222222";

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("marketplace workflow", () => {
  it("prepares a public payload without source identities", async () => {
    const workspace = await createBattleFixture();
    const { draft, draftPath } = await prepareBountyDraft({
      workspace,
      battleId,
      poolAmount: "3.00",
      minimumPayout: "1.00",
    });

    expect(draft.task.payment.amount).toBe("3.00");
    expect(draft.task.allowOnlyVerifiedSubmissions).toBe(true);
    expect(draft.task.content).toContain("WINNER: A | B | TIE | BOTH_FAILED");
    expect(draft.task.content).not.toContain("internal-first");
    expect(draft.task.content).not.toContain("internal-second");
    expect(await readFile(draftPath, "utf8")).not.toContain("sourcePath");
  });

  it("publishes through an injected creator and records the result", async () => {
    const workspace = await createBattleFixture();
    await prepareBountyDraft({
      workspace,
      battleId,
      poolAmount: "1.00",
      minimumPayout: "1.00",
    });

    const resultFixture = {
      taskId: "33333333-3333-4333-8333-333333333333",
      intentId: "44444444-4444-4444-8444-444444444444",
      txHash: "example-transaction-hash",
      lastValidBlockHeight: 1,
      paymentQuote: {
        token: { mintAddress: "mint", symbol: "USDC", decimals: 6 },
        fundingAmount: "1.00",
        platformFee: { percent: 0, amount: "0.00" },
        totalDebit: "1.00",
      },
      status: "confirmed",
    } as unknown as CreateTaskResult;
    const create = vi.fn().mockResolvedValue(resultFixture);

    const result = await publishBounty({
      workspace,
      battleId,
      creator: { create },
    });

    expect(create).toHaveBeenCalledOnce();
    expect(result.taskId).toBe(resultFixture.taskId);
    expect(JSON.parse(await readFile(result.publicationPath, "utf8"))).toMatchObject({
      environment: "stage",
      taskId: resultFixture.taskId,
      txHash: resultFixture.txHash,
      paymentQuote: { totalDebit: "1.00" },
    });

    await expect(
      publishBounty({ workspace, battleId, creator: { create } }),
    ).rejects.toThrow("is already published as Gibwork task");
    expect(create).toHaveBeenCalledOnce();
  });

  it("rejects a minimum payout larger than the pool", async () => {
    const workspace = await createBattleFixture();

    await expect(
      prepareBountyDraft({
        workspace,
        battleId,
        poolAmount: "1.00",
        minimumPayout: "2.00",
      }),
    ).rejects.toThrow("Minimum payout cannot exceed the total bounty pool");
  });

  it("refuses an SDK quote above the authorized total before signing", () => {
    expect(() => assertAuthorizedTotal("1.01", "1.00")).toThrow(
      "exceeds the authorized maximum of 1.00. Nothing was signed",
    );
    expect(() => assertAuthorizedTotal("1.00", "1.00")).not.toThrow();
  });

  it("does not persist an unconfirmed adapter result as a publication", async () => {
    const workspace = await createBattleFixture();
    await prepareBountyDraft({ workspace, battleId, poolAmount: "1.00", minimumPayout: "1.00" });
    const creator: TaskCreator = {
      create: async () => ({ ...createResult(), status: "processing", txHash: undefined }),
    };

    await expect(publishBounty({ workspace, battleId, creator })).rejects.toThrow(
      "did not confirm task creation",
    );
    await expect(
      access(path.join(workspace, ".bout", "battles", battleId, "private", "publication.json")),
    ).rejects.toThrow();
  });

  it("persists an exclusive recovery record before submit and blocks a retry", async () => {
    const workspace = await createBattleFixture();
    await prepareBountyDraft({ workspace, battleId, poolAmount: "1.00", minimumPayout: "1.00" });
    let calls = 0;
    const creator: TaskCreator = {
      create: async (_input, callbacks) => {
        calls += 1;
        await callbacks?.onPrepared({
          intentId: createResult().intentId,
          lastValidBlockHeight: 42,
          paymentQuote: createResult().paymentQuote,
        });
        throw new Error("simulated ambiguous submit");
      },
    };

    await expect(publishBounty({ workspace, battleId, creator })).rejects.toThrow(
      "Recovery data is saved",
    );
    const state = await inspectPublicationState(workspace, battleId);
    expect(state).toMatchObject({
      state: "unresolved",
      record: { status: "prepared", intentId: createResult().intentId },
    });
    await expect(publishBounty({ workspace, battleId, creator })).rejects.toThrow(
      "has an unresolved prepared publish attempt",
    );
    expect(calls).toBe(1);
  });

  it("rejects non-UUID battle identifiers before resolving workspace paths", async () => {
    const creator: TaskCreator = { create: async () => createResult() };
    await expect(
      publishBounty({ workspace: "C:\\safe-workspace", battleId: "../../outside", creator }),
    ).rejects.toThrow();
    await expect(inspectPublicationState("C:\\safe-workspace", "../../outside")).rejects.toThrow();
  });
});

function createResult(): CreateTaskResult {
  return {
    taskId: "33333333-3333-4333-8333-333333333333",
    intentId: "44444444-4444-4444-8444-444444444444",
    txHash: "example-transaction-hash",
    lastValidBlockHeight: 42,
    paymentQuote: {
      token: { mintAddress: "mint", symbol: "USDC", decimals: 6 },
      fundingAmount: "1.00",
      platformFee: { percent: 0, amount: "0.00" },
      totalDebit: "1.00",
    },
    status: "confirmed",
  };
}

async function createBattleFixture(): Promise<string> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "bout-marketplace-"));
  temporaryDirectories.push(workspace);
  await mkdir(workspace, { recursive: true });

  const taskPath = path.join(workspace, "task.md");
  const firstPath = path.join(workspace, "internal-first.patch");
  const secondPath = path.join(workspace, "internal-second.patch");
  await Promise.all([
    writeFile(taskPath, "# Repair path validation\n\nPrevent traversal outside the root.\n"),
    writeFile(firstPath, "diff --git a/path.ts b/path.ts\n+first\n"),
    writeFile(secondPath, "diff --git a/path.ts b/path.ts\n+second\n"),
  ]);

  await createBattle(
    {
      workspace,
      taskPath,
      firstCandidatePath: firstPath,
      secondCandidatePath: secondPath,
      verificationCommand: "npm test",
    },
    {
      idFactory: () => battleId,
      now: () => new Date("2026-09-26T12:00:00.000Z"),
      shouldSwap: () => false,
    },
  );

  return workspace;
}
