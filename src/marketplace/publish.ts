import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CreateTaskInput,
  CreateTaskResult,
  PreparedTaskIntent,
  TaskSubmitResult,
} from "@gibwork/sdk";
import {
  createGibworkClient,
  createKeypairSigner,
  signPreparedTransaction,
} from "@gibwork/sdk/node";
import { z } from "zod";
import { battleIdSchema } from "../core/schemas.js";
import { readJson, writeJson } from "../core/json.js";
import { syncBattleToDatabase } from "../db/store.js";
import { toCreateTaskInput } from "./draft.js";
import {
  bountyDraftSchema,
  decimalAmountSchema,
  decimalToMicros,
  publicationAttemptSchema,
  publicationRecordSchema,
  type PublicationAttempt,
} from "./schemas.js";

export interface PreparedTaskContext {
  intentId: string;
  taskId: string;
  lastValidBlockHeight: number;
  paymentQuote: CreateTaskResult["paymentQuote"];
}

export interface TaskCreationCallbacks {
  onPrepared(context: PreparedTaskContext): Promise<void>;
  onSubmitted(result: TaskSubmitResult): Promise<void>;
}

export interface TaskCreator {
  create(input: CreateTaskInput, callbacks?: TaskCreationCallbacks): Promise<CreateTaskResult>;
}

export interface TaskQuoter {
  prepare(input: CreateTaskInput): Promise<PreparedTaskIntent>;
}

export interface PublishBountyInput {
  workspace: string;
  battleId: string;
  creator: TaskCreator;
}

export async function quoteBounty(input: {
  workspace: string;
  battleId: string;
  quoter: TaskQuoter;
}): Promise<{
  fundingAmount: string;
  platformFeeAmount: string;
  totalDebit: string;
  symbol: string;
}> {
  const battleId = battleIdSchema.parse(input.battleId);
  const publicationState = await inspectPublicationState(input.workspace, battleId);
  if (publicationState.state === "confirmed") {
    throw new Error(
      `Battle ${battleId} is already published as Gibwork task ${publicationState.record.taskId}.`,
    );
  }
  if (publicationState.state === "unresolved") {
    throw new Error(
      `Battle ${battleId} has an unresolved ${publicationState.record.status} publish attempt (${publicationState.record.intentId}). Do not create another intent until it is resolved.`,
    );
  }

  const battleDirectory = path.resolve(input.workspace, ".bout", "battles", battleId);
  const draft = await readJson(
    path.join(battleDirectory, "review", "bounty-draft.json"),
    bountyDraftSchema,
  );
  const prepared = await input.quoter.prepare(toCreateTaskInput(draft));

  return {
    fundingAmount: prepared.paymentQuote.fundingAmount,
    platformFeeAmount: prepared.paymentQuote.platformFee.amount,
    totalDebit: prepared.paymentQuote.totalDebit,
    symbol: prepared.paymentQuote.token.symbol,
  };
}

