import {
  type MailGenerateReplyOutput,
  type MailReplyDraftInput,
  type MailReplyDraftOutput
} from "@tsu-stack/core";
import { applicationRepository, mailMessageRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { agentFailureUserMessage } from "#@/lib/agent/agent-call-result";
import { callMailReplyAgent } from "#@/lib/mail/call-mail-reply-agent";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type GenerateMailReplyErrorCode =
  | "NOT_FOUND"
  | "NOT_CAREER"
  | "AI_NOT_CONFIGURED"
  | "AGENT_FAILED";

export type GenerateMailReplyResult =
  | { ok: true; draft: MailGenerateReplyOutput; source: MailReplyDraftOutput["source"] }
  | { ok: false; code: GenerateMailReplyErrorCode; message?: string };

/**
 * Build an ephemeral AI reply draft for a career mail message (local composer only).
 * Fail closed when BYO credentials or the agent worker are missing.
 */
export async function generateMailReply(input: {
  messageId: string;
  userId: string;
}): Promise<GenerateMailReplyResult> {
  const message = await mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
    includeSystem: true
  });
  if (!message) return { ok: false, code: "NOT_FOUND" };
  if (message.purpose === "system_notification") return { ok: false, code: "NOT_CAREER" };

  let jobContext: MailReplyDraftInput["jobContext"] = null;
  if (message.applicationId) {
    const app = await applicationRepository.findByIdForUser(message.applicationId, input.userId);
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
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return {
      ok: false,
      code: "AI_NOT_CONFIGURED",
      message: "Agent worker is not configured"
    };
  }

  const draftInput: MailReplyDraftInput = {
    messageId: message.id,
    userId: input.userId,
    fromName: message.fromName,
    fromEmail: message.fromEmail,
    subject: message.subject,
    preview: message.preview,
    bodyText: message.bodyText,
    labels: message.labels ?? [],
    jobContext,
    llm
  };

  const agentCall = await callMailReplyAgent(draftInput);
  if (!agentCall.ok) {
    return {
      ok: false,
      code: "AGENT_FAILED",
      message: agentFailureUserMessage(agentCall.failure)
    };
  }

  const draft = agentCall.data;
  return {
    ok: true,
    draft: {
      subject: draft.subject,
      bodyText: draft.bodyText
    },
    source: draft.source
  };
}
