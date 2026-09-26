import { ZodError } from "zod";

export const publicStorageDescriptor = {
  engine: "SQLite",
  scope: "Current project",
  persistence: "Local only",
} as const;

export const genericPublicError =
  "Bout could not complete that request. Check the local server logs for details.";

const safeBusinessErrors = [
  "Minimum payout cannot exceed the bounty pool.",
  "Candidate inputs are identical; a blind comparison requires two different changes.",
  "Request body exceeds 12 MB.",
];

export function toPublicErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = issue?.path.at(-1);
    return typeof field === "string"
      ? `Check the ${humanize(field)} field and try again.`
      : "Check the submitted values and try again.";
  }

  if (error instanceof SyntaxError) {
    return "The request body is not valid JSON.";
  }

  if (error instanceof Error && safeBusinessErrors.includes(error.message)) {
    return error.message;
  }

  return genericPublicError;
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}
