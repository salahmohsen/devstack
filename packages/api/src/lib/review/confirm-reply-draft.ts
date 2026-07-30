import { type ConfirmReviewItemOutput } from "@tsu-stack/core";
import { reviewItemRepository, type ReviewItemEntity } from "@tsu-stack/db";

import { sendCareerReply } from "#@/lib/mail/send-career-reply";

export type ConfirmReplyDraftResult =
  | { ok: true; result: ConfirmReviewItemOutput }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_PENDING" | "SEND_FAILED";
      message?: string;
    };

/**
 * Confirm a reply draft: CAS-claim pending, send via Resend, then mark `sent`.
 * Non-reply kinds are CAS-claimed to `confirmed` without outbound.
 */
export async function confirmReviewItem(input: {
  applyId: string;
  userId: string;
}): Promise<ConfirmReplyDraftResult> {
  const existing = await reviewItemRepository.findByIdForUser(input.applyId, input.userId);
  if (!existing) return { ok: false, code: "NOT_FOUND" };
  if (existing.status !== "pending") return { ok: false, code: "NOT_PENDING" };

  if (existing.kind !== "reply_draft") {
    const claimed = await reviewItemRepository.claimPending(existing.id, input.userId, "confirmed");
    if (!claimed) return { ok: false, code: "NOT_PENDING" };
    return {
      ok: true,
      result: {
        id: claimed.id,
        status: claimed.status,
        sent: false,
        note: "Confirmed."
      }
    };
  }

  return sendAndMark(existing, input.userId);
}

/** Used by Full autonomy after draft creation. */
export async function sendPendingReplyDraft(input: {
  item: ReviewItemEntity;
  userId: string;
}): Promise<ConfirmReplyDraftResult> {
  if (input.item.status !== "pending") return { ok: false, code: "NOT_PENDING" };
  if (input.item.kind !== "reply_draft") {
    return {
      ok: true,
      result: {
        id: input.item.id,
        status: input.item.status,
        sent: false
      }
    };
  }
  return sendAndMark(input.item, input.userId);
}

async function sendAndMark(
  existing: ReviewItemEntity,
  userId: string
): Promise<ConfirmReplyDraftResult> {
  if (!existing.toEmail?.trim()) {
    return {
      ok: false,
      code: "SEND_FAILED",
      message: "This draft has no recipient address."
    };
  }

  // Claim before external send so concurrent confirm/Full-auto cannot double-send.
  const claimed = await reviewItemRepository.claimPending(existing.id, userId, "confirmed");
  if (!claimed) return { ok: false, code: "NOT_PENDING" };

  const sent = await sendCareerReply({
    userId,
    to: claimed.toEmail ?? existing.toEmail,
    subject: claimed.subject ?? existing.subject ?? "",
    bodyText: claimed.bodyText,
    bodyHtml: claimed.bodyHtml
  });

  if (!sent.ok) {
    // Release claim so the user can retry.
    await reviewItemRepository.setStatus(existing.id, userId, "pending");
    return {
      ok: false,
      code: "SEND_FAILED",
      message: sent.message
    };
  }

  const updated = await reviewItemRepository.setStatus(existing.id, userId, "sent");
  if (!updated) return { ok: false, code: "NOT_FOUND" };

  return {
    ok: true,
    result: {
      id: updated.id,
      status: updated.status,
      sent: true,
      note: sent.usedByoKey
        ? `Sent via your Resend key from ${sent.from}.`
        : `Sent via platform Resend from ${sent.from}.`
    }
  };
}
