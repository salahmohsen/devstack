import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { type OrpcContext } from "@tsu-stack/core/ai/orpc-context";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import {
  getPrivateProfileRepos,
  getPrivateRepoFileContent,
  getRepoRecentCommits
} from "@tsu-stack/github";

import { orpcContextStorage } from "#@/lib/orpc-context-storage";

const RepoContextSchema = z.object({
  owner: z.string(),
  name: z.string(),
  readme: z.string().nullable(),
  agentDocs: z.record(z.string(), z.string().nullable()),
  recentCommits: z.array(
    z.object({
      sha: z.string(),
      message: z.string(),
      date: z.coerce.date()
    })
  )
});

const DEFAULT_FILES = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  ".github/copilot-instructions.md",
  "package.json"
];

function parseFileList(): string[] {
  const raw = ENV_SERVER.MASTRA_GITHUB_FILE_GLOBS;
  if (!raw) return DEFAULT_FILES;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_FILES;
}

type FetchFile = (owner: string, repo: string, path: string) => Promise<string | null>;
type FetchCommits = (
  owner: string,
  repo: string,
  perPage: number
) => Promise<Array<{ sha: string; message: string; date: Date }>>;
type ListRepos = () => Promise<Array<{ owner: string; name: string }>>;

/**
 * Two execution paths:
 * 1. Webhook path: Hono handler set `c.set("requestContext", ...)` (via the
 *    `/*` middleware in `apps/server/src/app.ts`) and the orpcContext lives at
 *    `requestContext.get("orpcContext")`. Uses the per-request Octokit, KV, and
 *    signal relay.
 * 2. Cron / no-context path: no orpcContext in requestContext. The
 *    `public-github-source` helper would supply an Octokit, but we don't have
 *    a "list public repos" helper yet. For v1, the step skips silently and
 *    returns an empty `repoContexts` array — the workflow still runs through
 *    the diff/write/reindex steps (with an empty input the diff returns no
 *    proposals and the workflow exits cleanly).
 *
 * As of fix #28, the read uses the same AsyncLocalStorage fallback as the
 * GitHub tools (#22): the Hono `/*` middleware wraps the request in an
 * `orpcContextStorage.run(context, ...)` scope, so even when the Mastra
 * `RequestContext` is built later and overwrites the Hono context, the
 * `OrpcContext` is reachable via `orpcContextStorage.getStore()`.
 *
 * Open TODO: add a "list public repos" helper in `packages/github/src/shared/`
 * so the cron path can populate `repoContexts`. The plan calls this out as a
 * follow-up.
 */
async function resolveSources(
  orpcCtx: OrpcContext | undefined
): Promise<{ listRepos: ListRepos; fetchFile: FetchFile; fetchCommits: FetchCommits }> {
  if (orpcCtx && orpcCtx.github.source.isConfigured) {
    return {
      fetchCommits: async (owner, repo, perPage) => {
        const commits = await getRepoRecentCommits({ owner, repo, perPage }, orpcCtx);
        return commits.map((c) => {
          return {
            sha: c.sha,
            date: c.date,
            message: c.message
          };
        });
      },
      fetchFile: async (_owner, repo, path) =>
        getPrivateRepoFileContent({ path, repo, ref: "HEAD" }, orpcCtx),
      listRepos: async () => {
        const profileRepos = await getPrivateProfileRepos(orpcCtx);
        return profileRepos.map((r) => {
          return { owner: r.owner, name: r.name };
        });
      }
    };
  }

  // Public / cron path — see the open TODO in the function-level comment.
  return {
    fetchCommits: async () => [],
    fetchFile: async () => null,
    listRepos: async () => []
  };
}

export const gatherSourcesStep = createStep({
  id: "gather-sources",
  inputSchema: z.object({
    commitSha: z.string().optional(),
    reason: z.string().default("scheduled")
  }),
  outputSchema: z.object({
    commitSha: z.string().optional(),
    reason: z.string(),
    repoContexts: z.array(RepoContextSchema)
  }),
  execute: async ({ inputData, requestContext }) => {
    const files = parseFileList();
    const orpcCtx =
      (requestContext?.get?.("orpcContext") as OrpcContext | undefined) ??
      orpcContextStorage.getStore();
    const { fetchCommits, fetchFile, listRepos } = await resolveSources(orpcCtx);

    const repos = await listRepos();

    const repoContexts = await Promise.all(
      repos.map(async (r) => {
        const [readme, ...docResults] = await Promise.all([
          fetchFile(r.owner, r.name, "README.md"),
          ...files
            .filter((f) => f !== "README.md")
            .map((f) => fetchFile(r.owner, r.name, f).then((c) => [f, c] as const))
        ]);
        const agentDocs: Record<string, string | null> = {};
        for (const [path, content] of docResults as Array<[string, string | null]>) {
          agentDocs[path] = content;
        }
        const recentCommits = await fetchCommits(r.owner, r.name, 10);
        return {
          agentDocs,
          name: r.name,
          owner: r.owner,
          readme,
          recentCommits
        };
      })
    );

    return {
      commitSha: inputData.commitSha,
      reason: inputData.reason,
      repoContexts
    };
  }
});
