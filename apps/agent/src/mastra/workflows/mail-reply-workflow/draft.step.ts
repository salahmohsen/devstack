import { RequestContext } from "@mastra/core/request-context";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  llmLogFields,
  MailReplyDraftInputSchema,
  MailReplyDraftOutputSchema
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { applyLlmToRequestContext, generateModelOption } from "#@/mastra/byo-model";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";

const LlmDraftSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(20_000)
});

/** Invalid structured output sentinel — safeParse fails so we stay fail-closed. */
const STRUCTURED_FALLBACK = {
  title: "",
  subject: "",
  bodyText: ""
} as const;

/** Tool chains (list → get → draft) need more wall clock than classify. */
const LLM_TIMEOUT_MS = 90_000;

/** Enough steps for a few CRM/profile tool calls then structured draft. */
const MAX_STEPS = 8;

/** Fail-closed draft when AI is unavailable (no heuristic success path). */
function failDraft(notes: string): z.infer<typeof MailReplyDraftOutputSchema> {
  return {
    title: "Reply draft unavailable",
    subject: "Re: (draft failed)",
    bodyText:
      "I could not generate an AI reply draft. Check Settings → AI (BYO key) and try again.",
    source: "llm",
    notes
  };
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "AbortError" || /abort/i.test(error.message);
  }
  if (typeof error === "string") {
    return /abort/i.test(error);
  }
  return false;
}

export const draftStep = createStep({
  id: "llm-reply-draft",
  description: "LLM structured reply draft only (no heuristic fallback)",
  inputSchema: MailReplyDraftInputSchema,
  outputSchema: MailReplyDraftOutputSchema,
  execute: async ({ inputData, mastra, abortSignal }) => {
    if (abortSignal?.aborted) return failDraft("llm:aborted");

    const agent = mastra?.getAgent("mailReplyAgent");
    if (!agent) {
      return failDraft("llm:agent_missing");
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
      return failDraft(skipNote ?? "llm:missing_byo");
    }

    const job = inputData.jobContext;
    const jobLine = job
      ? `Job context: ${[job.title, job.companyName].filter(Boolean).join(" @ ")}${
          job.stage ? ` (stage: ${job.stage})` : ""
        }`
      : "Job context: (none linked — use list-open-applications / get-application if the company is clear; profile tools only when useful)";

    const bodySnippet = inputData.bodyText.slice(0, 6_000);
    const prompt = `Draft a reply for this career email.

From: ${inputData.fromName} <${inputData.fromEmail}>
Subject: ${inputData.subject}
Labels: ${(inputData.labels ?? []).join(", ") || "(none)"}
${jobLine}

Preview: ${inputData.preview}

Body:
${bodySnippet}

Use CRM/profile tools only when needed for accurate job or career context. Never send email.
Return title, subject (with Re: when appropriate), and bodyText (plain text).`;

    const requestContext = new RequestContext();
    requestContext.set("userId", inputData.userId);
    // Agent default model is byoModelFromRequestContext (see harvest workflow).
    applyLlmToRequestContext(requestContext, inputData.llm);

    try {
      const result = await withTimeoutSignal(
        (signal) =>
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: LlmDraftSchema,
              // Schema parse failure → empty sentinel; we fail-closed via safeParse below.
              errorStrategy: "fallback",
              fallbackValue: STRUCTURED_FALLBACK
            },
            requestContext,
            maxSteps: MAX_STEPS,
            model,
            abortSignal: signal
          }),
        LLM_TIMEOUT_MS,
        `LLM timeout after ${LLM_TIMEOUT_MS / 1000}s`,
        abortSignal
      );

      if (abortSignal?.aborted) return failDraft("llm:aborted");

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
        return failDraft("llm:invalid_output");
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
      if (abortSignal?.aborted || isAbortError(error)) {
        const log = createLogger({ operation: "agent__mail_reply_llm" });
        log.set({
          event: "mail_reply_llm_aborted",
          messageId: inputData.messageId,
          userId: inputData.userId,
          ...byo
        });
        log.emit({ _forceKeep: true });
        return failDraft("llm:aborted");
      }

      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = /timeout/i.test(msg);
      const log = createLogger({ operation: "agent__mail_reply_llm" });
      log.error(error instanceof Error ? error : new Error(msg), {
        event: isTimeout ? "mail_reply_llm_timeout" : "mail_reply_llm_error",
        messageId: inputData.messageId,
        userId: inputData.userId,
        ...byo
      });
      log.emit({ _forceKeep: true });
      return failDraft(isTimeout ? "llm:timeout" : `llm:error:${msg.slice(0, 120)}`);
    }
  }
});
