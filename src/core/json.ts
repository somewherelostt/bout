import { readFile, writeFile } from "node:fs/promises";
import type { ZodType } from "zod";

export async function readJson<T>(filePath: string, schema: ZodType<T>): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return schema.parse(JSON.parse(content));
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
