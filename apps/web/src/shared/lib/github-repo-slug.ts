const INVALID_SLUGS = new Set(["undefined", "null", "NaN"]);

/** GitHub repository name segment (not `owner/repo`). */
const REPO_SLUG_RE = /^[A-Za-z0-9._-]+$/;

/**
 * True when `repo` is a plausible GitHub repo name for `/repos/$repo` and RPC.
 * Rejects empty values and stringified missing values (`"undefined"`).
 */
export function isValidGithubRepoSlug(repo: string | null | undefined): repo is string {
  if (typeof repo !== "string") return false;
  const name = repo.trim();
  if (!name || name.length > 100) return false;
  if (INVALID_SLUGS.has(name)) return false;
  return REPO_SLUG_RE.test(name);
}
