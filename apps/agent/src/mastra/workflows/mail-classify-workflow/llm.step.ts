import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  formatCorrectionsFewShot,
  llmLogFields,
  MAIL_SYSTEM_LABELS,
  MailClassifyOutputSchema,
  MailSystemLabelSchema,
  type MailSystemLabel
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { heuristicStep } from "#@/mastra/workflows/mail-classify-workflow/heuristic.step";

const LlmLabelSchema = z.object({
  systemLabel: MailSystemLabelSchema.nullable(),
  confidence: z.number().min(0).max(1).optional(),
  reason: z.string().optional()
});

const LLM_TIMEOUT_MS = 25_000;
/** Only spend LLM budget when heuristic found nothing. */
const HEURISTIC_CONFIDENCE_SKIP = 0.6;

export const llmStep = createStep({
  id: "llm-classify",
  description: "LLM structured labels when heuristic is empty or low confidence",
  inputSchema: heuristicStep.outputSchema,
  outputSchema: MailClassifyOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => {
    const { original, result: heuristic } = inputData;
    const fewShotCount = original.fewShotCorrections?.length ?? 0;

    // Strong heuristic hit — skip LLM only when we have no user corrections to teach.
    // Corrections must still reach the model so keyword-matched mail can be overridden.
    if (
      fewShotCount === 0 &&
      heuristic.systemLabels.length > 0 &&
      (heuristic.confidence ?? 0) >= HEURISTIC_CONFIDENCE_SKIP
    ) {
      return heuristic;
    }

    if (abortSignal?.aborted) {
      return heuristic;
    }

    const agent = mastra?.getAgent("mailClassifierAgent");
    if (!agent) {
      return {
        ...heuristic,
        notes: [heuristic.notes, "llm:agent_missing"].filter(Boolean).join(";")
      };
    }

    const byo = llmLogFields(original.llm);
    const { model, skipNote } = generateModelOption(original.llm);
    if (!model) {
      const log = createLogger({ operation: "agent__mail_classify_llm" });
      log.set({
        event: "mail_classify_llm_skipped",
        reason: skipNote ?? "llm:missing_byo",
        messageId: original.messageId,
        userId: original.userId,
        ...byo
      });
      log.emit();
      return {
        ...heuristic,
        notes: [heuristic.notes, skipNote ?? "llm:missing_byo"].filter(Boolean).join(";")
      };
    }

    const bodySnippet = original.bodyText.slice(0, 6_000);
    const fewShot = formatCorrectionsFewShot(original.fewShotCorrections ?? []);
    const prompt = `Classify this career inbox email.

From: ${original.fromName} <${original.fromEmail}>
Subject: ${original.subject}
Preview: ${original.preview}

Body:
${bodySnippet}

Return systemLabel as one of: ${MAIL_SYSTEM_LABELS.join(", ")} — or null if none fit.
Heuristic suggestion (may be empty): ${heuristic.systemLabels[0] ?? "(none)"} (${heuristic.notes ?? ""})
${fewShot ? `\n${fewShot}` : ""}`;

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: LlmLabelSchema },
          model
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
          messageId: original.messageId,
          userId: original.userId,
          ...byo
        });
        log.emit({ _forceKeep: true });
        return {
          ...heuristic,
          notes: [heuristic.notes, "llm:invalid_output"].filter(Boolean).join(";")
        };
      }

      const system = parsed.data.systemLabel;
      const preserved = original.labels.filter(
        (l) => !(MAIL_SYSTEM_LABELS as readonly string[]).includes(l)
      );
      const systemLabels: MailSystemLabel[] = system ? [system] : [];

      const log = createLogger({ operation: "agent__mail_classify_llm" });
      log.set({
        event: "mail_classify_llm_ok",
        messageId: original.messageId,
        userId: original.userId,
        systemLabels,
        confidence: parsed.data.confidence ?? null,
        fewShotCount,
        ...byo
      });
      log.emit();

      return {
        labels: [...systemLabels, ...preserved],
        systemLabels,
        source: "llm" as const,
        confidence: parsed.data.confidence,
        notes: parsed.data.reason
          ? `llm:${parsed.data.reason}`
          : system
            ? `llm:${system}`
            : "llm:none"
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const log = createLogger({ operation: "agent__mail_classify_llm" });
      log.error(error instanceof Error ? error : new Error(msg), {
        event: "mail_classify_llm_error",
        messageId: original.messageId,
        userId: original.userId,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return {
        ...heuristic,
        notes: [heuristic.notes, `llm:error:${msg.slice(0, 120)}`].filter(Boolean).join(";")
      };
    }
  }
});
