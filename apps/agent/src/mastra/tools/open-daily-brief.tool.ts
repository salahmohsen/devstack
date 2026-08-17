import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Client HITL — opens the Today letter in the side panel.
 * Supervisor writes markdown; client opens the panel and hides the letter in chat.
 */
export const openDailyBriefTool = createTool({
  id: "open-daily-brief",
  description:
    "Open today's letter in the side panel. Pass the markdown returned by getDailyBrief. Do not rewrite it. After this tool, one short spoken line only — do not paste the letter, do not triage, do not findJobsNow.",
  inputSchema: z.object({
    markdown: z
      .string()
      .min(20)
      .describe("The markdown returned by getDailyBrief. Includes short nothing-new letters.")
  }),
  outputSchema: z.object({
    opened: z.boolean(),
    markdown: z.string()
  })
});
