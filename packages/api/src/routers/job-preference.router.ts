import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  defaultJobPreference,
  defaultJobPreferenceOutput,
  GetSearchBriefOutputSchema,
  hasValidRoleQuery,
  JobPreferenceOutputSchema,
  ResetBoardScoresTodayOutputSchema,
  mergeJobPreference,
  normalizeLocations,
  normalizeRemoteRegions,
  normalizeWorkModes,
  refineDailyBoardScoreCap,
  UpsertJobPreferenceInputSchema,
  type JobPreference,
  type LevelFloor,
  type WorkMode
} from "@tsu-stack/core";
import {
  jobPreferenceRepository,
  userJobAiBudgetRepository,
  type JobPreferenceFacetData
} from "@tsu-stack/db";
import { type StoredLevelFloor, type StoredWorkMode } from "@tsu-stack/db/schema";
import { createLogger } from "@tsu-stack/logger/server";

import {
  BriefWriteInvalidateSourceSchema,
  ensureSearchBrief,
  invalidateSearchBrief
} from "#@/lib/application/search-brief";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { protectedProcedure } from "#@/lib/procedures/factory";

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function toOutput(
  row: NonNullable<Awaited<ReturnType<typeof jobPreferenceRepository.findByUserId>>>,
  boardScoresUsedToday: number
) {
  return JobPreferenceOutputSchema.parse({
    workModes: row.workModes,
    locations: row.locations,
    remoteRegions: row.remoteRegions ?? [],
    roleKeywords: row.roleKeywords,
    excludeKeywords: row.excludeKeywords,
    regions: row.regions ?? null,
    countries: row.countries ?? null,
    cities: row.cities ?? null,
    categories: row.categories ?? null,
    skills: row.skills ?? null,
    seniority: row.seniority ?? null,
    experienceYearsMin: row.experienceYearsMin ?? null,
    experienceYearsMax: row.experienceYearsMax ?? null,
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    employmentTypes: row.employmentTypes ?? null,
    companyTypes: row.companyTypes ?? null,
    companySizes: row.companySizes ?? null,
    domains: row.domains ?? null,
    collections: row.collections ?? null,
    reality: row.reality ?? null,
    openWithinDays: row.openWithinDays ?? null,
    visaSponsorship: row.visaSponsorship ?? null,
    requiresClearance: row.requiresClearance ?? null,
    levelFloor: (row.levelFloor as LevelFloor | null) ?? null,
    minMatchScore: row.minMatchScore,
    titleId: row.titleId ?? null,
    customTitle: row.customTitle ?? null,
    jobsPerRun: row.jobsPerRun ?? 25,
    dailyBoardScoreCap: refineDailyBoardScoreCap(row.dailyBoardScoreCap ?? 50),
    importFromEmail: row.importFromEmail ?? false,
    reviewApplyKit: row.reviewApplyKit ?? true,
    updatedAt: row.updatedAt,
    boardScoresUsedToday
  });
}

function rowToPreference(
  row: NonNullable<Awaited<ReturnType<typeof jobPreferenceRepository.findByUserId>>>
): JobPreference {
  return {
    workModes: row.workModes as WorkMode[],
    locations: row.locations,
    remoteRegions: row.remoteRegions ?? [],
    roleKeywords: row.roleKeywords,
    excludeKeywords: row.excludeKeywords,
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    levelFloor: (row.levelFloor as LevelFloor | null) ?? null,
    minMatchScore: row.minMatchScore,
    titleId: row.titleId ?? null,
    customTitle: row.customTitle ?? null,
    jobsPerRun: row.jobsPerRun ?? 25,
    dailyBoardScoreCap: refineDailyBoardScoreCap(row.dailyBoardScoreCap ?? 50),
    importFromEmail: row.importFromEmail ?? false,
    reviewApplyKit: row.reviewApplyKit ?? true
  };
}

