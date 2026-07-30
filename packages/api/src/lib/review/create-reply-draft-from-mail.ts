import {
  heuristicMailReplyDraft,
  type MailReplyDraftInput,
  type MailReplyDraftOutput
} from "@tsu-stack/core";
import {
  applicationRepository,
  mailMessageRepository,
  reviewItemRepository,
  type ReviewItemEntity
} from "@tsu-stack/db";

import { emitAppNotification } from "#@/lib/notification/emit-app-notification";
import { callMailReplyAgent } from "#@/lib/review/call-mail-reply-agent";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type CreateReplyDraftResult =
  | { ok: true; item: ReviewItemEntity; created: boolean; source?: MailReplyDraftOutput["source"] }
  | { ok: false; code: "NOT_FOUND" | "NOT_CAREER" };

/**
 * Ensure a pending reply draft exists for a career mail message (idempotent).
 * Prefer Mastra mail-reply-workflow; fall back to local heuristic.
 */
export async function createReplyDraftFromMail(input: {
  messageId: string;
  userId: string;
  /** When true (default), emit draft_ready app notification if created. */
  notify?: boolean;
}): Promise<CreateReplyDraftResult> {
  const message = await mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
    includeSystem: true
  });
  if (!message) return { ok: false, code: "NOT_FOUND" };
  if (message.purpose === "system_notification") return { ok: false, code: "NOT_CAREER" };

  const existing = await reviewItemRepository.findPendingReplyForMessage(message.id, input.userId);
  if (existing) return { ok: true, item: existing, created: false };

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

  let draft: MailReplyDraftOutput | null = await callMailReplyAgent(draftInput);
  draft ??= heuristicMailReplyDraft(draftInput);

  const item = await reviewItemRepository.create({
    userId: input.userId,
    kind: "reply_draft",
    status: "pending",
    title: draft.title,
    bodyText: draft.bodyText,
    subject: draft.subject,
    toEmail: message.fromEmail,
    messageId: message.id,
    applicationId: message.applicationId
  });

  if (input.notify !== false) {
    await emitAppNotification({
      userId: input.userId,
      kind: "mail.reply.draft_ready",
      title: "Reply draft ready",
      body: draft.title,
      href: "/dashboard/review",
      messageId: message.id,
      applicationId: message.applicationId,
      reviewItemId: item.id
    });
  }

  return { ok: true, item, created: true, source: draft.source };
}
