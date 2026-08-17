import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Client HITL — opens the Today letter in the side panel.
 * Supervisor writes markdown; client opens the panel and hides the letter in chat.
 */
export const openDailyBriefTool = createTool({
  id: "open-daily-brief",
  description:
    "Open today's letter in the side panel. Pass the markdown you just wrote from getDailyBrief facts, in the current voice. After this tool, one short spoken line only — do not paste the letter, do not triage, do not findJobsNow.",
  inputSchema: z.object({
    markdown: z
      .string()
      .min(80)
      .describe("The full Today letter in the current character voice. Not a stub.")
  }),
  outputSchema: z.object({
    opened: z.boolean(),
    markdown: z.string()
  })
});
