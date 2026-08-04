import { createWorkflow } from "@mastra/core/workflows";

import { MailClassifyInputSchema, MailClassifyOutputSchema } from "@tsu-stack/core";

import { aiClassifyStep } from "#@/mastra/workflows/mail-classify-workflow/ai.step";

/**
 * Career Inbox classify: **AI agent + mail-classification skill only**.
 * No keyword/heuristic prefilter. CRM effects run on the server after labels land.
 */
export const mailClassifyWorkflow = createWorkflow({
  id: "mail-classify-workflow",
  inputSchema: MailClassifyInputSchema,
  outputSchema: MailClassifyOutputSchema
}).then(aiClassifyStep);

mailClassifyWorkflow.commit();
