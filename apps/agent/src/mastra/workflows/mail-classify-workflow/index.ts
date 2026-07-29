import { createWorkflow } from "@mastra/core/workflows";

import { MailClassifyInputSchema, MailClassifyOutputSchema } from "@tsu-stack/core";

import { heuristicStep } from "#@/mastra/workflows/mail-classify-workflow/heuristic.step";
import { llmStep } from "#@/mastra/workflows/mail-classify-workflow/llm.step";

/**
 * Career Inbox classify: cheap heuristic first, LLM only when weak/empty.
 * CRM effects + undo are later tickets — this workflow only decides labels.
 */
export const mailClassifyWorkflow = createWorkflow({
  id: "mail-classify-workflow",
  inputSchema: MailClassifyInputSchema,
  outputSchema: MailClassifyOutputSchema
})
  .then(heuristicStep)
  .then(llmStep);

mailClassifyWorkflow.commit();
