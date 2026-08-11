import { createTool } from "@mastra/core/tools";

import {
  ProposeApplicationFromJdInputSchema,
  ProposeApplicationFromJdOutputSchema
} from "@tsu-stack/core";

/**
 * Client HITL tool — structured JD proposal for the UI card.
 *
 * The UI provides the real result via AI SDK `addToolOutput`
 * (`package` | `save` | `dismiss`). Server `execute` is a safety fallback only
 * and must not write CRM rows.
 */
export const proposeApplicationFromJdTool = createTool({
  id: "propose-application-from-jd",
  description:
    "Propose a job application parsed from a JD. Wait for user button: package | save | dismiss. Do not invent CRM rows without this confirmation.",
  inputSchema: ProposeApplicationFromJdInputSchema,
  outputSchema: ProposeApplicationFromJdOutputSchema,
  execute: async () => {
    // Should not run when AI SDK handles client tool; safety fallback
    return { action: "dismiss" as const };
  }
});
