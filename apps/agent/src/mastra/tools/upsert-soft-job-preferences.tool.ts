import { randomUUID } from "node:crypto";

import { createTool } from "@mastra/core/tools";

import {
  applySoftJobPreferencePatch,
  defaultJobPreference,
  jobPreferencesEqual,
  JobPreferenceFieldsSchema,
  normalizeLocations,
  normalizeRemoteRegions,
  normalizeWorkModes,
  UpsertSoftJobPreferencesInputSchema,
  UpsertSoftJobPreferencesOutputSchema,
  type JobPreference,
  type LevelFloor,
  type WorkMode
} from "@tsu-stack/core";
import {
  createDb,
  jobPreferenceRepository,
  runWithDb,
  type JobPreferenceEntity
} from "@tsu-stack/db";

import { createAgentLogger } from "#@/mastra/agent-logger";

function rowToPreference(row: JobPreferenceEntity): JobPreference {
  return {
    workModes: (row.workModes ?? []) as WorkMode[],
    locations: row.locations ?? [],
    remoteRegions: row.remoteRegions ?? [],
    roleKeywords: row.roleKeywords ?? [],
    excludeKeywords: row.excludeKeywords ?? [],
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    levelFloor: (row.levelFloor as LevelFloor | null) ?? null,
    minMatchScore: row.minMatchScore,
    titleId: row.titleId as JobPreference["titleId"],
    customTitle: row.customTitle ?? null,
    jobsPerRun: row.jobsPerRun ?? 25,
    dailyBoardScoreCap: row.dailyBoardScoreCap ?? 50,
    importFromEmail: row.importFromEmail ?? false,
    reviewApplyKit: row.reviewApplyKit ?? true
  };
}

function toOutputPreferences(prefs: JobPreference) {
  return JobPreferenceFieldsSchema.parse(prefs);
}

/**
 * Immediate search-loop writes. Hard stops (salary, exclude, levelFloor) are
 * schema-excluded — use propose-hard-preference-change instead.
 */
export const upsertSoftJobPreferencesTool = createTool({
  id: "upsert-soft-job-preferences",
  description:
    "Immediately write soft job preferences: title pack, custom title, role keywords, work modes, locations, remote regions. List fields use { op: add|remove|set, values }. Use add to append, set to replace (e.g. remote EU only → remoteRegions set). Do NOT send salary, exclude keywords, or level floor — those require propose-hard-preference-change. Do not call upsert-job-preferences. Tenant from session only.",
  inputSchema: UpsertSoftJobPreferencesInputSchema,
  outputSchema: UpsertSoftJobPreferencesOutputSchema,
  execute: async (input, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, preferences: null };
    }

    const db = createDb();
    return runWithDb(db, async () => {
      const existing = await jobPreferenceRepository.findByUserId(userId);
      const current = existing ? rowToPreference(existing) : defaultJobPreference();
      const merged = applySoftJobPreferencePatch(current, input);
      const next: JobPreference = {
        ...merged,
        workModes: normalizeWorkModes(merged.workModes),
        locations: normalizeLocations(merged.locations),
        remoteRegions: normalizeRemoteRegions(merged.remoteRegions)
      };

      if (next.titleId === "custom") {
        const title = next.customTitle?.trim() ?? "";
        if (title.length === 0 || next.roleKeywords.length < 2) {
          return { ok: false, preferences: existing ? toOutputPreferences(current) : null };
        }
      }

      if (jobPreferencesEqual(next, current)) {
        if (!existing) return { ok: false, preferences: null };
        return { ok: true, preferences: toOutputPreferences(current) };
      }

      const hadMarkdown = Boolean(existing?.searchBriefMarkdown);
      const row = await jobPreferenceRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        workModes: next.workModes,
        locations: next.locations,
        remoteRegions: next.remoteRegions,
        roleKeywords: next.roleKeywords,
        excludeKeywords: next.excludeKeywords,
        salaryMin: next.salaryMin,
        salaryCurrency: next.salaryCurrency,
        levelFloor: next.levelFloor,
        minMatchScore: next.minMatchScore,
        titleId: next.titleId,
        customTitle: next.customTitle,
        jobsPerRun: next.jobsPerRun,
        dailyBoardScoreCap: next.dailyBoardScoreCap,
        importFromEmail: next.importFromEmail,
        reviewApplyKit: next.reviewApplyKit
      });
      await jobPreferenceRepository.clearSearchBrief(userId);
      const log = createAgentLogger({ operation: "agent__search_brief" });
      log.set({
        event: "search_brief_invalidated",
        userId,
        source: "hub",
        hadMarkdown
      });
      log.emit();
      return { ok: true, preferences: toOutputPreferences(rowToPreference(row)) };
    });
  }
});
