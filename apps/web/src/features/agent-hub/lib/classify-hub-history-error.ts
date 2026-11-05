export type HubHistoryErrorKind = "auth" | "transient";

/** A 401/403 means the session is gone; anything else is worth another try. */
export function classifyHubHistoryError(error: unknown): HubHistoryErrorKind {
  if (!error || typeof error !== "object") return "transient";
  const e = error as { status?: unknown; code?: unknown; message?: unknown };
  if (e.status === 401 || e.status === 403) return "auth";
  if (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN") return "auth";
  if (
    typeof e.message === "string" &&
    /\b(unauthorized|not authenticated|session expired)\b/i.test(e.message)
  ) {
    return "auth";
  }
  return "transient";
}
