import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { GetSearchBriefOutputSchema } from "@tsu-stack/core";

/**
 * Client ensureBrief. No server execute — agent must not import @tsu-stack/api.
 */
export const getSearchBriefTool = createTool({
  id: "get-search-brief",
  description:
    "Load the seeker's search brief (who I am / what I'm looking for / my job-search rules). Client calls jobPreference.ensureBrief and shows the File Diff card. Use when they ask what they want, their rules, identity, career/search brief, or after a preference change. structured is the column snapshot; markdown is narrative. previousMarkdown is for thread File Diff only — never score from it.",
  inputSchema: z.object({}).describe("No arguments. Tenant is the session user."),
  outputSchema: GetSearchBriefOutputSchema
});