function facetDataFromMerged(
  merged: ReturnType<typeof mergeJobPreference>
): JobPreferenceFacetData {
  return {
    regions: merged.regions,
    countries: merged.countries,
    cities: merged.cities,
    categories: merged.categories,
    skills: merged.skills,
    seniority: merged.seniority,
    experienceYearsMin: merged.experienceYearsMin,
    experienceYearsMax: merged.experienceYearsMax,
    employmentTypes: merged.employmentTypes,
    companyTypes: merged.companyTypes,
    companySizes: merged.companySizes,
    domains: merged.domains,
    collections: merged.collections,
    openWithinDays: merged.openWithinDays,
    reality: merged.reality,
    visaSponsorship: merged.visaSponsorship,
    requiresClearance: merged.requiresClearance
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
      const userId = context.session.user.id;
      const [row, boardScoresUsedToday] = await Promise.all([
        jobPreferenceRepository.findByUserId(userId),
        userJobAiBudgetRepository.attemptsForDay(userId, utcDay())
      ]);
      if (!row) {
        return { ...defaultJobPreferenceOutput(), boardScoresUsedToday };
      }
      return toOutput(row, boardScoresUsedToday);
    }),

  upsert: protectedProcedure
    .route({
      description: "Create or update job preferences for discovery and harvest filtering",
      method: "POST"
    })
    .input(
      UpsertJobPreferenceInputSchema.and(
        z.object({
          briefInvalidateSource: BriefWriteInvalidateSourceSchema.optional()
        })
      )
    )
    .output(JobPreferenceOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await jobPreferenceRepository.findByUserId(userId);
      const base = existing ? rowToPreference(existing) : defaultJobPreference();
      const merged = mergeJobPreference(base, input);
      const workModes = normalizeWorkModes(merged.workModes);
      const locations = normalizeLocations(merged.locations);
      const remoteRegions = normalizeRemoteRegions(merged.remoteRegions);

      const row = await jobPreferenceRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        workModes: workModes as StoredWorkMode[],
        locations,
        remoteRegions,
        roleKeywords: merged.roleKeywords,
        excludeKeywords: merged.excludeKeywords,
        salaryMin: merged.salaryMin,
        salaryCurrency: merged.salaryCurrency,
        levelFloor: merged.levelFloor as StoredLevelFloor | null,
        minMatchScore: merged.minMatchScore,
        titleId: merged.titleId,
        customTitle: merged.customTitle,
        jobsPerRun: merged.jobsPerRun,
        dailyBoardScoreCap: refineDailyBoardScoreCap(merged.dailyBoardScoreCap),
        importFromEmail: merged.importFromEmail,
        reviewApplyKit: merged.reviewApplyKit,
        facets: facetDataFromMerged(merged)
      });

      const [, boardScoresUsedToday] = await Promise.all([
        invalidateSearchBrief(userId, input.briefInvalidateSource ?? "settings"),
        userJobAiBudgetRepository.attemptsForDay(userId, utcDay())
      ]);

      // Immediate land so newly saved facets reach the shelf without waiting
      // for the next fetch tick. Hourly runId bucket coalesces repeated saves.
      // Fail-soft: never fail the save when the queue is off.
      if (hasValidRoleQuery({ roleKeywords: merged.roleKeywords, categories: merged.categories })) {
        try {
          await requestJobDiscoveryLand({
            userId,
            runId: `save_${new Date().toISOString().slice(0, 13)}`,
            trigger: "backfill"
          });
        } catch (error) {
          const log = createLogger({ operation: "api__job_preference_save_land_enqueue", userId });
          log.error(error instanceof Error ? error : new Error(String(error)), {
            event: "job_preference_save_land_enqueue_failed"
          });
          log.emit({ _forceKeep: true });
        }
      }

      return toOutput(row, boardScoresUsedToday);
    }),

  resetBoardScoresToday: protectedProcedure
    .route({
      description: "Clear today's board-search score count so Find jobs now can run again",
      method: "POST"
    })
    .output(ResetBoardScoresTodayOutputSchema)
    .handler(async ({ context }) => {
      await userJobAiBudgetRepository.resetForDay(context.session.user.id, utcDay());
      return { boardScoresUsedToday: 0 };
    }),

  ensureBrief: protectedProcedure
    .route({
      description: "Rebuild the search brief cache if stale and return markdown",
      method: "POST"
    })
    .output(GetSearchBriefOutputSchema)
    .handler(async ({ context }) => {
      const result = await ensureSearchBrief(context.session.user.id);
      return {
        markdown: result.markdown,
        hash: result.hash,
        structured: result.structured,
        proseSkipped: result.proseSkipped,
        rebuilt: result.rebuilt,
        previousMarkdown: result.previousMarkdown
      };
    })
};
