import {
  ConfirmReviewItemOutputSchema,
  CreateReplyDraftFromMailInputSchema,
  ReviewItemDetailSchema,
  ReviewItemGetInputSchema,
  ReviewItemIdInputSchema,
  ReviewItemListInputSchema,
  ReviewItemListOutputSchema,
  UpdateReviewItemInputSchema
} from "@tsu-stack/core";
import { reviewItemRepository, userAiSettingsRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { createReplyDraftFromMail } from "#@/lib/review/create-reply-draft-from-mail";

function toListItem(
  row: NonNullable<Awaited<ReturnType<typeof reviewItemRepository.findByUserId>>>[number]
) {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    preview: row.preview,
    messageId: row.messageId,
    applicationId: row.applicationId,
    toEmail: row.toEmail,
    subject: row.subject,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toDetail(
  row: NonNullable<Awaited<ReturnType<typeof reviewItemRepository.findByIdForUser>>>
) {
  return {
    ...toListItem(row),
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    mailSubject: row.mailSubject,
    mailFromName: row.mailFromName,
    applicationCompanyName: row.applicationCompanyName,
    applicationTitle: row.applicationTitle
  };
}

export const reviewRouter = {
  list: protectedProcedure
    .route({
      description: "List review queue items for the current user (default: pending)",
      method: "GET"
    })
    .input(ReviewItemListInputSchema)
    .output(ReviewItemListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const rows = await reviewItemRepository.findByUserId({
        userId,
        status: input.status,
        limit: input.limit
      });
      return rows.map(toListItem);
    }),

  get: protectedProcedure
    .route({
      description: "Get a review item with mail/application context",
      method: "GET"
    })
    .input(ReviewItemGetInputSchema)
    .output(ReviewItemDetailSchema)
    .errors({
      NOT_FOUND: { message: "Review item not found", status: 404 }
    })
    .handler(async ({ input, context, errors }) => {
      const row = await reviewItemRepository.findByIdForUser(input.id, context.session.user.id);
      if (!row) throw errors.NOT_FOUND();
      return toDetail(row);
    }),

  createReplyDraftFromMail: protectedProcedure
    .route({
      description: "Create (or return existing) pending reply draft for a Career Inbox message",
      method: "POST"
    })
    .input(CreateReplyDraftFromMailInputSchema)
    .output(ReviewItemDetailSchema)
    .errors({
      NOT_FOUND: { message: "Mail message not found", status: 404 },
      NOT_CAREER: {
        message: "System notification mail cannot create reply drafts",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await createReplyDraftFromMail({
        messageId: input.messageId,
        userId
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        throw errors.NOT_CAREER();
      }
      const detail = await reviewItemRepository.findByIdForUser(result.item.id, userId);
      if (!detail) throw errors.NOT_FOUND();
      return toDetail(detail);
    }),

  update: protectedProcedure
    .route({
      description: "Edit a pending review item draft body/subject",
      method: "POST"
    })
    .input(UpdateReviewItemInputSchema)
    .output(ReviewItemDetailSchema)
    .errors({
      NOT_FOUND: { message: "Review item not found", status: 404 },
      NOT_PENDING: { message: "Only pending items can be edited", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const existing = await reviewItemRepository.findByIdForUser(input.id, userId);
      if (!existing) throw errors.NOT_FOUND();
      if (existing.status !== "pending") throw errors.NOT_PENDING();

      const preview =
        input.bodyText !== undefined
          ? input.bodyText.replace(/\s+/g, " ").trim().slice(0, 200)
          : undefined;

      const updated = await reviewItemRepository.updateBody(input.id, userId, {
        bodyText: input.bodyText,
        bodyHtml: input.bodyHtml,
        subject: input.subject,
        preview
      });
      if (!updated) throw errors.NOT_FOUND();

      const detail = await reviewItemRepository.findByIdForUser(updated.id, userId);
      if (!detail) throw errors.NOT_FOUND();
      return toDetail(detail);
    }),

  confirm: protectedProcedure
    .route({
      description:
        "Confirm a pending review item. Assist → confirmed; Full → mark sent (outbound stub in v1).",
      method: "POST"
    })
    .input(ReviewItemIdInputSchema)
    .output(ConfirmReviewItemOutputSchema)
    .errors({
      NOT_FOUND: { message: "Review item not found", status: 404 },
      NOT_PENDING: { message: "Only pending items can be confirmed", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const existing = await reviewItemRepository.findByIdForUser(input.id, userId);
      if (!existing) throw errors.NOT_FOUND();
      if (existing.status !== "pending") throw errors.NOT_PENDING();

      const ai = await userAiSettingsRepository.findByUserId(userId);
      const autonomy = ai?.mailReplyAutonomy ?? "assist";
      // Full autonomy will send via Resend later; v1 records intent without outbound.
      const wantSend = autonomy === "full" && existing.kind === "reply_draft";
      const status = wantSend ? "sent" : "confirmed";
      const updated = await reviewItemRepository.setStatus(input.id, userId, status);
      if (!updated) throw errors.NOT_FOUND();

      return {
        id: updated.id,
        status: updated.status,
        sent: wantSend,
        note: wantSend
          ? "Marked sent under Full autonomy (outbound email not wired yet)."
          : "Confirmed. Send from Review when Full autonomy + outbound ship."
      };
    }),

  discard: protectedProcedure
    .route({
      description: "Discard a pending review item",
      method: "POST"
    })
    .input(ReviewItemIdInputSchema)
    .output(ReviewItemDetailSchema)
    .errors({
      NOT_FOUND: { message: "Review item not found", status: 404 },
      NOT_PENDING: { message: "Only pending items can be discarded", status: 409 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const existing = await reviewItemRepository.findByIdForUser(input.id, userId);
      if (!existing) throw errors.NOT_FOUND();
      if (existing.status !== "pending") throw errors.NOT_PENDING();

      const updated = await reviewItemRepository.setStatus(input.id, userId, "discarded");
      if (!updated) throw errors.NOT_FOUND();
      const detail = await reviewItemRepository.findByIdForUser(updated.id, userId);
      if (!detail) throw errors.NOT_FOUND();
      return toDetail(detail);
    })
};
