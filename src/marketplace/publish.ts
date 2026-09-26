import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { CreateTaskInput, CreateTaskResult } from "@gibwork/sdk";
import {
  createGibworkClient,
  createKeypairSigner,
  signPreparedTransaction,
} from "@gibwork/sdk/node";
import { z } from "zod";
import { readJson, writeJson } from "../core/json.js";
import { syncBattleToDatabase } from "../db/store.js";
import { toCreateTaskInput } from "./draft.js";
import {
  bountyDraftSchema,
  decimalAmountSchema,
  decimalToMicros,
  publicationRecordSchema,
} from "./schemas.js";

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
  totalDebit?: string;
  indexWarning?: string;
}> {
  const battleDirectory = path.resolve(input.workspace, ".bout", "battles", input.battleId);
  const publicationPath = path.join(battleDirectory, "private", "publication.json");
  try {
    const existing = await readJson(publicationPath, publicationRecordSchema);
    throw new Error(
      `Battle ${input.battleId} is already published as Gibwork task ${existing.taskId}.`,
    );
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
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
    paymentQuote: {
      symbol: result.paymentQuote.token.symbol,
      mintAddress: result.paymentQuote.token.mintAddress,
      fundingAmount: result.paymentQuote.fundingAmount,
      platformFeeAmount: result.paymentQuote.platformFee.amount,
      totalDebit: result.paymentQuote.totalDebit,
    },
    publishedAt: new Date().toISOString(),
  });

  const privateDirectory = path.join(battleDirectory, "private");
  await mkdir(privateDirectory, { recursive: true });
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
    ...(publication.paymentQuote ? { totalDebit: publication.paymentQuote.totalDebit } : {}),
    ...(indexWarning ? { indexWarning } : {}),
  };
}

export async function createStageTaskCreator(
  keypairPath: string,
  maximumTotalDebit: string,
): Promise<TaskCreator> {
  const privateKey = await readPrivateKeyFile(keypairPath);
  const client = createGibworkClient({ privateKey, production: false });
  const signer = createKeypairSigner(privateKey);
  const maximum = decimalAmountSchema.parse(maximumTotalDebit);
  return {
    create: async (input) => {
      const prepared = await client.tasks.prepareCreate(input);
      assertAuthorizedTotal(
        prepared.paymentQuote.totalDebit,
        maximum,
        prepared.paymentQuote.token.symbol,
      );
      const signedTransaction = await signPreparedTransaction(
        prepared.serializedTransaction,
        signer,
      );
      const submitted = await client.tasks.submitCreate(prepared.intentId, signedTransaction);
      if (submitted.status !== "confirmed" || !submitted.txHash) {
        throw new Error(
          `Gibwork did not confirm task creation for intent ${prepared.intentId}. Do not retry until its status is resolved.`,
        );
      }
      return {
        ...submitted,
        intentId: prepared.intentId,
        lastValidBlockHeight: prepared.lastValidBlockHeight,
        paymentQuote: prepared.paymentQuote,
      };
    },
  };
}

export function assertAuthorizedTotal(
  quotedTotalDebit: string,
  maximumTotalDebit: string,
  symbol = "USDC",
): void {
  const quoted = decimalAmountSchema.parse(quotedTotalDebit);
  const maximum = decimalAmountSchema.parse(maximumTotalDebit);
  if (decimalToMicros(quoted) > decimalToMicros(maximum)) {
    throw new Error(
      `Gibwork quoted ${quoted} ${symbol}, which exceeds the authorized maximum of ${maximum}. Nothing was signed.`,
    );
  }
}

export async function createStageGibworkClient(keypairPath: string) {
  const privateKey = await readPrivateKeyFile(keypairPath);
  return createGibworkClient({ privateKey, production: false });
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

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
