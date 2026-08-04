import { RequestContext } from "@mastra/core/di";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import {
  assembleClassifyLabelsFromAi,
  enabledSmartRulesForClassify,
  formatCorrectionsFewShot,
  formatUserSmartFiltersSkillInstructions,
  MAIL_SYSTEM_LABELS,
  MailProcessInputSchema,
  MailProcessOutputSchema,
  MailSystemLabelSchema,
  type MailProcessBranch,
  type MailSystemLabel
} from "@tsu-stack/core";

import { USER_SMART_FILTERS_CTX } from "#@/mastra/agents/mail-classifier-agent";
import { generateModelOption } from "#@/mastra/byo-model";

const LlmLabelSchema = z.object({
  systemLabel: MailSystemLabelSchema.nullable(),
  smartRuleSlugs: z.array(z.string()).optional().default([]),
  confidence: z.number().min(0).max(1).optional(),
  reason: z.string().optional()
});

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
 * Unified mail process: AI classify (+ smart filters) → branch signal for server/hub.
 * DB writes (CRM apply, harvest enqueue) stay on the server so queues and hub share effects.
 */
const classifyAndBranchStep = createStep({
  id: "classify-and-branch",
  description: "AI classify mail and choose harvest | crm | noise | none branch",
  inputSchema: MailProcessInputSchema,
  outputSchema: MailProcessOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const base = {
      messageId: inputData.messageId,
      userId: inputData.userId,
      labels: inputData.labels ?? [],
      systemLabels: [] as MailSystemLabel[],
      branch: "none" as MailProcessBranch
    };

    const agent = mastra?.getAgent("mailClassifierAgent");
    const { model, skipNote } = generateModelOption(inputData.llm);
    if (!agent || !model) {
      return {
        ...base,
        classifyNotes: skipNote ?? "mail_process:classifier_unavailable",
        confidence: 0
      };
    }

    const smartRules = enabledSmartRulesForClassify(inputData.smartRules);
    const bodySnippet = (inputData.bodyText ?? "").slice(0, 10_000);
    // fewShot may be unknown[] from process input — format only if structured
    const fewShotRaw = inputData.fewShotCorrections ?? [];
    const fewShot =
      Array.isArray(fewShotRaw) && fewShotRaw.length > 0
        ? formatCorrectionsFewShot(fewShotRaw as never)
        : "";

    const filtersBlock =
      smartRules.length > 0
        ? `\n\n--- USER SMART FILTERS ---\n${formatUserSmartFiltersSkillInstructions(smartRules)}\n--- END ---\n`
        : "\nNo user smart filters. smartRuleSlugs must be [].\n";

    const prompt = `Classify this Career Inbox email for the unified mail-process pipeline.

Activate mail-classification and user-smart-filters (if present).

From: ${inputData.fromName} <${inputData.fromEmail}>
Subject: ${inputData.subject}
Preview: ${inputData.preview}

Body:
${bodySnippet}
${filtersBlock}
Return systemLabel (one of ${MAIL_SYSTEM_LABELS.join(", ")} or null) and smartRuleSlugs.
${fewShot ? `\n${fewShot}` : ""}`;

    const requestContext = new RequestContext();
    requestContext.set(USER_SMART_FILTERS_CTX, smartRules);

    try {
      const result = await agent.generate([{ role: "user", content: prompt }], {
        structuredOutput: { schema: LlmLabelSchema },
        model,
        requestContext
      });
      const parsed = LlmLabelSchema.safeParse(result.object);
      if (!parsed.success) {
        return { ...base, classifyNotes: "mail_process:invalid_classify_output", confidence: 0 };
      }

      const system = parsed.data.systemLabel;
      const systemLabels: MailSystemLabel[] = system ? [system] : [];
      const labels = assembleClassifyLabelsFromAi({
        systemLabels,
        smartRuleSlugs: parsed.data.smartRuleSlugs ?? [],
        smartRules,
        existingLabels: inputData.labels
      });
      const branch = branchFromSystemLabels(systemLabels);

      return {
        messageId: inputData.messageId,
        userId: inputData.userId,
        labels,
        systemLabels,
        branch,
        classifyNotes: parsed.data.reason
          ? `llm:${parsed.data.reason}`
          : system
            ? `llm:${system}`
            : "llm:none",
        confidence: parsed.data.confidence
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ...base,
        classifyNotes: `mail_process:error:${msg.slice(0, 120)}`,
        confidence: 0
      };
    }
  }
});

export const mailProcessWorkflow = createWorkflow({
  id: "mail-process-workflow",
  inputSchema: MailProcessInputSchema,
  outputSchema: MailProcessOutputSchema
}).then(classifyAndBranchStep);

mailProcessWorkflow.commit();
