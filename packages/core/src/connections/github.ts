/**
 * Human-readable access line from a GitHub OAuth scope string
 * (space- or comma-separated, as Better Auth stores it).
 */
export function formatGithubAccessSummary(scope: string | null | undefined): string | null {
  if (!scope?.trim()) return null;
  const set = new Set(
    scope
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (set.size === 0) return null;

  const parts: string[] = [];
  if (set.has("repo")) parts.push("private repos");
  else if (set.has("public_repo")) parts.push("public repos");
  if (set.has("user") || set.has("read:user") || set.has("user:email")) {
    parts.push("profile");
  }
  if (set.has("read:org") || set.has("write:org") || set.has("admin:org")) {
    parts.push("orgs");
  }
  if (set.has("workflow")) parts.push("actions");
  if (set.has("gist")) parts.push("gists");

  if (parts.length === 0) return `${set.size} scopes granted`;
  const [first, ...rest] = parts;
  const headed = first!.charAt(0).toUpperCase() + first!.slice(1);
  if (rest.length === 0) return headed;
  if (rest.length === 1) return `${headed} and ${rest[0]}`;
  return `${headed}, ${rest.slice(0, -1).join(", ")}, and ${rest[rest.length - 1]}`;
}