export async function publishBounty(input: PublishBountyInput): Promise<{
  taskId: string;
  publicationPath: string;
  totalDebit?: string;
  indexWarning?: string;
}> {
  const battleId = battleIdSchema.parse(input.battleId);
  const battleDirectory = path.resolve(input.workspace, ".bout", "battles", battleId);
  const privateDirectory = path.join(battleDirectory, "private");
  const publicationPath = path.join(battleDirectory, "private", "publication.json");
  const attemptPath = path.join(privateDirectory, "publication-attempt.json");
  try {
    const existing = await readJson(publicationPath, publicationRecordSchema);
    throw new Error(
      `Battle ${battleId} is already published as Gibwork task ${existing.taskId}.`,
    );
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
  try {
    const attempt = await readJson(attemptPath, publicationAttemptSchema);
    throw new Error(
      `Battle ${battleId} has an unresolved ${attempt.status} publish attempt (${attempt.intentId}). Run bout bounty publish-status ${battleId} and do not retry until it is resolved.`,
    );
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
  const draft = await readJson(
    path.join(battleDirectory, "review", "bounty-draft.json"),
    bountyDraftSchema,
  );

  let preparedAttempt: PublicationAttempt | null = null;
  let result: CreateTaskResult;
  try {
    result = await input.creator.create(toCreateTaskInput(draft), {
      onPrepared: async (context) => {
        const timestamp = new Date().toISOString();
        const attempt = publicationAttemptSchema.parse({
          schemaVersion: 1,
          battleId,
          environment: "stage",
          intentId: context.intentId,
          taskId: context.taskId,
          lastValidBlockHeight: context.lastValidBlockHeight,
          paymentQuote: toPaymentQuoteRecord(context.paymentQuote),
          status: "prepared",
          preparedAt: timestamp,
          updatedAt: timestamp,
        });
        await mkdir(privateDirectory, { recursive: true });
        await writeFile(attemptPath, `${JSON.stringify(attempt, null, 2)}\n`, {
          encoding: "utf8",
          flag: "wx",
        });
        preparedAttempt = attempt;
      },
      onSubmitted: async (submitted) => {
        if (!preparedAttempt) {
          throw new Error("Gibwork returned a publish result before a prepared intent was saved.");
        }
        preparedAttempt = publicationAttemptSchema.parse({
          ...preparedAttempt,
          status: submitted.status,
          taskId: submitted.taskId,
          ...(submitted.txHash ? { txHash: submitted.txHash } : {}),
          updatedAt: new Date().toISOString(),
        });
        await writeJson(attemptPath, preparedAttempt);
      },
    });
  } catch (error) {
    if (preparedAttempt) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${reason} Recovery data is saved at ${attemptPath}. Do not retry until the intent is resolved.`,
        { cause: error },
      );
    }
    throw error;
  }
  if (result.status !== "confirmed" || !result.txHash) {
    throw new Error(
      `Gibwork did not confirm task creation for intent ${result.intentId}. Do not retry until its status is resolved.`,
    );
  }
  const publication = publicationRecordSchema.parse({
    schemaVersion: 1,
    battleId,
    environment: "stage",
    taskId: result.taskId,
    intentId: result.intentId,
    txHash: result.txHash,
    paymentQuote: toPaymentQuoteRecord(result.paymentQuote),
    publishedAt: new Date().toISOString(),
  });

  await mkdir(privateDirectory, { recursive: true });
  await writeJson(publicationPath, publication);
  await rm(attemptPath, { force: true });
  let indexWarning: string | undefined;
  try {
    await syncBattleToDatabase(input.workspace, battleId);
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
    create: async (input, callbacks) => {
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
      await callbacks?.onPrepared({
        intentId: prepared.intentId,
        taskId: prepared.taskId,
        lastValidBlockHeight: prepared.lastValidBlockHeight,
        paymentQuote: prepared.paymentQuote,
      });
      const submitted = await client.tasks.submitCreate(prepared.intentId, signedTransaction);
      await callbacks?.onSubmitted(submitted);
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

export async function createStageTaskQuoter(keypairPath: string): Promise<TaskQuoter> {
  const client = await createStageGibworkClient(keypairPath);
  return {
    prepare: (input) => client.tasks.prepareCreate(input),
  };
}

export async function inspectPublicationState(
  workspace: string,
  battleId: string,
): Promise<
  | { state: "confirmed"; record: z.infer<typeof publicationRecordSchema>; path: string }
  | { state: "unresolved"; record: PublicationAttempt; path: string }
  | { state: "not-started" }
> {
  const validatedBattleId = battleIdSchema.parse(battleId);
  const privateDirectory = path.resolve(
    workspace,
    ".bout",
    "battles",
    validatedBattleId,
    "private",
  );
  const publicationPath = path.join(privateDirectory, "publication.json");
  try {
    return {
      state: "confirmed",
      record: await readJson(publicationPath, publicationRecordSchema),
      path: publicationPath,
    };
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
  const attemptPath = path.join(privateDirectory, "publication-attempt.json");
  try {
    return {
      state: "unresolved",
      record: await readJson(attemptPath, publicationAttemptSchema),
      path: attemptPath,
    };
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
  return { state: "not-started" };
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

function toPaymentQuoteRecord(paymentQuote: CreateTaskResult["paymentQuote"]) {
  return {
    symbol: paymentQuote.token.symbol,
    mintAddress: paymentQuote.token.mintAddress,
    fundingAmount: paymentQuote.fundingAmount,
    platformFeeAmount: paymentQuote.platformFee.amount,
    totalDebit: paymentQuote.totalDebit,
  };
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
