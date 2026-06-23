import { type RepoRecentCommit } from "#@/schemas";

export function mapRepoRecentCommits(data: unknown): RepoRecentCommit[] {
  if (!Array.isArray(data)) return [];

  const out: RepoRecentCommit[] = [];
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;

    const sha = "sha" in entry && typeof entry.sha === "string" ? entry.sha : null;
    const commitObj =
      "commit" in entry && typeof entry.commit === "object" && entry.commit !== null
        ? entry.commit
        : null;
    const message =
      commitObj && "message" in commitObj && typeof commitObj.message === "string"
        ? commitObj.message
        : null;
    // GitHub user `login` lives on the top-level `author` field, not on
    // `commit.author` (which is the Git commit author with name/email/date).
    // See `mapGitHubRepoLatestCommit` in `repo-ref-commit.utils.ts`.
    const userObj =
      "author" in entry && typeof entry.author === "object" && entry.author !== null
        ? entry.author
        : null;
    const authorLogin =
      userObj && "login" in userObj && typeof (userObj as { login?: unknown }).login === "string"
        ? (userObj as { login: string }).login
        : null;
    const authorObj =
      commitObj &&
      "author" in commitObj &&
      typeof commitObj.author === "object" &&
      commitObj.author !== null
        ? commitObj.author
        : null;
    const date =
      authorObj && "date" in authorObj && typeof (authorObj as { date?: unknown }).date === "string"
        ? (authorObj as { date: string }).date
        : null;

    if (!sha || !message || !date) continue;
    out.push({ sha, message, authorLogin, date: new Date(date) });
  }
  return out;
}
