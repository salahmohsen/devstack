import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { type OrpcContext } from "@tsu-stack/core/ai/orpc-context";
import { getRepoRecentCommits } from "@tsu-stack/github";

import { orpcContextStorage } from "#@/lib/orpc-context-storage";

const commitOutputSchema = z.object({
  sha: z.string(),
  message: z.string(),
  authorLogin: z.string().nullable(),
  date: z.coerce.date()
});
type CommitOutput = z.infer<typeof commitOutputSchema>;

export const listRecentCommitsTool = createTool({
  id: "list-recent-commits",
  description:
    "List the N most recent commits on a repository, including messages and author logins. Use when the user asks what they've been working on lately in a specific repo.",
  inputSchema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    perPage: z.number().int().min(1).max(30).default(10)
  }),
  outputSchema: z.object({
    commits: z.array(commitOutputSchema)
  }),
  execute: async (input, context) => {
    // See note in fetch-repo-readme.tool.ts — the Hono requestContext is
    // overwritten by the Mastra adapter, so fall back to the bridge.
    const orpcCtx =
      (context.requestContext?.get?.("orpcContext") as OrpcContext | undefined) ??
      orpcContextStorage.getStore();
    if (!orpcCtx) {
      throw new Error("listRecentCommitsTool: missing orpcContext in requestContext");
    }

    const commits = await getRepoRecentCommits(
      { owner: input.owner, repo: input.repo, perPage: input.perPage ?? 10 },
      orpcCtx
    );

    const out: CommitOutput[] = commits.map((c) => {
      return {
        sha: c.sha,
        message: c.message,
        authorLogin: c.authorLogin,
        date: c.date
      };
    });

    return { commits: out };
  }
});
