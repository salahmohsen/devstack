/** oRPC / fetch / files-sdk 401s thrown from download routes. */
export function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string; name?: string; message?: string };
  if (e.status === 401 || e.code === "UNAUTHORIZED") return true;
  if (e.name === "HTTPError" && /401|unauthor/i.test(`${e.status ?? ""} ${e.message ?? ""}`)) {
    return true;
  }
  return /unauthorized|not authenticated/i.test(e.message ?? "");
}
