import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { HubGetApplicationOutputSchema } from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  mailMessageRepository,
  resumeRepository,
  runWithDb
} from "@tsu-stack/db";

import { createAgentLogger } from "#@/mastra/agent-logger";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function hubSkillTags(
  rows: Array<{ name: string; band: "required" | "preferred" }> | null | undefined
): Array<{ name: string; band: "required" | "preferred" }> {
  return (rows ?? []).map((row) => {
    return { name: row.name, band: row.band };
  });
}

function emitApplicationMentionLoaded(fields: {
  applicationId: string;
  found: boolean;
  trackingStatus: string | null;
}): void {
  const log = createAgentLogger({ operation: "agent__hub_application" });
  log.set({
    event: "hub_application_mention_loaded",
    applicationId: fields.applicationId,
    found: fields.found,
    trackingStatus: fields.trackingStatus
  });
  if (!fields.found) {
    log.warn("hub_application_mention_loaded", {
      applicationId: fields.applicationId,
      found: false
    });
  }
  log.emit();
}

/**
 * CRM read tool — single application by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getApplicationTool = createTool({
  id: "get-application",
  description:
    "Fetch one application by id (identity, full JD, kit text, last 50 activity notes, linked mail headers) for the current user only. Resume filename only — never R2 keys, draft JSON, fitAnalysis, or mail bodies. Call after searchApplications / listNewJobs / application {id}. Do not invent the JD or kit from memory. Do not dump the JD in chat.",
  inputSchema: z.object({
    applicationId: z
      .string()
      .min(1)
      .optional()
      .describe("Application id from searchApplications, listNewJobs, or listOpenApplications"),
    id: z.string().min(1).optional().describe("Alias for applicationId.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: HubGetApplicationOutputSchema,
  execute: async ({ applicationId, id }, context) => {
    const resolvedId = (applicationId ?? id ?? "").trim();
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId || !resolvedId) {
      if (resolvedId) {
        emitApplicationMentionLoaded({
          applicationId: resolvedId,
          found: false,
          trackingStatus: null
        });
      }
      return { found: false, application: null };
    }
    const db = createDb();
    const payload = await runWithDb(db, async () => {
      const row = await applicationRepository.findByIdForUser(resolvedId, userId);
      if (!row) return { found: false as const, application: null };
      const [activity, mails, resume] = await Promise.all([
        applicationActivityRepository.listByApplicationId(row.id, userId, {
          limit: 50,
          order: "desc"
        }),
        mailMessageRepository.listByApplicationId(row.id, userId, 50),
        row.resumeId
          ? resumeRepository.findByIdForUser(row.resumeId, userId)
          : Promise.resolve(null)
      ]);
      return {
        found: true as const,
        application: {
          id: row.id,
          companyName: row.companyName,
          title: row.title,
          url: row.url ?? null,
          applyUrl: row.applyUrl ?? null,
          location: row.location ?? null,
          workMode: row.workMode ?? null,
          salaryRange: row.salaryRange ?? null,
          employmentType: row.employmentType,
          experienceYearsMin: row.experienceYearsMin ?? null,
          trackingStatus: row.trackingStatus,
          stage: row.stage,
          outcome: row.outcome ?? null,
          hiringUrgency: row.hiringUrgency,
          matchScore: row.matchScore ?? null,
          requiredSkills: hubSkillTags(row.requiredSkills),
          preferredSkills: hubSkillTags(row.preferredSkills),
          description: row.description ?? null,
          agentTake: row.agentTake ?? null,
          kit: {
            resumeId: row.resumeId ?? null,
            resumeFilename: resume?.filename ?? null,
            coverLetterBody: row.coverLetterBody ?? null,
            outreachSubject: row.outreachSubject ?? null,
            outreachBody: row.outreachBody ?? null,
            draftExists: row.applyPackageDraft != null,
            recruiterEmail: row.recruiterEmail ?? null,
            outreachSentAt: iso(row.outreachSentAt)
          },
          activity: activity.map((item) => {
            return {
              id: item.id,
              kind: item.kind,
              body: item.body ?? null,
              createdAt: item.createdAt.toISOString()
            };
          }),
          linkedMails: mails.map((mail) => {
            return {
              id: mail.id,
              subject: mail.subject,
              fromName: mail.fromName,
              fromEmail: mail.fromEmail,
              receivedAt: mail.receivedAt.toISOString(),
              labels: mail.labels ?? []
            };
          })
        }
      };
    });
    emitApplicationMentionLoaded({
      applicationId: resolvedId,
      found: payload.found,
      trackingStatus: payload.application?.trackingStatus ?? null
    });
    return payload;
  }
});
