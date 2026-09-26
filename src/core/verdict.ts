import path from "node:path";
import { writeJson } from "./json.js";
import {
  battleIdSchema,
  verdictRecordSchema,
  type VerdictInput,
  type VerdictRecord,
} from "./schemas.js";
import { syncBattleToDatabase } from "../db/store.js";

export async function saveVerdict(input: {
  workspace: string;
  battleId: string;
  verdict: VerdictInput;
  now?: () => Date;
}): Promise<VerdictRecord> {
  const battleId = battleIdSchema.parse(input.battleId);
  const record = verdictRecordSchema.parse({
    ...input.verdict,
    schemaVersion: 1,
    submittedAt: (input.now ?? (() => new Date()))().toISOString(),
  });
  const verdictPath = path.resolve(
    input.workspace,
    ".bout",
    "battles",
    battleId,
    "review",
    "verdict.json",
  );
  await writeJson(verdictPath, record);
  await syncBattleToDatabase(input.workspace, battleId);
  return record;
}
