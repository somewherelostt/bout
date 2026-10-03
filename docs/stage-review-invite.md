# Review invitation: workspace path safety

This is the reviewer-facing brief for a real **Gibwork stage** bounty created by Bout. Compare the two anonymous patches against the same task. Do not infer or ask about their authors.

- Gibwork stage task ID: `76bc62aa-5dca-4758-9f10-f77205cd0d01`
- Bout battle ID: `9dace82d-cf59-4842-8698-e80792cf7f0f`
- Reward pool: 2.00 USDC; minimum payout: 1.00 USDC
- Eligibility: verified Gibwork submissions only
- Participation: Gibwork quotes a fee to each submitter; inspect that quote before paying. The current SDK documentation says 0.15 USDC, but the live quote controls.

The stage website is currently behind Vercel SSO, so a public task-page URL has **not** been verified. The task ID is confirmed through the Gibwork stage SDK. A separate reviewer needs their own eligible Gibwork account and active stage wallet; a GitHub account alone cannot submit. Do not send anyone a private key or recovery phrase. If your stage wallet is not active, ask the Gibwork hackathon team to enable it. The [official Gibwork CLI guide](https://www.npmjs.com/package/@gibwork/cli) explains task lookup and submission through the stage API.

## Task

The path resolver currently accepts values containing `..` and can return a path outside the configured workspace.

Acceptance criteria:

1. Resolve normal relative paths under the configured workspace.
2. Reject traversal that escapes the workspace.
3. Reject absolute paths supplied as relative input.
4. Preserve the existing function signature.
5. Add focused tests for valid and invalid paths.

The common verification command in the bounty is `npm test`. The published bundle contains patches, not a runnable baseline repository. If you cannot execute the tests, say so in your evidence; do not claim a test pass you did not observe.

## Candidate A

SHA-256 of `candidate-a.patch`: `7cd2dc243cbc85ad1c558dbc9bfd6f97fb2f4d9d7ad4dd614e8972f6209a2131`

```diff
diff --git a/src/resolve-path.ts b/src/resolve-path.ts
index 7f1729a..43fca82 100644
--- a/src/resolve-path.ts
+++ b/src/resolve-path.ts
@@ -1,5 +1,10 @@
 import path from "node:path";

 export function resolveWorkspacePath(workspace: string, requested: string): string {
-  return path.resolve(workspace, requested);
+  if (requested.includes("..")) {
+    throw new Error("Traversal is not allowed.");
+  }
+  return path.join(workspace, requested);
 }
diff --git a/test/resolve-path.test.ts b/test/resolve-path.test.ts
index 9a1180f..c263ae1 100644
--- a/test/resolve-path.test.ts
+++ b/test/resolve-path.test.ts
@@ -8,4 +8,8 @@ describe("resolveWorkspacePath", () => {
     expect(resolveWorkspacePath("/work", "src/index.ts")).toBe("/work/src/index.ts");
   });
+
+  it("rejects dot-dot input", () => {
+    expect(() => resolveWorkspacePath("/work", "../secret")).toThrow("Traversal");
+  });
 });
```

## Candidate B

SHA-256 of `candidate-b.patch`: `e2a23f61125e5cd928a3650c7b7c6675b1d9c0d44e49555135f3f37bc2b6c575`

```diff
diff --git a/src/resolve-path.ts b/src/resolve-path.ts
index 7f1729a..13aa401 100644
--- a/src/resolve-path.ts
+++ b/src/resolve-path.ts
@@ -1,5 +1,11 @@
 import path from "node:path";

 export function resolveWorkspacePath(workspace: string, requested: string): string {
-  return path.resolve(workspace, requested);
+  const root = path.resolve(workspace);
+  const resolved = path.resolve(root, requested);
+  const relative = path.relative(root, resolved);
+  if (path.isAbsolute(requested) || relative.startsWith("..") || path.isAbsolute(relative)) {
+    throw new Error("Path escapes the configured workspace.");
+  }
+  return resolved;
 }
diff --git a/test/resolve-path.test.ts b/test/resolve-path.test.ts
index 9a1180f..2d20f9e 100644
--- a/test/resolve-path.test.ts
+++ b/test/resolve-path.test.ts
@@ -8,4 +8,8 @@ describe("resolveWorkspacePath", () => {
     expect(resolveWorkspacePath("/work", "src/index.ts")).toBe("/work/src/index.ts");
   });
+
+  it("rejects traversal", () => {
+    expect(() => resolveWorkspacePath("/work", "../secret")).toThrow("escapes");
+  });
 });
```

## Required submission format

Write your own assessment and submit it to the stage task ID above. Include concrete evidence and any testing limitations. Do not copy another person's verdict.

```text
WINNER: A | B | TIE | BOTH_FAILED
CONFIDENCE: 1-5

CORRECTNESS:
...

SECURITY:
...

MAINTAINABILITY:
...

EVIDENCE:
- cite concrete files, lines, tests, or behavior

RATIONALE:
...
```

The bounty creator cannot submit to this task. Gibwork returns `TASK_OWNER_CANNOT_SUBMIT` before charging a fee. The reviewer must be a separate eligible person using their own Gibwork account and wallet.
