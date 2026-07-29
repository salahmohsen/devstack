import {
  CreateAiCorrectionInputSchema,
  CreateAiCorrectionOutputSchema,
  MailCrmApplySummarySchema,
  MailCrmAuditSnapshotSchema,
  MailCrmEffectKindSchema,
  MailGetInputSchema,
  MailListInputSchema,
  MailMessageDetailSchema,
  MailMessageListOutputSchema,
  UndoMailCrmApplyInputSchema,
  UndoMailCrmApplyOutputSchema
} from "@tsu-stack/core";
import { mailCrmApplyRepository, mailMessageRepository } from "@tsu-stack/db/repositories";

import { createAiCorrectionFromMail } from "#@/lib/mail/create-ai-correction";
import { undoMailCrmApply } from "#@/lib/mail/undo-mail-crm-apply";
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

function toCrmApplySummary(
  apply: NonNullable<Awaited<ReturnType<typeof mailCrmApplyRepository.findActiveByMessageId>>>
) {
  const before = MailCrmAuditSnapshotSchema.safeParse(apply.before);
  const after = MailCrmAuditSnapshotSchema.safeParse(apply.after);
  const kindParsed = MailCrmEffectKindSchema.safeParse(apply.effectKind);

  return MailCrmApplySummarySchema.parse({
    id: apply.id,
    effectKind: kindParsed.success ? kindParsed.data : "noop",
    reason: apply.reason,
    applicationId: apply.applicationId,
    stageAfter: after.success ? after.data.stage : null,
    stageBefore: before.success ? before.data.stage : null,
    createdAt: apply.createdAt,
    undoneAt: apply.undoneAt
  });
}

async function toDetail(
  row: NonNullable<Awaited<ReturnType<typeof mailMessageRepository.findByIdForUser>>>,
  userId: string
) {
  const activeApply = await mailCrmApplyRepository.findActiveByMessageId(row.id, userId);
  return {
    ...toListItem(row),
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    provider: row.provider,
    classifiedAt: row.classifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    crmApply: activeApply ? toCrmApplySummary(activeApply) : null
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
      return toDetail(row, userId);
    }),

  undoCrmApply: protectedProcedure
    .route({
      description: "Undo a Career Inbox auto CRM stage apply and restore the before snapshot",
      method: "POST"
    })
    .input(UndoMailCrmApplyInputSchema)
    .output(UndoMailCrmApplyOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "CRM apply not found",
        status: 404
      },
      ALREADY_UNDONE: {
        message: "This CRM apply was already undone",
        status: 409
      },
      RESTORE_FAILED: {
        message: "Could not restore application state from the audit snapshot",
        status: 500
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const result = await undoMailCrmApply({ applyId: input.applyId, userId });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "ALREADY_UNDONE") throw errors.ALREADY_UNDONE();
        throw errors.RESTORE_FAILED();
      }
      return result.result;
    }),

  correctClassification: protectedProcedure
    .route({
      description:
        "Correct AI classify labels for a mail message; stores few-shot correction and optionally undoes CRM apply",
      method: "POST"
    })
    .input(CreateAiCorrectionInputSchema)
    .output(CreateAiCorrectionOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Mail message not found",
        status: 404
      }
    })
    .handler(async ({ input, context, errors }) => {
      const result = await createAiCorrectionFromMail({
        userId: context.session.user.id,
        data: input
      });
      if (!result.ok) throw errors.NOT_FOUND();
      return result.result;
    })
};
