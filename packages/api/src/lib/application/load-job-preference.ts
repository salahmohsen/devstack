import {
  DEFAULT_MIN_MATCH_SCORE,
  defaultJobPreference,
  type JobPreference,
  type JobTitleId,
  type LevelFloor
} from "@tsu-stack/core";
import { jobPreferenceRepository } from "@tsu-stack/db";

export async function loadJobPreference(userId: string): Promise<JobPreference> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  if (!row) return defaultJobPreference();
  return {
    workModes: row.workModes ?? [],
    locations: row.locations ?? [],
    remoteRegions: row.remoteRegions ?? [],
    roleKeywords: row.roleKeywords ?? [],
    excludeKeywords: row.excludeKeywords ?? [],
    salaryMin: row.salaryMin,
    salaryCurrency: row.salaryCurrency,
    levelFloor: (row.levelFloor as LevelFloor | null) ?? null,
    minMatchScore: row.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE,
    titleId: (row.titleId as JobTitleId | null) ?? null,
    customTitle: row.customTitle ?? null,
    jobsPerRun: row.jobsPerRun ?? 25,
    importFromEmail: row.importFromEmail ?? false
  };
}
