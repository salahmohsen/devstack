import { createTool } from "@mastra/core/tools";

import { ProposeMailCrmChangeInputSchema, ProposeMailCrmChangeOutputSchema } from "@tsu-stack/core";

/**
 * Client HITL — Confirm card writes track/create/applied or rejected close.
 * No server execute.
 */
export const proposeMailCrmChangeTool = createTool({
  id: "propose-mail-crm-change",
  description:
    "Propose a CRM write inferred from Career Inbox mail. One company+title (or listing URL). intent: track_applied (inbox row), create_applied (no row), set_stage (already tracked), close_rejected (latest CRM mail is a rejection). Wait for Confirm. After calling, write no user-facing text. Do not call updateApplicationStage for applied. job_notifier never uses this tool.",
  inputSchema: ProposeMailCrmChangeInputSchema,
  outputSchema: ProposeMailCrmChangeOutputSchema
});
