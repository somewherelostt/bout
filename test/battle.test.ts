import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBattle } from "../src/core/battle.js";
import { sha256 } from "../src/core/hash.js";
import { identityMapSchema, reviewManifestSchema } from "../src/core/schemas.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("createBattle", () => {
  it("creates an anonymized review bundle and keeps source identities private", async () => {
    const workspace = await createFixture();
    const battleId = "11111111-1111-4111-8111-111111111111";

    const result = await createBattle(
      {
        workspace,
        taskPath: path.join(workspace, "task.md"),
        firstCandidatePath: path.join(workspace, "named-source-alpha.patch"),
        secondCandidatePath: path.join(workspace, "named-source-beta.patch"),
        verificationCommand: "npm test",
      },
      {
        idFactory: () => battleId,
        now: () => new Date("2026-09-26T12:00:00.000Z"),
        shouldSwap: () => true,
      },
    );

    const manifest = reviewManifestSchema.parse(
      JSON.parse(await readFile(path.join(result.reviewDirectory, "manifest.json"), "utf8")),
    );
    const identityMap = identityMapSchema.parse(
      JSON.parse(
        await readFile(path.join(result.battleDirectory, "private", "identity-map.json"), "utf8"),
      ),
    );

    expect(manifest.battleId).toBe(battleId);
    expect(manifest.candidates.map((candidate) => candidate.label)).toEqual(["A", "B"]);
    expect(manifest.verification.command).toBe("npm test");
    expect(identityMap.candidates[0].assignedLabel).toBe("B");
    expect(identityMap.candidates[1].assignedLabel).toBe("A");

    const publicCandidateA = await readFile(
      path.join(result.reviewDirectory, "candidate-a.patch"),
      "utf8",
    );
    expect(publicCandidateA).toBe("second patch\n");
    expect(manifest.candidates[0].sha256).toBe(sha256(publicCandidateA));

    const publicFiles = await Promise.all(
      ["manifest.json", "task.md", "candidate-a.patch", "candidate-b.patch"].map((file) =>
        readFile(path.join(result.reviewDirectory, file), "utf8"),
      ),
    );
    expect(publicFiles.join("\n")).not.toContain("named-source-alpha");
    expect(publicFiles.join("\n")).not.toContain("named-source-beta");
  });

  it("rejects identical candidates", async () => {
    const workspace = await createFixture();
    await writeFile(path.join(workspace, "named-source-beta.patch"), "first patch\n");

    await expect(
      createBattle({
        workspace,
        taskPath: path.join(workspace, "task.md"),
        firstCandidatePath: path.join(workspace, "named-source-alpha.patch"),
        secondCandidatePath: path.join(workspace, "named-source-beta.patch"),
      }),
    ).rejects.toThrow("Candidate inputs are identical");
  });
});

async function createFixture(): Promise<string> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "review-harness-"));
  temporaryDirectories.push(workspace);

  await Promise.all([
    writeFile(path.join(workspace, "task.md"), "# Fix the defect\n"),
    writeFile(path.join(workspace, "named-source-alpha.patch"), "first patch\n"),
    writeFile(path.join(workspace, "named-source-beta.patch"), "second patch\n"),
  ]);

  return workspace;
}
