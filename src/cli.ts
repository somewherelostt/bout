#!/usr/bin/env node

import process from "node:process";
import { Command } from "commander";
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

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ERROR  ${message}\n`);
  process.exitCode = 1;
});
