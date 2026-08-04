import { RequestContext } from "@mastra/core/di";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  assembleClassifyLabelsFromAi,
  enabledSmartRulesForClassify,
  formatCorrectionsFewShot,
  formatUserSmartFiltersSkillInstructions,
  llmLogFields,
  MAIL_SYSTEM_LABELS,
  MailClassifyInputSchema,
  MailClassifyOutputSchema,
  MailSystemLabelSchema,
  type MailSystemLabel
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { USER_SMART_FILTERS_CTX } from "#@/mastra/agents/mail-classifier-agent";
import { generateModelOption } from "#@/mastra/byo-model";

const LlmLabelSchema = z.object({
  systemLabel: MailSystemLabelSchema.nullable(),
  /** Slugs from user smart filters (with or without rule: prefix). */
  smartRuleSlugs: z.array(z.string()).optional().default([]),
  confidence: z.number().min(0).max(1).optional(),
  reason: z.string().optional()
});

const LLM_TIMEOUT_MS = 45_000;

/**
 * AI-only classification: system labels + user smart filters via skill injection.
 * No keyword/heuristic matching for either system or smart labels.
 */
export const aiClassifyStep = createStep({
  id: "ai-classify",
  description:
    "Mastra agent + mail-classification + dynamic user-smart-filters skills assign labels",
  inputSchema: MailClassifyInputSchema,
  outputSchema: MailClassifyOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => {
    const fewShotCount = inputData.fewShotCorrections?.length ?? 0;
    const byo = llmLogFields(inputData.llm);
    const smartRules = enabledSmartRulesForClassify(inputData.smartRules);

    const empty = (notes: string): z.infer<typeof MailClassifyOutputSchema> => {
      const preserved = inputData.labels.filter(
        (l) => !(MAIL_SYSTEM_LABELS as readonly string[]).includes(l)
      );
      return {
        labels: preserved,
        systemLabels: [],
        source: "llm",
        confidence: 0,
        notes
      };
    };

    if (abortSignal?.aborted) {
      return empty("llm:aborted");
    }

    const agent = mastra?.getAgent("mailClassifierAgent");
    if (!agent) {
      return empty("llm:agent_missing");
    }

    const { model, skipNote } = generateModelOption(inputData.llm);
    if (!model) {
      const log = createLogger({ operation: "agent__mail_classify_llm" });
      log.set({
        event: "mail_classify_llm_skipped",
        reason: skipNote ?? "llm:missing_byo",
        messageId: inputData.messageId,
        userId: inputData.userId,
        smartFilterCount: smartRules.length,
        ...byo
      });
      log.emit();
      return empty(skipNote ?? "llm:missing_byo");
    }

    const bodySnippet = (inputData.bodyText ?? "").slice(0, 10_000);
    const fewShot = formatCorrectionsFewShot(inputData.fewShotCorrections ?? []);
    const filtersBlock =
      smartRules.length > 0
        ? `\n\n--- USER SMART FILTERS (also available as user-smart-filters skill) ---\n${formatUserSmartFiltersSkillInstructions(smartRules)}\n--- END FILTERS ---\n`
        : `\nNo user smart filters for this tenant. smartRuleSlugs must be [].\n`;

    const prompt = `Classify this Career Inbox email.

1. Activate **mail-classification** for the system label.
2. Activate **user-smart-filters** when present and decide smartRuleSlugs.

From: ${inputData.fromName} <${inputData.fromEmail}>
Subject: ${inputData.subject}
Preview: ${inputData.preview}

Body:
${bodySnippet}
${filtersBlock}
Return:
- systemLabel: one of ${MAIL_SYSTEM_LABELS.join(", ")} — or null
- smartRuleSlugs: zero or more slugs from the user filters list (e.g. ["airbnb"] not invented names)
${fewShot ? `\n${fewShot}` : ""}`;

    const requestContext = new RequestContext();
    requestContext.set(USER_SMART_FILTERS_CTX, smartRules);

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: LlmLabelSchema },
          model,
          requestContext
        }),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`LLM timeout after ${LLM_TIMEOUT_MS / 1000}s`)),
            LLM_TIMEOUT_MS
          );
        })
      ]);

      const parsed = LlmLabelSchema.safeParse(result.object);
      if (!parsed.success) {
        const log = createLogger({ operation: "agent__mail_classify_llm" });
        log.set({
          event: "mail_classify_llm_invalid_output",
          messageId: inputData.messageId,
          userId: inputData.userId,
          ...byo
        });
        log.emit({ _forceKeep: true });
        return empty("llm:invalid_output");
      }

      const system = parsed.data.systemLabel;
      const systemLabels: MailSystemLabel[] = system ? [system] : [];
      const labels = assembleClassifyLabelsFromAi({
        systemLabels,
        smartRuleSlugs: parsed.data.smartRuleSlugs ?? [],
        smartRules,
        existingLabels: inputData.labels
      });

      const smartApplied = labels.filter((l) => l.startsWith("rule:"));

      const log = createLogger({ operation: "agent__mail_classify_llm" });
      log.set({
        event: "mail_classify_llm_ok",
        messageId: inputData.messageId,
        userId: inputData.userId,
        systemLabels,
        smartRuleLabels: smartApplied,
        smartFilterCount: smartRules.length,
        confidence: parsed.data.confidence ?? null,
        fewShotCount,
        ...byo
      });
      log.emit();

      return {
        labels,
        systemLabels,
        source: "llm" as const,
        confidence: parsed.data.confidence,
        notes: [
          parsed.data.reason ? `llm:${parsed.data.reason}` : system ? `llm:${system}` : "llm:none",
          smartApplied.length > 0 ? `smart:${smartApplied.join(",")}` : null
        ]
          .filter(Boolean)
          .join(";")
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const log = createLogger({ operation: "agent__mail_classify_llm" });
      log.error(error instanceof Error ? error : new Error(msg), {
        event: "mail_classify_llm_error",
        messageId: inputData.messageId,
        userId: inputData.userId,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return empty(`llm:error:${msg.slice(0, 120)}`);
    }
  }
});
