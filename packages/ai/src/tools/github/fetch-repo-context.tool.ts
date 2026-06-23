import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { type OrpcContext } from "@tsu-stack/core/ai/orpc-context";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { getRepoFileContent, getRepoRecentCommits } from "@tsu-stack/github";

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

export const fetchRepoContextTool = createTool({
  id: "fetch-repo-context",
  description:
    "Fetch the full context for a single repository: README, agent docs (AGENTS.md, CLAUDE.md, .cursorrules), and recent commits. Use when you need a comprehensive picture of one repo to ground content suggestions.",
  inputSchema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    ref: z.string().optional()
  }),
  outputSchema: z.object({
    files: z.record(z.string(), z.string().nullable()),
    commits: z.array(
      z.object({
        sha: z.string(),
        message: z.string(),
        authorLogin: z.string().nullable(),
        date: z.coerce.date()
      })
    )
  }),
  execute: async (input, context) => {
    const orpcCtx = context.requestContext?.get?.("orpcContext") as OrpcContext | undefined;
    if (!orpcCtx) {
      throw new Error("fetchRepoContextTool: missing orpcContext in requestContext");
    }

    const files: Record<string, string | null> = {};
    for (const path of parseFileList()) {
      const content = await getRepoFileContent(
        { path, repo: input.repo, ref: input.ref ?? "HEAD" },
        orpcCtx
      );
      files[path] = content;
    }

    const commits = await getRepoRecentCommits(
      { owner: input.owner, repo: input.repo, perPage: 10 },
      orpcCtx
    );

    return {
      files,
      commits: commits.map((c) => {
        return {
          sha: c.sha,
          message: c.message,
          authorLogin: c.authorLogin,
          date: c.date
        };
      })
    };
  }
});
