#!/usr/bin/env node

import process from "node:process";
import { Command } from "commander";
import { createBattle } from "./core/battle.js";
import { runDoctorChecks } from "./doctor.js";
import { prepareBountyDraft } from "./marketplace/draft.js";
import { createStageTaskCreator, publishBounty } from "./marketplace/publish.js";
import {
  createStageSubmissionLister,
  generateFinalReport,
  syncBountySubmissions,
} from "./marketplace/reviews.js";
import { listIndexedBattles } from "./db/store.js";

const VERSION = "0.1.0";

const program = new Command()
  .name("bout")
  .description("Paid blind review for competing code patches, powered by Gibwork.")
  .version(VERSION);

program
  .command("doctor")
  .description("Check whether the local environment can run review workflows.")
  .action(() => {
    const checks = runDoctorChecks();

    for (const check of checks) {
      process.stdout.write(`${check.ok ? "PASS" : "FAIL"}  ${check.label}  ${check.detail}\n`);
    }

    if (checks.some((check) => !check.ok)) {
      process.exitCode = 1;
    }
  });

const battle = program.command("battle").description("Create and inspect blind review battles.");

battle
  .command("create")
  .description("Create an anonymized reviewer bundle from a task and two candidate patches.")
  .requiredOption("--task <path>", "Markdown file containing the task and acceptance criteria")
  .requiredOption("--candidate-one <path>", "First source patch")
  .requiredOption("--candidate-two <path>", "Second source patch")
  .option("--verify <command>", "Verification command recorded for both candidates")
  .option("--workspace <path>", "Workspace that receives local battle state", process.cwd())
  .action(
    async (options: {
      task: string;
      candidateOne: string;
      candidateTwo: string;
      verify?: string;
      workspace: string;
    }) => {
      const result = await createBattle({
        workspace: options.workspace,
        taskPath: options.task,
        firstCandidatePath: options.candidateOne,
        secondCandidatePath: options.candidateTwo,
        ...(options.verify === undefined ? {} : { verificationCommand: options.verify }),
      });

      process.stdout.write(`CREATED  ${result.battleId}\n`);
      process.stdout.write(`REVIEW   ${result.reviewDirectory}\n`);
      process.stdout.write("PRIVATE  Identity mapping stored separately and excluded from review output.\n");
    },
  );

battle
  .command("list")
  .description("List local battles and their workflow state.")
  .option("--workspace <path>", "Workspace containing local battle state", process.cwd())
  .action(async (options: { workspace: string }) => {
    const battles = await listIndexedBattles(options.workspace);
    if (battles.length === 0) {
      process.stdout.write("No local battles found.\n");
      return;
    }
    for (const item of battles) {
      const state = item.report
        ? `reported:${item.report.outcome}`
        : item.hasPublicationReceipt
          ? "published"
          : item.hasBountyDraft
            ? "prepared"
            : "draft";
      process.stdout.write(
        `${item.id}  ${state}  ${item.validReviewCount}/${item.submissionCount} valid reviews  ${item.title}\n`,
      );
    }
  });

const bounty = program
  .command("bounty")
  .description("Prepare and publish paid reviewer bounties for local battles.");

bounty
  .command("prepare")
  .description("Generate and inspect the public bounty payload without spending funds.")
  .argument("<battle-id>", "Local battle UUID")
  .requiredOption("--pool <amount>", "Total USDC bounty pool")
  .requiredOption("--min-payout <amount>", "Minimum USDC payout per approved review")
  .option("--deadline <iso-date>", "Optional ISO-8601 deadline")
  .option("--allow-unverified", "Allow submissions from unverified reviewers", false)
  .option("--workspace <path>", "Workspace containing local battle state", process.cwd())
  .action(
    async (
      battleId: string,
      options: {
        pool: string;
        minPayout: string;
        deadline?: string;
        allowUnverified: boolean;
        workspace: string;
      },
    ) => {
      const { draft, draftPath } = await prepareBountyDraft({
        workspace: options.workspace,
        battleId,
        poolAmount: options.pool,
        minimumPayout: options.minPayout,
        verifiedReviewersOnly: !options.allowUnverified,
        ...(options.deadline === undefined ? {} : { deadline: options.deadline }),
      });

      process.stdout.write(`PREPARED  ${draftPath}\n`);
      process.stdout.write(`POOL      ${draft.task.payment.amount} USDC\n`);
      process.stdout.write(`PAYOUT    ${draft.task.minSubmissionAmount} USDC minimum\n`);
      process.stdout.write("NETWORK   stage (uses real mainnet USDC)\n");
      process.stdout.write("SPEND     none; preparation is local only\n");
    },
  );

