import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * List New jobs inbox (trackingStatus=inbox). Tenant from requestContext only.
 */
export const listNewJobsTool = createTool({
  id: "list-new-jobs",
  description:
    "List jobs that came in from email alerts (New jobs inbox, trackingStatus=inbox). Use when the user says new jobs, filter new work, filter jobs, screen/sort/narrow new jobs, roles from email, opportunities, listings, or 'any jobs for me'. Not the same as listOpenApplications (jobs they already saved/applied). Call this before proposeNewJobsTriage. After a non-empty list you must call proposeNewJobsTriage (filter = triage). Never invent ids or claim empty without calling this tool.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .default(15)
      .describe("Max inbox jobs to return (1–30, default 15)")
  }),
  outputSchema: z.object({
    jobs: z.array(
      z.object({
        id: z.string(),
        companyName: z.string(),
        title: z.string(),
        stage: z.string(),
        matchScore: z.number().nullable(),
        experienceYearsMin: z.number().nullable(),
        companyLogoUrl: z.string().nullable(),
        descriptionLength: z.number(),
        descriptionSnippet: z.string(),
        recruiterEmail: z.string().nullable(),
        sourceMessageId: z.string().nullable()
      })
    ),
    code: z.string().optional()
  }),
  execute: async ({ limit }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { jobs: [], code: "UNAUTHORIZED" };
    }
    const db = createDb();
    const rows = await runWithDb(db, () =>
      applicationRepository.findByUserIdAndTrackingStatus(userId, "inbox")
    );
    return {
      jobs: rows.slice(0, limit ?? 15).map((r) => {
        const description = r.description ?? "";
        return {
          id: r.id,
          companyName: r.companyName,
          title: r.title,
          stage: r.stage,
          matchScore: r.matchScore ?? null,
          experienceYearsMin: r.experienceYearsMin ?? null,
          companyLogoUrl: r.companyLogoUrl ?? null,
          descriptionLength: description.length,
          descriptionSnippet: description.slice(0, 280),
          recruiterEmail: r.recruiterEmail ?? null,
          sourceMessageId: r.sourceMessageId ?? null
        };
      })
    };
  }
});
