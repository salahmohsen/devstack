import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";

import {
  llmLogFields,
  type MailGenerateReplyOutput,
  type MailReplyDraftInput
} from "@tsu-stack/core";
import { applicationRepository, createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

import { createMailReplyAgent } from "#@/mastra/agents/mail-reply-agent";
import { applyLlmToRequestContext, generateModelOption } from "#@/mastra/byo-model";
import { resolveRuntimeAiCredentials } from "#@/mastra/lib/resolve-runtime-ai";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";

export type GenerateMailReplyErrorCode =
  | "NOT_FOUND"
  | "NOT_CAREER"
  | "AI_NOT_CONFIGURED"
  | "AGENT_FAILED";

export type GenerateMailReplyResult =
  | { ok: true; draft: MailGenerateReplyOutput }
  | { ok: false; code: GenerateMailReplyErrorCode; message?: string };

const LlmDraftSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(20_000)
});

const STRUCTURED_FALLBACK = {
  title: "",
  subject: "",
  bodyText: ""
} as const;

const LLM_TIMEOUT_MS = 90_000;
const MAX_STEPS = 8;

/**
 * Draft bare Career Inbox reply (no send, no PDF) — in-process mailReplyAgent.
 */
export async function generateMailReply(input: {
  messageId: string;
  userId: string;
}): Promise<GenerateMailReplyResult> {
  const db = createDb();
  const message = await runWithDb(db, () =>
    mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
      includeSystem: true
    })
  );
  if (!message) return { ok: false, code: "NOT_FOUND" };
  if (message.purpose === "system_notification") return { ok: false, code: "NOT_CAREER" };

  let jobContext: MailReplyDraftInput["jobContext"] = null;
  if (message.applicationId) {
    const app = await runWithDb(db, () =>
      applicationRepository.findByIdForUser(message.applicationId!, input.userId)
    );
    if (app) {
      jobContext = {
        companyName: app.companyName ?? "",
        title: app.title ?? "",
        stage: app.stage ?? null
      };
    }
  }

  const llm = await resolveRuntimeAiCredentials(input.userId, "reply");
  if (!llm.apiKey?.trim()) {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "Configure a BYO API key under Settings → AI"
    };
  }

  const { model, skipNote } = generateModelOption(llm);
  if (!model) {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: skipNote ?? "Configure a BYO API key under Settings → AI"
    };
  }

  const job = jobContext;
  const jobLine = job
    ? `Job context: ${[job.title, job.companyName].filter(Boolean).join(" @ ")}${
        job.stage ? ` (stage: ${job.stage})` : ""
      }`
    : "Job context: (none linked — use list-open-applications / get-application if the company is clear)";

  const bodySnippet = (message.bodyText ?? "").slice(0, 6_000);
  const prompt = `Draft a reply for this career email.

From: ${message.fromName} <${message.fromEmail}>
Subject: ${message.subject}
Labels: ${(message.labels ?? []).join(", ") || "(none)"}
${jobLine}

Preview: ${message.preview}

Body:
${bodySnippet}

Use CRM/profile tools only when needed. Never send email.
Return title, subject (with Re: when appropriate), and bodyText (plain text).`;

  const requestContext = new RequestContext();
  requestContext.set("userId", input.userId);
  applyLlmToRequestContext(requestContext, llm);
  void llmLogFields(llm);

  const agent = createMailReplyAgent();

  try {
    const result = await withTimeoutSignal(
      (signal) =>
        agent.generate([{ role: "user", content: prompt }], {
          structuredOutput: {
            schema: LlmDraftSchema,
            errorStrategy: "fallback",
            fallbackValue: STRUCTURED_FALLBACK
          },
          requestContext,
          maxSteps: MAX_STEPS,
          model,
          abortSignal: signal
        }),
      LLM_TIMEOUT_MS,
      `LLM timeout after ${LLM_TIMEOUT_MS / 1000}s`
    );

    const parsed = LlmDraftSchema.safeParse(result.object);
    if (!parsed.success) {
      return {
        ok: false,
        code: "AGENT_FAILED",
        message: "AI reply draft returned invalid output"
      };
    }

    return {
      ok: true,
      draft: {
        subject: parsed.data.subject,
        bodyText: parsed.data.bodyText
      }
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: messageText.slice(0, 280)
    };
  }
}
