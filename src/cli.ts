#!/usr/bin/env node

import process from "node:process";
import { Command } from "commander";
import { createBattle } from "./core/battle.js";
import { runDoctorChecks } from "./doctor.js";

const VERSION = "0.1.0";

const program = new Command()
  .name("review-harness")
  .description("Create reproducible, blind reviews of competing code changes.")
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

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ERROR  ${message}\n`);
  process.exitCode = 1;
});
