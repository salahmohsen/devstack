import { RequestContext } from "@mastra/core/request-context";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  heuristicMailReplyDraft,
  llmLogFields,
  MailReplyDraftInputSchema,
  MailReplyDraftOutputSchema
} from "@tsu-stack/core";
import { createLogger } from "@tsu-stack/logger/server";

import { generateModelOption } from "#@/mastra/byo-model";

const LlmDraftSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(20_000)
});

const LLM_TIMEOUT_MS = 45_000;

export const draftStep = createStep({
  id: "llm-reply-draft",
  description: "LLM structured reply draft with CRM tools + heuristic fallback",
  inputSchema: MailReplyDraftInputSchema,
  outputSchema: MailReplyDraftOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => {
    const fallback = heuristicMailReplyDraft(inputData);

    if (abortSignal?.aborted) return fallback;

    const agent = mastra?.getAgent("mailReplyAgent");
    if (!agent) {
      return { ...fallback, notes: "llm:agent_missing" };
    }

    const byo = llmLogFields(inputData.llm);
    const { model, skipNote } = generateModelOption(inputData.llm);
    if (!model) {
      const log = createLogger({ operation: "agent__mail_reply_llm" });
      log.set({
        event: "mail_reply_llm_skipped",
        reason: skipNote ?? "llm:missing_byo",
        messageId: inputData.messageId,
        userId: inputData.userId,
        ...byo
      });
      log.emit();
      return { ...fallback, notes: skipNote ?? "llm:missing_byo" };
    }

    const job = inputData.jobContext;
    const jobLine = job
      ? `Job context: ${[job.title, job.companyName].filter(Boolean).join(" @ ")}${
          job.stage ? ` (stage: ${job.stage})` : ""
        }`
      : "Job context: (none linked — you may use list-open-applications if the company is clear)";

    const bodySnippet = inputData.bodyText.slice(0, 6_000);
    const prompt = `Draft a reply for this career email.

From: ${inputData.fromName} <${inputData.fromEmail}>
Subject: ${inputData.subject}
Labels: ${(inputData.labels ?? []).join(", ") || "(none)"}
${jobLine}

Preview: ${inputData.preview}

Body:
${bodySnippet}

Return title, subject (with Re: when appropriate), and bodyText (plain text).`;

    const requestContext = new RequestContext();
    requestContext.set("userId", inputData.userId);

    try {
      const result = await Promise.race([
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: { schema: LlmDraftSchema },
          requestContext,
          maxSteps: 4,
          model
        }),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`LLM timeout after ${LLM_TIMEOUT_MS / 1000}s`)),
            LLM_TIMEOUT_MS
          );
        })
      ]);

      const parsed = LlmDraftSchema.safeParse(result.object);
      if (!parsed.success) {
        const log = createLogger({ operation: "agent__mail_reply_llm" });
        log.set({
          event: "mail_reply_llm_invalid_output",
          messageId: inputData.messageId,
          userId: inputData.userId,
          ...byo
        });
        log.emit({ _forceKeep: true });
        return { ...fallback, notes: "llm:invalid_output" };
      }

      const log = createLogger({ operation: "agent__mail_reply_llm" });
      log.set({
        event: "mail_reply_llm_ok",
        messageId: inputData.messageId,
        userId: inputData.userId,
        bodyLength: parsed.data.bodyText.trim().length,
        ...byo
      });
      log.emit();

      return {
        title: parsed.data.title.trim().slice(0, 200),
        subject: parsed.data.subject.trim().slice(0, 500),
        bodyText: parsed.data.bodyText.trim().slice(0, 20_000),
        source: "llm" as const,
        notes: "llm:ok"
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const log = createLogger({ operation: "agent__mail_reply_llm" });
      log.error(error instanceof Error ? error : new Error(msg), {
        event: "mail_reply_llm_error",
        messageId: inputData.messageId,
        userId: inputData.userId,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return {
        ...fallback,
        notes: `llm:error:${msg.slice(0, 120)}`
      };
    }
  }
});
