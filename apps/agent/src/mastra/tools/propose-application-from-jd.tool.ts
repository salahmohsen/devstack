import { createTool } from "@mastra/core/tools";

import {
  ProposeApplicationFromJdInputSchema,
  ProposeApplicationFromJdOutputSchema
} from "@tsu-stack/core";

/**
 * Client HITL tool — structured JD proposal for the UI card.
 *
 * **No `execute`:** the agent loop must suspend so the hub UI can show the card
 * and resume via AI SDK `addToolOutput` (`package` | `save` | `dismiss`).
 * A server `execute` that returns dismiss immediately races the card and can
 * leave completed tool parts that (with a broad sendAutomaticallyWhen) restart
 * the chat.
 *
 * Never write CRM rows here — only `create-application` after user choice.
 */
export const proposeApplicationFromJdTool = createTool({
  id: "propose-application-from-jd",
  description:
    "Propose a job application parsed from a JD. Wait for user button: package | save | dismiss. After calling this tool, write no user-facing text — the card is the confirmation UI. Do not invent CRM rows without this confirmation.",
  inputSchema: ProposeApplicationFromJdInputSchema,
  outputSchema: ProposeApplicationFromJdOutputSchema
});
