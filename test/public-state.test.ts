import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  genericPublicError,
  publicStorageDescriptor,
  toPublicErrorMessage,
} from "../web/server/public-state.js";

describe("browser-safe public state", () => {
  it("never includes an absolute filesystem path", () => {
    const payload = JSON.stringify(publicStorageDescriptor);

    expect(payload).not.toMatch(/[A-Z]:\\/u);
    expect(payload).not.toContain("/Users/");
    expect(publicStorageDescriptor).toEqual({
      engine: "SQLite",
      scope: "Current project",
      persistence: "Local only",
    });
  });

  it("replaces internal paths with a generic browser error", () => {
    const error = new Error("ENOENT: C:\\Users\\person\\private\\manifest.json");

    expect(toPublicErrorMessage(error)).toBe(genericPublicError);
    expect(toPublicErrorMessage(error)).not.toContain("person");
  });

  it("keeps validation errors short and actionable", () => {
    const result = z.object({ minimumPayout: z.number().positive() }).safeParse({
      minimumPayout: -1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toPublicErrorMessage(result.error)).toBe(
        "Check the minimum payout field and try again.",
      );
    }
  });
});
