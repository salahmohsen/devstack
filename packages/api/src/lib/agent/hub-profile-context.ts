import { mergeExperienceYears } from "@tsu-stack/core";
import { experienceRepository, projectRepository, stackRepository } from "@tsu-stack/db";

import { loadJobPreference } from "#@/lib/application/load-job-preference";

export async function loadHubProfileContext(userId: string): Promise<string> {
  const [experiences, projects, stacks, preferences] = await Promise.all([
    experienceRepository.findAllByUserId(userId),
    projectRepository.findAllByUserId(userId),
    stackRepository.findAllByUserId(userId),
    loadJobPreference(userId)
  ]);

  return JSON.stringify({
    asOf: new Date().toISOString().slice(0, 10),
    experienceYears: mergeExperienceYears(experiences),
    totals: { experiences: experiences.length, projects: projects.length, skills: stacks.length },
    experiences: experiences.map((row) => {
      return {
        title: row.title,
        organization: row.organization,
        fromDate: row.fromDate,
        toDate: row.toDate,
        isPresent: row.isPresent,
        description: row.description?.slice(0, 1200) ?? null
      };
    }),
    projects: projects.slice(0, 20).map((row) => {
      return {
        title: row.title,
        summary: row.summary?.slice(0, 500) ?? null,
        skills: (row.stacks ?? []).map((link) => link.stack?.name).filter(Boolean)
      };
    }),
    skills: stacks.slice(0, 100).map((row) => row.name),
    preferences
  });
}

export async function loadOptionalHubProfileContext(userId: string): Promise<string | undefined> {
  try {
    return await loadHubProfileContext(userId);
  } catch {
    return undefined;
  }
}
