import { createStep, createWorkflow } from "@mastra/core/workflows";

import {
  AiCorrectionFewShotExampleSchema,
  MailClassifyInputSchema,
  MailClassifyOutputSchema,
  MailProcessInputSchema,
  MailProcessOutputSchema,
  type MailProcessBranch,
  type MailProcessInput,
  type MailSystemLabel
} from "@tsu-stack/core";

import { aiClassifyStep } from "#@/mastra/workflows/mail-classify-workflow/ai.step";

const CRM_LABELS = new Set<MailSystemLabel>([
  "application",
  "application_status",
  "recruiter",
  "interview",
  "offer"
]);

function branchFromSystemLabels(systemLabels: readonly MailSystemLabel[]): MailProcessBranch {
  if (systemLabels.includes("job_notifier")) return "harvest";
  if (systemLabels.some((l) => CRM_LABELS.has(l))) return "crm";
  if (systemLabels.includes("noise")) return "noise";
  return "none";
}

/**
 * Adapt process input → classify input.
 * Drops process-only fields (forceReprocess, bodyHtml); normalizes empty fromEmail.
 */
const processToClassifyInput = createStep({
  id: "process-to-classify-input",
  description: "Map mail-process input onto mail-classify input",
  inputSchema: MailProcessInputSchema,
  outputSchema: MailClassifyInputSchema,
  execute: async ({ inputData }) => {
    const fewShotCorrections = (inputData.fewShotCorrections ?? []).flatMap((item) => {
      const parsed = AiCorrectionFewShotExampleSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });

    return {
      messageId: inputData.messageId,
      userId: inputData.userId,
      fromName: inputData.fromName,
      fromEmail: inputData.fromEmail || "unknown@invalid",
      subject: inputData.subject,
      preview: inputData.preview,
      bodyText: inputData.bodyText,
      labels: inputData.labels,
      smartRules: inputData.smartRules,
      fewShotCorrections,
      llm: inputData.llm
    };
  }
});

/**
 * Map classify output → process output with branch signal for server/hub.
 * messageId/userId come from workflow init (process input).
 */
const classifyToProcessOutput = createStep({
  id: "classify-to-process-output",
  description: "Map classify result to process output and choose harvest | crm | noise | none",
  inputSchema: MailClassifyOutputSchema,
  outputSchema: MailProcessOutputSchema,
  execute: async (ctx) => {
    const { inputData } = ctx;
    const init = ctx.getInitData() as MailProcessInput;
    const systemLabels = inputData.systemLabels ?? [];

    return {
      messageId: init.messageId,
      userId: init.userId,
      labels: inputData.labels,
      systemLabels,
      branch: branchFromSystemLabels(systemLabels),
      classifyNotes: inputData.notes,
      confidence: inputData.confidence
    };
  }
});

/**
 * Unified mail process: shared AI classify → branch signal for server/hub.
 * DB writes (CRM apply, harvest enqueue) stay on the server so queues and hub share effects.
 */
export const mailProcessWorkflow = createWorkflow({
  id: "mail-process-workflow",
  inputSchema: MailProcessInputSchema,
  outputSchema: MailProcessOutputSchema
})
  .then(processToClassifyInput)
  .then(aiClassifyStep)
  .then(classifyToProcessOutput);

mailProcessWorkflow.commit();
