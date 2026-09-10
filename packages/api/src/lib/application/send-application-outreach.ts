import {
  type OrpcContextMediaBucket,
  buildOutreachMailModel,
  type SendOutreachOverrides
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  contactRepository,
  resumeRepository,
  userRepository,
  type ApplicationEntity
} from "@tsu-stack/db";
import { renderOutreachApplyEmailHtml } from "@tsu-stack/email";
import { createLogger } from "@tsu-stack/logger/server";

import { resolveOutreachSendValues } from "#@/lib/application/outreach-send-plan";
import { recordSentOutreachMail } from "#@/lib/mail/record-sent-outreach-mail";
import { sendCareerReply } from "#@/lib/mail/send-career-reply";

export type SendApplicationOutreachErrorCode =
  | "NOT_FOUND"
  | "CLOSED"
  | "NO_RESUME"
  | "NO_COVER"
  | "NO_RECIPIENT"
  | "NO_ATTACHMENTS"
  | "MAIL_NOT_CONFIGURED"
  | "SEND_FAILED";

export type SendApplicationOutreachResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: SendApplicationOutreachErrorCode; message?: string };

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;
  return trimmed;
}

function pdfFilename(name: string | null | undefined, fallback: string): string {
  const base = nonEmpty(name) ?? fallback;
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/**
 * Send outreach email for an application with the selected resume + cover
 * letter PDFs attached. Send-time overrides (spec #8, #11) win over stored
 * rows; final to/subject/body persist back so stored state matches what was
 * sent. On success, stamps send metadata and advances `saved` → `applied`
 * when needed.
 */
export async function sendApplicationOutreach(input: {
  applicationId: string;
  userId: string;
  mediaBucket: OrpcContextMediaBucket;
  overrides?: SendOutreachOverrides;
}): Promise<SendApplicationOutreachResult> {
  const app = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
  if (!app) return { ok: false, code: "NOT_FOUND" };

  if (app.outcome != null) {
    return {
      ok: false,
      code: "CLOSED",
      message: "Cannot send outreach for a closed application"
    };
  }

  const resolved = resolveOutreachSendValues({
    recruiterEmail: app.recruiterEmail,
    outreachSubject: app.outreachSubject,
    outreachBody: app.outreachBody,
    overrides: input.overrides
  });
  if ("error" in resolved) {
    if (resolved.error === "NO_RECIPIENT") {
      return {
        ok: false,
        code: "NO_RECIPIENT",
        message: "Set a valid recruiter email before sending outreach"
      };
    }
    if (resolved.error === "NO_ATTACHMENTS") {
      return {
        ok: false,
        code: "NO_ATTACHMENTS",
        message: "Keep at least one attachment selected"
      };
    }
    // NO_MESSAGE with a message override means the user was editing in the
    // email section (e.g. whitespace-only subject); without an override the
    // stored rows are empty, i.e. the apply package was never accepted.
    const messageOverridden =
      input.overrides?.subject !== undefined || input.overrides?.body !== undefined;
    return {
      ok: false,
      code: "SEND_FAILED",
      message: messageOverridden
        ? "Outreach subject and body are required — check the email section"
        : "Outreach subject and body are required — accept an apply package first"
    };
  }
  const sendValues = resolved;

  const sendAttachments: Array<{
    filename: string;
    content: Uint8Array;
    contentType: string;
    storageKey: string | null;
  }> = [];

  if (sendValues.attachments.resume) {
    if (!app.resumeId) {
      return {
        ok: false,
        code: "NO_RESUME",
        message: "Link a resume (accept an apply package) before sending outreach"
      };
    }

    const resume = await resumeRepository.findByIdForUser(app.resumeId, input.userId);
    if (!resume?.r2Key) {
      return {
        ok: false,
        code: "NO_RESUME",
        message: "Resume not found for this application"
      };
    }

    const object = await input.mediaBucket.get(resume.r2Key);
    if (!object?.body) {
      return {
        ok: false,
        code: "NO_RESUME",
        message: "Resume PDF object is missing from storage"
      };
    }

    const resumeBytes = new Uint8Array(await new Response(object.body).arrayBuffer());
    const resumeFilename = pdfFilename(
      resume.filename,
      `Resume_${app.companyName.replace(/\s+/g, "_")}.pdf`
    );

    sendAttachments.push({
      filename: resumeFilename,
      content: resumeBytes,
      contentType: "application/pdf",
      storageKey: resume.r2Key
    });
  }

  if (sendValues.attachments.cover) {
    // Cover letter PDF is part of the kit — required when selected, fail-closed
    // like the resume (accept the apply package to materialize it).
    const coverKey = nonEmpty(app.coverLetterR2Key);
    if (!coverKey) {
      return {
        ok: false,
        code: "NO_COVER",
        message: "Cover letter PDF is missing — accept an apply package before sending outreach"
      };
    }

    const coverObject = await input.mediaBucket.get(coverKey);
    if (!coverObject?.body) {
      return {
        ok: false,
        code: "NO_COVER",
        message: "Cover letter PDF object is missing from storage"
      };
    }

    const coverBytes = new Uint8Array(await new Response(coverObject.body).arrayBuffer());
    const coverFilename = pdfFilename(
      app.coverLetterFilename,
      `Cover_letter_${app.companyName.replace(/\s+/g, "_")}.pdf`
    );

    sendAttachments.push({
      filename: coverFilename,
      content: coverBytes,
      contentType: "application/pdf",
      storageKey: coverKey
    });
  }

  const [userRow, contactsRaw] = await Promise.all([
    userRepository.findById(input.userId),
    contactRepository.findOptedInByUserId(input.userId)
  ]);
  if (!userRow) return { ok: false, code: "NOT_FOUND" };

  const mail = buildOutreachMailModel({
    subject: sendValues.subject,
    bodyText: sendValues.body,
    senderName: userRow.name,
    contacts: contactsRaw.map((c) => {
      return { type: c.type, value: c.value };
    })
  });
  // Template failure must not 500 an otherwise-sendable mail; sendCareerReply
  // falls back to escaped <p> HTML from bodyText.
  let bodyHtml: string | null = null;
  try {
    bodyHtml = await renderOutreachApplyEmailHtml(mail, userRow.name);
  } catch (error) {
    const log = createLogger({ operation: "api__outreach_send" });
    log.warn("outreach_html_render_failed", {
      applicationId: app.id,
      error: error instanceof Error ? error.message : String(error)
    });
    log.emit({ _forceKeep: true });
  }

  const sent = await sendCareerReply({
    userId: input.userId,
    to: sendValues.to,
    subject: sendValues.subject,
    bodyText: sendValues.body,
    bodyHtml,
    attachments: sendAttachments.map((file) => {
      return {
        filename: file.filename,
        content: file.content,
        contentType: file.contentType
      };
    })
  });

  if (!sent.ok) {
    if (sent.code === "MISSING_API_KEY" || sent.code === "MISSING_FROM") {
      return { ok: false, code: "MAIL_NOT_CONFIGURED", message: sent.message };
    }
    if (sent.code === "INVALID_TO") {
      return { ok: false, code: "NO_RECIPIENT", message: sent.message };
    }
    return { ok: false, code: "SEND_FAILED", message: sent.message };
  }

  await recordSentOutreachMail({
    userId: input.userId,
    applicationId: app.id,
    fromEmail: sent.from,
    toEmail: sendValues.to,
    subject: sendValues.subject,
    bodyText: sendValues.body,
    providerMessageId: sent.providerMessageId,
    attachments: sendAttachments.map((file) => {
      return {
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.content.byteLength,
        storageKey: file.storageKey
      };
    })
  }).catch(() => {
    // Send already succeeded — inbox filing must not fail the apply.
  });

  const updated = await applicationRepository.update(app.id, input.userId, {
    recruiterEmail: sendValues.to,
    outreachSubject: sendValues.subject,
    outreachBody: sendValues.body,
    outreachSentAt: new Date(),
    outreachProviderMessageId: sent.providerMessageId
  });
  if (!updated) return { ok: false, code: "NOT_FOUND" };

  // Stage advance only via updateStage (not body update patch).
  if (updated.stage === "saved") {
    const fromStage = updated.stage;
    const staged = await applicationRepository.updateStage(updated.id, input.userId, "applied");
    if (staged.ok) {
      await applicationActivityRepository.append({
        userId: input.userId,
        applicationId: staged.row.id,
        kind: "stage_changed",
        actorUserId: input.userId,
        metadata: {
          fromStage,
          toStage: staged.row.stage,
          via: "outreach"
        }
      });
      return { ok: true, application: staged.row };
    }
    // Send already succeeded; return row with send metadata even if stage update races.
  }

  return { ok: true, application: updated };
}
