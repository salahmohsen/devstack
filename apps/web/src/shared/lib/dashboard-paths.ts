/** Hub agent chat (main dashboard home). */
export const DASHBOARD_AGENT_PATH = "/dashboard/agent" as const;

/** Any path under the authenticated dashboard shell. */
export function isDashboardPath(pathname: string): boolean {
  const path = normalizeDashboardPath(pathname);
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

/** True on the main hub agent chat (not floater routes). */
export function isDashboardAgentPath(pathname: string): boolean {
  return normalizeDashboardPath(pathname) === DASHBOARD_AGENT_PATH;
}

function normalizeDashboardPath(pathname: string): string {
  if (!pathname) return "/";
  const trimmed = pathname.split("?")[0] ?? pathname;
  if (trimmed.length > 1 && trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed || "/";
}
