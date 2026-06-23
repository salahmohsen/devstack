import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { type OrpcContext } from "@tsu-stack/core/ai/orpc-context";
import { getRepoFileContent } from "@tsu-stack/github";

export const fetchRepoReadmeTool = createTool({
  id: "fetch-repo-readme",
  description:
    "Fetch a single file from a GitHub repository owned by the portfolio owner. Returns the raw text or null if the file does not exist. Use when the user asks about a specific repo's description, agent docs, or other file.",
  inputSchema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    ref: z.string().default("HEAD"),
    path: z.string().default("README.md")
  }),
  outputSchema: z.object({
    content: z.string().nullable()
  }),
  execute: async (input, context) => {
    const orpcCtx = context.requestContext?.get?.("orpcContext") as OrpcContext | undefined;
    if (!orpcCtx) {
      throw new Error("fetchRepoReadmeTool: missing orpcContext in requestContext");
    }

    // Zod 4's `.default()` keeps the input type as `string | undefined` even
    // though the parsed value is always a string. Apply the default here so
    // we can pass a non-undefined value to the strict github signature.
    const ref: string = input.ref ?? "HEAD";
    const path: string = input.path ?? "README.md";

    const content = await getRepoFileContent({ path, repo: input.repo, ref }, orpcCtx);

    return { content };
  }
});
