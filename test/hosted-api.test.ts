import { describe, expect, it } from "vitest";
import battlesHandler from "../api/battles.js";
import healthHandler from "../api/health.js";
import workspaceHandler from "../api/workspace.js";

describe("hosted showcase API", () => {
  it("reports a healthy read-only deployment with no seeded records", () => {
    const health = invoke(healthHandler, "GET");
    const workspace = invoke(workspaceHandler, "GET");

    expect(health.status).toBe(200);
    expect(health.json).toMatchObject({
      ok: true,
      mode: "hosted-showcase",
      persistence: "read-only",
    });
    expect(workspace.status).toBe(200);
    expect(workspace.json).toMatchObject({
      battles: [],
      liveBounties: [],
      storage: { scope: "Hosted showcase", persistence: "Read-only" },
      stats: { total: 0, totalPool: 0 },
    });
  });

  it("refuses state-changing requests in the hosted showcase", () => {
    const response = invoke(battlesHandler, "POST");
    expect(response.status).toBe(409);
    expect(response.json).toMatchObject({
      error: expect.stringContaining("read-only"),
    });
  });
});

function invoke(
  handler: (request: { method: string }, response: MockResponse) => void,
  method: string,
): { status: number; json: unknown; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  let body = "";
  const response: MockResponse = {
    statusCode: 200,
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end: (value) => {
      body = value;
    },
  };
  handler({ method }, response);
  return { status: response.statusCode, json: JSON.parse(body), headers };
}

interface MockResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(value: string): void;
}
