import { createWorkflow } from "@mastra/core/workflows";

import { MailReplyDraftInputSchema, MailReplyDraftOutputSchema } from "@tsu-stack/core";

import { draftStep } from "#@/mastra/workflows/mail-reply-workflow/draft.step";

/**
 * Career Inbox reply draft: Mastra agent with structured output only (AI fail-closed).
 * Assist/Full autonomy + send are product-layer (review queue / confirm).
 */
export const mailReplyWorkflow = createWorkflow({
  id: "mail-reply-workflow",
  inputSchema: MailReplyDraftInputSchema,
  outputSchema: MailReplyDraftOutputSchema
}).then(draftStep);

mailReplyWorkflow.commit();
