import { describe, expect, it } from "vitest";
import { runDoctorChecks } from "../src/doctor.js";

describe("runDoctorChecks", () => {
  it("reports the supported runtime and git availability", () => {
    const checks = runDoctorChecks();

    expect(checks.map((check) => check.label)).toEqual(["Node.js", "Git"]);
    expect(checks.every((check) => check.ok)).toBe(true);
  });
});
