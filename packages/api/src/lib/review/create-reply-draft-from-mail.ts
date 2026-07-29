import { buildHeuristicReplyDraft } from "@tsu-stack/core";
import { mailMessageRepository, reviewItemRepository, type ReviewItemEntity } from "@tsu-stack/db";

export type CreateReplyDraftResult =
  | { ok: true; item: ReviewItemEntity; created: boolean }
  | { ok: false; code: "NOT_FOUND" | "NOT_CAREER" };

/**
 * Ensure a pending reply draft exists for a career mail message (idempotent).
 */
export async function createReplyDraftFromMail(input: {
  messageId: string;
  userId: string;
}): Promise<CreateReplyDraftResult> {
  const message = await mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
    includeSystem: true
  });
  if (!message) return { ok: false, code: "NOT_FOUND" };
  if (message.purpose === "system_notification") return { ok: false, code: "NOT_CAREER" };

  const existing = await reviewItemRepository.findPendingReplyForMessage(message.id, input.userId);
  if (existing) return { ok: true, item: existing, created: false };

  const draft = buildHeuristicReplyDraft({
    fromName: message.fromName,
    subject: message.subject,
    preview: message.preview
  });

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

  return { ok: true, item, created: true };
}