bounty
  .command("publish")
  .description("Create the prepared bounty on stage after explicit real-funds confirmation.")
  .argument("<battle-id>", "Local battle UUID")
  .requiredOption("--keypair <path>", "Path to a local wallet keypair file")
  .requiredOption(
    "--confirm-real-funds <confirmation>",
    'Must be exactly "I UNDERSTAND STAGE USES REAL USDC"',
  )
  .requiredOption(
    "--max-total <amount>",
    "Maximum SDK-quoted total USDC debit permitted before signing",
  )
  .option("--workspace <path>", "Workspace containing local battle state", process.cwd())
  .action(
    async (
      battleId: string,
      options: {
        keypair: string;
        confirmRealFunds: string;
        maxTotal: string;
        workspace: string;
      },
    ) => {
      if (options.confirmRealFunds !== "I UNDERSTAND STAGE USES REAL USDC") {
        throw new Error("Refusing to publish without the exact real-funds confirmation phrase.");
      }

      const creator = await createStageTaskCreator(options.keypair, options.maxTotal);
      const result = await publishBounty({
        workspace: options.workspace,
        battleId,
        creator,
      });
      process.stdout.write(`PUBLISHED  ${result.taskId}\n`);
      process.stdout.write("NETWORK    stage\n");
      if (result.totalDebit) process.stdout.write(`DEBIT      ${result.totalDebit} USDC\n`);
      process.stdout.write(`RECORD     ${result.publicationPath}\n`);
      if (result.indexWarning) {
        process.stderr.write(`WARNING    ${result.indexWarning}\n`);
      }
    },
  );

bounty
  .command("sync")
  .description("Retrieve creator-visible Gibwork submissions and validate structured reviews.")
  .argument("<battle-id>", "Local battle UUID")
  .requiredOption("--keypair <path>", "Path to the creator wallet keypair file")
  .option("--workspace <path>", "Workspace containing local battle state", process.cwd())
  .action(
    async (
      battleId: string,
      options: { keypair: string; workspace: string },
    ) => {
      const lister = await createStageSubmissionLister(options.keypair);
      const { record, submissionsPath } = await syncBountySubmissions({
        workspace: options.workspace,
        battleId,
        lister,
      });
      const valid = record.submissions.filter(
        (submission) => submission.status !== "REJECTED" && submission.verdict !== null,
      ).length;
      process.stdout.write(`SYNCED     ${record.submissions.length} submission(s)\n`);
      process.stdout.write(`VALID      ${valid} structured review(s)\n`);
      process.stdout.write(`RECORD     ${submissionsPath}\n`);
    },
  );

const report = program
  .command("report")
  .description("Generate creator-only consensus reports from synced reviews.");

report
  .command("generate")
  .description("Aggregate valid reviews, resolve the source candidate, and export reports.")
  .argument("<battle-id>", "Local battle UUID")
  .option("--workspace <path>", "Workspace containing local battle state", process.cwd())
  .action(async (battleId: string, options: { workspace: string }) => {
    const result = await generateFinalReport({
      workspace: options.workspace,
      battleId,
    });
    process.stdout.write(`OUTCOME    ${result.report.aggregate.outcome}\n`);
    process.stdout.write(`REVIEWS    ${result.report.aggregate.validReviews} valid\n`);
    process.stdout.write(
      `WINNER     ${result.report.resolvedWinner?.sourceSlot ?? "not resolved"}\n`,
    );
    process.stdout.write(`MARKDOWN   ${result.markdownPath}\n`);
    process.stdout.write(`JSON       ${result.jsonPath}\n`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ERROR  ${message}\n`);
  process.exitCode = 1;
});
