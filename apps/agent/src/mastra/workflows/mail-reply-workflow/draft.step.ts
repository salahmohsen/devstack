import { RequestContext } from "@mastra/core/request-context";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  heuristicMailReplyDraft,
  MailReplyDraftInputSchema,
  MailReplyDraftOutputSchema
} from "@tsu-stack/core";

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

    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      return { ...fallback, notes: "llm:missing_DEEPSEEK_API_KEY" };
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
          maxSteps: 4
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
        return { ...fallback, notes: "llm:invalid_output" };
      }

      return {
        title: parsed.data.title.trim().slice(0, 200),
        subject: parsed.data.subject.trim().slice(0, 500),
        bodyText: parsed.data.bodyText.trim().slice(0, 20_000),
        source: "llm" as const,
        notes: "llm:ok"
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        ...fallback,
        notes: `llm:error:${msg.slice(0, 120)}`
      };
    }
  }
});
