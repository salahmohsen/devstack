/**
 * Parse a GitHub repository URL or owner/repo slug into { owner, name }.
 * Returns null when not a recognizable github.com repo URL/slug.
 */
export function parseGithubRepoUrl(input: string): { owner: string; name: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare owner/repo
  const bare = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (bare && !raw.includes("://") && !raw.includes("github.com")) {
    return { owner: bare[1], name: bare[2].replace(/\.git$/, "") };
  }

  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withScheme);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const name = parts[1].replace(/\.git$/, "");
    if (!owner || !name) return null;
    return { owner, name };
  } catch {
    return null;
  }
}
