import {
  MailGetInputSchema,
  MailListInputSchema,
  MailMessageDetailSchema,
  MailMessageListOutputSchema
} from "@tsu-stack/core";
import { mailMessageRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toListItem(
  row: NonNullable<Awaited<ReturnType<typeof mailMessageRepository.findByIdForUser>>>
) {
  return {
    id: row.id,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    subject: row.subject,
    preview: row.preview,
    receivedAt: row.receivedAt,
    unread: row.unread,
    labels: row.labels ?? [],
    purpose: row.purpose,
    applicationId: row.applicationId,
    application:
      row.applicationId && row.applicationCompanyName && row.applicationTitle
        ? {
            companyName: row.applicationCompanyName,
            title: row.applicationTitle
          }
        : null
  };
}

function toDetail(
  row: NonNullable<Awaited<ReturnType<typeof mailMessageRepository.findByIdForUser>>>
) {
  return {
    ...toListItem(row),
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    provider: row.provider,
    classifiedAt: row.classifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export const mailRouter = {
  list: protectedProcedure
    .route({
      description:
        "List Career Inbox messages for the current user by category (excludes system notifications by default)",
      method: "GET"
    })
    .input(MailListInputSchema)
    .output(MailMessageListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const rows = await mailMessageRepository.findByUserId({
        userId,
        category: input.category,
        includeSystem: input.includeSystem,
        limit: input.limit
      });
      return rows.map(toListItem);
    }),

  get: protectedProcedure
    .route({
      description: "Get a single Career Inbox message by id for the current user",
      method: "GET"
    })
    .input(MailGetInputSchema)
    .output(MailMessageDetailSchema)
    .errors({
      NOT_FOUND: {
        message: "Mail message not found"
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const row = await mailMessageRepository.findByIdForUser(input.id, userId, {
        includeSystem: input.includeSystem
      });
      if (!row) throw errors.NOT_FOUND();
      return toDetail(row);
    })
};
