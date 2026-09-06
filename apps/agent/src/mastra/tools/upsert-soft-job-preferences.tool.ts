import { randomUUID } from "node:crypto";

import { createTool } from "@mastra/core/tools";

import {
  applySoftJobPreferencePatch,
  defaultJobPreference,
  jobPreferencesEqual,
  JobPreferenceFieldsSchema,
  normalizeWorkModes,
  UpsertSoftJobPreferencesInputSchema,
  UpsertSoftJobPreferencesOutputSchema,
  type JobPreference,
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
    roleKeywords: row.roleKeywords ?? [],
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    minMatchScore: row.minMatchScore,
    dailyBoardScoreCap: row.dailyBoardScoreCap ?? 50,
    importFromEmail: row.importFromEmail ?? false,
    reviewApplyKit: row.reviewApplyKit ?? true
  };
}

function toOutputPreferences(prefs: JobPreference) {
  return JobPreferenceFieldsSchema.parse(prefs);
}

/**
 * Immediate search-loop writes. Hard stops (salary) are schema-excluded —
 * use propose-hard-preference-change instead.
 */
export const upsertSoftJobPreferencesTool = createTool({
  id: "upsert-soft-job-preferences",
  description:
    "Immediately write soft job preferences: role keywords, work modes. List fields use { op: add|remove|set, values }. Use add to append, set to replace. Do NOT send salary — that requires propose-hard-preference-change. Do not call upsert-job-preferences. Tenant from session only.",
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
        workModes: normalizeWorkModes(merged.workModes)
      };

      if (jobPreferencesEqual(next, current)) {
        if (!existing) return { ok: false, preferences: null };
        return { ok: true, preferences: toOutputPreferences(current) };
      }

      const hadMarkdown = Boolean(existing?.searchBriefMarkdown);
      const row = await jobPreferenceRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        workModes: next.workModes,
        roleKeywords: next.roleKeywords,
        salaryMin: next.salaryMin,
        salaryCurrency: next.salaryCurrency,
        minMatchScore: next.minMatchScore,
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
