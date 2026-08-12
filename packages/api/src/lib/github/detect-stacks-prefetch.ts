/**
 * GitHub prefetch for detect-stacks: list package.json paths and read contents
 * with private OAuth first. Kept out of agent.router to keep the router thin.
 */

import { type OrpcContext } from "@tsu-stack/core";
import {
  getPrivateRepoFileContent,
  getPrivateRepoTree,
  getRepoFileContent,
  getRepoTree,
  isGitHubAuthError
} from "@tsu-stack/github";

export const GITHUB_PRIVATE_AUTH_MESSAGE =
  "Could not access private GitHub repositories. Link GitHub under Settings with the `repo` scope, " +
  "then sign out and sign back in so the server can refresh your OAuth token " +
  "(tokens never leave the server).";

/** Max nested package.json files fetched per repo (rate-limit guard). */
export const DETECT_STACKS_MAX_NESTED_PKG_JSON = 80;

/**
 * Parse GitHub repo URL or `owner/name` slug → `owner/name`.
 * Strips `.git`, query/hash, and trailing path segments (`/tree/main`, …).
 */
export function parseGitHubRepo(url: string): string {
  const raw = url.trim();
  if (!raw) return raw;

  if (/^[^/\s]+\/[^/\s]+$/.test(raw)) {
    return raw.replace(/\.git$/i, "");
  }

  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = parsed.hostname.replace(/^www\./i, "");
    if (host === "github.com" || host.endsWith(".github.com")) {
      const parts = parsed.pathname
        .replace(/^\//, "")
        .replace(/\.git$/i, "")
        .split("/")
        .filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
  } catch {
    // fall through to regex
  }

  const match = raw.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (match?.[1] && match[2]) {
    return `${match[1]}/${match[2].replace(/\.git$/i, "")}`;
  }

  return raw.replace(/\.git$/i, "");
}

export function isPrivateAuthFailure(error: unknown): boolean {
  if (isGitHubAuthError(error)) return true;
  if (error instanceof Error && error.name === "GitHubPrivateAuthError") return true;
  return false;
}

/**
 * Detect default branch. Prefers private OAuth; auth failures propagate.
 */
export async function getDefaultBranch(repoSlug: string, context: OrpcContext): Promise<string> {
  const [owner, repo] = repoSlug.split("/");
  if (!owner || !repo) return "main";

  try {
    const { data } = await context.github.privateOctokit.rest.repos.get({ owner, repo });
    return (data.default_branch as string) || "main";
  } catch (error) {
    if (isPrivateAuthFailure(error)) throw error;
  }

  try {
    const { data } = await context.github.publicOctokit.rest.repos.get({ owner, repo });
    return (data.default_branch as string) || "main";
  } catch {
    return "main";
  }
}

/**
 * Read a file preferring private OAuth. Auth failures propagate; other private
 * errors fall through to public for open-source repos.
 */
export async function fetchRepoFilePreferPrivate(
  path: string,
  ref: string,
  repoSlug: string,
  context: OrpcContext
): Promise<string | null> {
  try {
    const privateResult = await getPrivateRepoFileContent({ path, ref, repo: repoSlug }, context);
    if (privateResult !== null) return privateResult;
  } catch (error) {
    if (isPrivateAuthFailure(error)) throw error;
  }

  return getRepoFileContent({ path, ref, repo: repoSlug }, context);
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/** Skip package.json under install/build noise. */
export function isIgnoredPackageJsonPath(pkgPath: string): boolean {
  return /(^|\/)(node_modules|dist|\.git|coverage|\.next|build|vendor|out|\.turbo|storybook-static)(\/|$)/.test(
    pkgPath
  );
}

/**
 * List every package.json path via recursive git tree (private first).
 * Falls back to shallow monorepo roots when the recursive tree is unavailable.
 */
export async function listPackageJsonPaths(
  repoSlug: string,
  defaultBranch: string,
  context: OrpcContext
): Promise<string[]> {
  const [owner, repo] = repoSlug.split("/");
  if (!owner || !repo) return [];

  const tryRecursive = async (
    octokit: OrpcContext["github"]["privateOctokit"],
    surface: "private" | "public"
  ) => {
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`
      });
      const commitSha = refData.object.sha;
      const { data: commit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commitSha
      });
      const { data: tree } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: commit.tree.sha,
        recursive: "true"
      });
      if (tree.truncated) return null;
      return (tree.tree ?? [])
        .filter(
          (t) =>
            t.type === "blob" &&
            typeof t.path === "string" &&
            (t.path === "package.json" || t.path.endsWith("/package.json"))
        )
        .map((t) => t.path as string);
    } catch (error) {
      if (surface === "private" && isPrivateAuthFailure(error)) throw error;
      return null;
    }
  };

  const privatePaths = await tryRecursive(context.github.privateOctokit, "private");
  if (privatePaths) return privatePaths;
  const publicPaths = await tryRecursive(context.github.publicOctokit, "public");
  if (publicPaths) return publicPaths;

  const fetchTree = async (path: string) => {
    try {
      const privateResult = await getPrivateRepoTree(
        { path, ref: defaultBranch, repo: repoSlug },
        context
      );
      if (privateResult.length > 0) return privateResult;
    } catch (error) {
      if (isPrivateAuthFailure(error)) throw error;
    }
    return getRepoTree({ path, ref: defaultBranch, repo: repoSlug }, context);
  };

  const paths: string[] = [];
  for (const base of ["apps", "packages", "tools", "libs", "services", "modules"]) {
    const entries = await fetchTree(base);
    for (const entry of entries) {
      if (entry.type === "dir") {
        paths.push(`${entry.path}/package.json`);
      } else if (entry.type === "file" && entry.name === "package.json") {
        paths.push(entry.path);
      }
    }
  }
  return paths;
}

export type NestedPackageJson = { workspace: string; content: string };

/**
 * Fetch every nested package.json (root is handled separately by the caller).
 * Returns truncated: true when more than DETECT_STACKS_MAX_NESTED_PKG_JSON paths existed.
 */
export async function resolveAllNestedPackageJsons(
  repoSlug: string,
  defaultBranch: string,
  context: OrpcContext
): Promise<{ packages: NestedPackageJson[]; truncated: boolean; totalPaths: number }> {
  const allPkgPaths = await listPackageJsonPaths(repoSlug, defaultBranch, context);

  const nestedPaths = [
    ...new Set(
      allPkgPaths.filter(
        (pkgPath) => pkgPath !== "package.json" && !isIgnoredPackageJsonPath(pkgPath)
      )
    )
  ];

  if (nestedPaths.length === 0) {
    return { packages: [], truncated: false, totalPaths: 0 };
  }

  const totalPaths = nestedPaths.length;
  const truncated = totalPaths > DETECT_STACKS_MAX_NESTED_PKG_JSON;
  const capped = nestedPaths.slice(0, DETECT_STACKS_MAX_NESTED_PKG_JSON);
  const fetched = await mapPool(capped, 6, async (pkgPath) => {
    const content = await fetchRepoFilePreferPrivate(pkgPath, defaultBranch, repoSlug, context);
    if (!content?.trim()) return null;
    return { content, path: pkgPath };
  });

  const results: NestedPackageJson[] = [];
  const seen = new Set<string>();
  for (const row of fetched) {
    if (!row) continue;
    const label = row.path.replace(/\/package\.json$/, "");
    if (seen.has(label)) continue;
    seen.add(label);
    results.push({ workspace: label, content: row.content });
  }

  return { packages: results, truncated, totalPaths };
}

export type PrefetchedRepoPackages = {
  repo: string;
  rootPkgContent: string | null;
  workspaceYamlContent: string | null;
  workspacePkgContents: NestedPackageJson[];
  nestedTruncated: boolean;
  nestedTotalPaths: number;
};

/**
 * Prefetch root + nested package.json for one repo URL (private OAuth first).
 */
export async function prefetchRepoPackageJsons(
  repoUrl: string,
  context: OrpcContext,
  signal?: AbortSignal
): Promise<PrefetchedRepoPackages> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const repoSlug = parseGitHubRepo(repoUrl);
  const defaultBranch = await getDefaultBranch(repoSlug, context);

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const rootPkgContent = await fetchRepoFilePreferPrivate(
    "package.json",
    defaultBranch,
    repoSlug,
    context
  );

  const workspaceYamlContent = rootPkgContent
    ? await fetchRepoFilePreferPrivate("pnpm-workspace.yaml", defaultBranch, repoSlug, context)
    : null;

  const nested = await resolveAllNestedPackageJsons(repoSlug, defaultBranch, context);

  return {
    repo: repoUrl,
    rootPkgContent,
    workspaceYamlContent,
    workspacePkgContents: nested.packages,
    nestedTruncated: nested.truncated,
    nestedTotalPaths: nested.totalPaths
  };
}
