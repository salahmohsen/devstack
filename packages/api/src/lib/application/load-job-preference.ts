import { DEFAULT_MIN_MATCH_SCORE, defaultJobPreference, type JobPreference } from "@tsu-stack/core";
import { jobPreferenceRepository } from "@tsu-stack/db";

export async function loadJobPreference(userId: string): Promise<JobPreference> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  if (!row) return defaultJobPreference();
  return {
    workModes: row.workModes ?? [],
    locations: row.locations ?? [],
    roleKeywords: row.roleKeywords ?? [],
    excludeKeywords: row.excludeKeywords ?? [],
    salaryMin: row.salaryMin,
    salaryCurrency: row.salaryCurrency,
    minMatchScore: row.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE
  };
}
