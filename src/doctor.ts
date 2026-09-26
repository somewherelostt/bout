import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

export interface DoctorCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export function runDoctorChecks(): DoctorCheck[] {
  return [
    {
      label: "Node.js",
      ok: Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10) >= 22,
      detail: process.version,
    },
    checkSqlite(),
    checkGit(),
  ];
}

function checkSqlite(): DoctorCheck {
  try {
    const database = new Database(":memory:");
    const version = database.prepare("SELECT sqlite_version() AS version").get() as {
      version: string;
    };
    database.close();
    return { label: "SQLite", ok: true, detail: version.version };
  } catch (error) {
    return {
      label: "SQLite",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkGit(): DoctorCheck {
  try {
    const version = execFileSync("git", ["--version"], { encoding: "utf8" }).trim();
    return { label: "Git", ok: true, detail: version };
  } catch {
    return { label: "Git", ok: false, detail: "not found" };
  }
}
