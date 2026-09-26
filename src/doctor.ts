import { execFileSync } from "node:child_process";

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
    checkGit(),
  ];
}

function checkGit(): DoctorCheck {
  try {
    const version = execFileSync("git", ["--version"], { encoding: "utf8" }).trim();
    return { label: "Git", ok: true, detail: version };
  } catch {
    return { label: "Git", ok: false, detail: "not found" };
  }
}
