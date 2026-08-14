import { z } from "zod";

import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  resumeRepository,
  runWithDb,
  type ApplicationEntity
} from "@tsu-stack/db";

import { createAgentMediaBucket } from "#@/mastra/lib/media-bucket";
import { sendCareerReply } from "#@/mastra/lib/send-career-reply";

export type SendApplicationOutreachErrorCode =
  | "NOT_FOUND"
  | "CLOSED"
  | "NO_RESUME"
  | "NO_RECIPIENT"
  | "MAIL_NOT_CONFIGURED"
  | "SEND_FAILED"
  | "STORAGE_NOT_CONFIGURED";

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
 * Send first-apply outreach with resume PDF; advances saved → applied on success.
 */
export async function sendApplyOutreach(input: {
  applicationId: string;
  userId: string;
}): Promise<SendApplicationOutreachResult> {
  const media = createAgentMediaBucket();
  if (!media.ok) {
    return { ok: false, code: "STORAGE_NOT_CONFIGURED", message: media.message };
  }
  const mediaBucket = media.bucket;

  const db = createDb();
  return runWithDb(db, async () => {
    const app = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
    if (!app) return { ok: false, code: "NOT_FOUND" as const };

    if (app.outcome != null) {
      return {
        ok: false,
        code: "CLOSED" as const,
        message: "Cannot send outreach for a closed application"
      };
    }

    const to = nonEmpty(app.recruiterEmail);
    if (!to || !emailSchema.safeParse(to).success) {
      return {
        ok: false,
        code: "NO_RECIPIENT" as const,
        message: "Set a valid recruiter email before sending outreach"
      };
    }

    const subject = nonEmpty(app.outreachSubject);
    const body = nonEmpty(app.outreachBody);
    if (!subject || !body) {
      return {
        ok: false,
        code: "SEND_FAILED" as const,
        message: "Outreach subject and body are required — accept an apply package first"
      };
    }

    if (!app.resumeId) {
      return {
        ok: false,
        code: "NO_RESUME" as const,
        message: "Link a resume (accept an apply package) before sending outreach"
      };
    }

    const resume = await resumeRepository.findByIdForUser(app.resumeId, input.userId);
    if (!resume?.r2Key) {
      return {
        ok: false,
        code: "NO_RESUME" as const,
        message: "Resume not found for this application"
      };
    }

    const object = await mediaBucket.get(resume.r2Key);
    if (!object?.body) {
      return {
        ok: false,
        code: "NO_RESUME" as const,
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
        return { ok: false, code: "MAIL_NOT_CONFIGURED" as const, message: sent.message };
      }
      if (sent.code === "INVALID_TO") {
        return { ok: false, code: "NO_RECIPIENT" as const, message: sent.message };
      }
      return { ok: false, code: "SEND_FAILED" as const, message: sent.message };
    }

    const updated = await applicationRepository.update(app.id, input.userId, {
      outreachSentAt: new Date(),
      outreachProviderMessageId: sent.providerMessageId
    });
    if (!updated) return { ok: false, code: "NOT_FOUND" as const };

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
        return { ok: true as const, application: staged.row };
      }
    }

    return { ok: true as const, application: updated };
  });
}
