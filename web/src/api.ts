import type { CreateBoutInput, VerdictRecord, WorkspaceSnapshot } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : undefined;
    throw new Error(typeof message === "string" && message ? message : `Request failed (${response.status})`);
  }
  return payload as T;
}

export function loadWorkspace(): Promise<WorkspaceSnapshot> {
  return request<WorkspaceSnapshot>("/api/workspace");
}

export function createBout(input: CreateBoutInput): Promise<{ battleId: string }> {
  return request<{ battleId: string }>("/api/battles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveVerdict(
  battleId: string,
  verdict: Omit<VerdictRecord, "schemaVersion" | "submittedAt">,
): Promise<VerdictRecord> {
  return request<VerdictRecord>(`/api/battles/${encodeURIComponent(battleId)}/verdict`, {
    method: "POST",
    body: JSON.stringify(verdict),
  });
}
