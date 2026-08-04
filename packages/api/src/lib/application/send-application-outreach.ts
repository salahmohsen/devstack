import { z } from "zod";

import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { applicationRepository, resumeRepository, type ApplicationEntity } from "@tsu-stack/db";

import { sendCareerReply } from "#@/lib/mail/send-career-reply";

export type SendApplicationOutreachErrorCode =
  | "NOT_FOUND"
  | "CLOSED"
  | "NO_RESUME"
  | "NO_RECIPIENT"
  | "MAIL_NOT_CONFIGURED"
  | "SEND_FAILED";

export type SendApplicationOutreachResult =
  | { ok: true; application: ApplicationEntity }
  | { ok: false; code: SendApplicationOutreachErrorCode; message?: string };

const emailSchema = z.string().email();

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;
  return trimmed;
}

/**
 * Send outreach email for an application with the linked resume PDF attached.
 * On success, stamps send metadata and advances `saved` → `applied` when needed.
 */
export async function sendApplicationOutreach(input: {
  applicationId: string;
  userId: string;
  mediaBucket: OrpcContextMediaBucket;
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

  const to = nonEmpty(app.recruiterEmail);
  if (!to || !emailSchema.safeParse(to).success) {
    return {
      ok: false,
      code: "NO_RECIPIENT",
      message: "Set a valid recruiter email before sending outreach"
    };
  }

  const subject = nonEmpty(app.outreachSubject);
  const body = nonEmpty(app.outreachBody);
  if (!subject || !body) {
    return {
      ok: false,
      code: "SEND_FAILED",
      message: "Outreach subject and body are required — accept an apply package first"
    };
  }

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
  const resumeFilename =
    nonEmpty(resume.filename) ?? `Resume_${app.companyName.replace(/\s+/g, "_")}.pdf`;

  const sent = await sendCareerReply({
    userId: input.userId,
    to,
    subject,
    bodyText: body,
    attachments: [
      {
        filename: resumeFilename.endsWith(".pdf") ? resumeFilename : `${resumeFilename}.pdf`,
        content: resumeBytes
      }
    ]
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

  const updated = await applicationRepository.update(app.id, input.userId, {
    outreachSentAt: new Date(),
    outreachProviderMessageId: sent.providerMessageId
  });
  if (!updated) return { ok: false, code: "NOT_FOUND" };

  // Stage advance only via updateStage (not body update patch).
  if (updated.stage === "saved") {
    const staged = await applicationRepository.updateStage(updated.id, input.userId, "applied");
    if (staged.ok) {
      return { ok: true, application: staged.row };
    }
    // Send already succeeded; return row with send metadata even if stage update races.
  }

  return { ok: true, application: updated };
}
