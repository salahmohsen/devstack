import {
  CreateAiCorrectionInputSchema,
  CreateAiCorrectionOutputSchema,
  MailCrmApplySummarySchema,
  MailCrmAuditSnapshotSchema,
  MailCrmEffectKindSchema,
  MailGenerateReplyInputSchema,
  MailGenerateReplyOutputSchema,
  MailGetInputSchema,
  MailListInputSchema,
  MailMessageDetailSchema,
  MailMessageListOutputSchema,
  MailSendReplyInputSchema,
  MailSendReplyOutputSchema,
  UndoMailCrmApplyInputSchema,
  UndoMailCrmApplyOutputSchema
} from "@tsu-stack/core";
import { mailCrmApplyRepository, mailMessageRepository } from "@tsu-stack/db/repositories";

import { createAiCorrectionFromMail } from "#@/lib/mail/create-ai-correction";
import { generateMailReply } from "#@/lib/mail/generate-mail-reply";
import { sendCareerReply } from "#@/lib/mail/send-career-reply";
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
    }),

  generateReply: protectedProcedure
    .route({
      description:
        "Generate an ephemeral AI reply draft for a Career Inbox message (subject + body only; no review queue)",
      method: "POST"
    })
    .input(MailGenerateReplyInputSchema)
    .output(MailGenerateReplyOutputSchema)
    .errors({
      NOT_FOUND: { message: "Mail message not found", status: 404 },
      NOT_CAREER: {
        message: "System notification mail cannot generate replies",
        status: 400
      },
      AI_NOT_CONFIGURED: {
        message: "Configure a BYO API key under Settings → AI",
        status: 400
      },
      AGENT_FAILED: {
        message: "AI reply draft failed — check Settings → AI and try again",
        status: 502
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const logger = context.logger;

      const result = await generateMailReply({
        messageId: input.messageId,
        userId
      });

      if (!result.ok) {
        logger.set({
          event: "mail_generate_reply_failed",
          procedure: "mail.generateReply",
          messageId: input.messageId,
          code: result.code
        });
        if (result.code === "NOT_FOUND") throw errors.NOT_FOUND();
        if (result.code === "NOT_CAREER") throw errors.NOT_CAREER();
        if (result.code === "AI_NOT_CONFIGURED") {
          throw errors.AI_NOT_CONFIGURED({ message: result.message });
        }
        throw errors.AGENT_FAILED({ message: result.message });
      }

      logger.set({
        event: "mail_generate_reply_ok",
        procedure: "mail.generateReply",
        messageId: input.messageId
      });
      return result.draft;
    }),

  sendReply: protectedProcedure
    .route({
      description:
        "Send a Career Inbox reply via Resend. Recipient is always the message's fromEmail.",
      method: "POST"
    })
    .input(MailSendReplyInputSchema)
    .output(MailSendReplyOutputSchema)
    .errors({
      NOT_FOUND: { message: "Mail message not found", status: 404 },
      NOT_CAREER: {
        message: "System notification mail cannot send replies",
        status: 400
      },
      INVALID_TO: {
        message: "Message has no valid sender address to reply to",
        status: 400
      },
      MAIL_NOT_CONFIGURED: {
        message: "Configure Resend under Settings → Mail before sending",
        status: 400
      },
      SEND_FAILED: {
        message: "Could not send the reply",
        status: 502
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const logger = context.logger;

      const message = await mailMessageRepository.findByIdForUser(input.messageId, userId, {
        includeSystem: true
      });
      if (!message) {
        logger.set({
          event: "mail_send_reply_failed",
          procedure: "mail.sendReply",
          messageId: input.messageId,
          code: "NOT_FOUND"
        });
        throw errors.NOT_FOUND();
      }
      if (message.purpose === "system_notification") {
        logger.set({
          event: "mail_send_reply_failed",
          procedure: "mail.sendReply",
          messageId: input.messageId,
          code: "NOT_CAREER"
        });
        throw errors.NOT_CAREER();
      }

      // Never trust a client-supplied `to` — always derive from the inbound message.
      const to = message.fromEmail;
      const sent = await sendCareerReply({
        userId,
        to,
        subject: input.subject,
        bodyText: input.bodyText
      });

      if (!sent.ok) {
        logger.set({
          event: "mail_send_reply_failed",
          procedure: "mail.sendReply",
          messageId: input.messageId,
          code: sent.code
        });
        if (sent.code === "INVALID_TO") {
          throw errors.INVALID_TO({ message: sent.message });
        }
        if (sent.code === "MISSING_API_KEY" || sent.code === "MISSING_FROM") {
          throw errors.MAIL_NOT_CONFIGURED({ message: sent.message });
        }
        throw errors.SEND_FAILED({ message: sent.message });
      }

      logger.set({
        event: "mail_send_reply_ok",
        procedure: "mail.sendReply",
        messageId: input.messageId
      });
      return {
        sent: true as const,
        providerMessageId: sent.providerMessageId,
        note: sent.usedByoKey
          ? `Sent via your Resend key from ${sent.from}.`
          : `Sent via platform Resend from ${sent.from}.`
      };
    })
};
