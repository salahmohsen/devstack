import { randomUUID } from "node:crypto";

import {
  defaultJobPreference,
  defaultJobPreferenceOutput,
  JobPreferenceOutputSchema,
  mergeJobPreference,
  normalizeWorkModes,
  refineJobsPerRun,
  UpsertJobPreferenceInputSchema,
  type JobPreference,
  type JobTitleId,
  type WorkMode
} from "@tsu-stack/core";
import { jobPreferenceRepository } from "@tsu-stack/db";
import { type StoredWorkMode } from "@tsu-stack/db/schema";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toOutput(
  row: NonNullable<Awaited<ReturnType<typeof jobPreferenceRepository.findByUserId>>>
) {
  return JobPreferenceOutputSchema.parse({
    workModes: row.workModes,
    locations: row.locations,
    roleKeywords: row.roleKeywords,
    excludeKeywords: row.excludeKeywords,
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    minMatchScore: row.minMatchScore,
    titleId: (row.titleId as JobTitleId | null) ?? null,
    customTitle: row.customTitle ?? null,
    jobsPerRun: refineJobsPerRun(row.jobsPerRun ?? 25),
    importFromEmail: row.importFromEmail ?? false,
    updatedAt: row.updatedAt
  });
}

function rowToPreference(
  row: NonNullable<Awaited<ReturnType<typeof jobPreferenceRepository.findByUserId>>>
): JobPreference {
  return {
    workModes: row.workModes as WorkMode[],
    locations: row.locations,
    roleKeywords: row.roleKeywords,
    excludeKeywords: row.excludeKeywords,
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    minMatchScore: row.minMatchScore,
    titleId: (row.titleId as JobTitleId | null) ?? null,
    customTitle: row.customTitle ?? null,
    jobsPerRun: refineJobsPerRun(row.jobsPerRun ?? 25),
    importFromEmail: row.importFromEmail ?? false
  };
}

export const jobPreferenceRouter = {
  get: protectedProcedure
    .route({
      description: "Get job preferences for the current user (defaults when unset)",
      method: "GET"
    })
    .output(JobPreferenceOutputSchema)
    .handler(async ({ context }) => {
      const row = await jobPreferenceRepository.findByUserId(context.session.user.id);
      if (!row) return defaultJobPreferenceOutput();
      return toOutput(row);
    }),

  upsert: protectedProcedure
    .route({
      description: "Create or update job preferences for mail harvest match filtering",
      method: "POST"
    })
    .input(UpsertJobPreferenceInputSchema)
    .output(JobPreferenceOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await jobPreferenceRepository.findByUserId(userId);
      const base = existing ? rowToPreference(existing) : defaultJobPreference();
      const merged = mergeJobPreference(base, input);
      const workModes = normalizeWorkModes(merged.workModes);

      const row = await jobPreferenceRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        workModes: workModes as StoredWorkMode[],
        locations: merged.locations,
        roleKeywords: merged.roleKeywords,
        excludeKeywords: merged.excludeKeywords,
        salaryMin: merged.salaryMin,
        salaryCurrency: merged.salaryCurrency,
        minMatchScore: merged.minMatchScore,
        titleId: merged.titleId,
        customTitle: merged.customTitle,
        jobsPerRun: refineJobsPerRun(merged.jobsPerRun),
        importFromEmail: merged.importFromEmail
      });

      return toOutput(row);
    })
};
