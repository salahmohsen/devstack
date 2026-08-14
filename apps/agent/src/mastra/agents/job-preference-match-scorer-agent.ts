import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { JOB_PREFERENCE_MATCH_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/**
 * Scores harvested jobs against the seeker's JobPreference.
 * Skill-driven AI judgment only.
 */
export function createJobPreferenceMatchScorerAgent() {
  return new Agent({
    id: "job-preference-match-scorer",
    name: "Job Preference Match Scorer",
    description:
      "Scores each harvested job 0–100 against seeker preferences using the job-preference-match skill.",
    instructions: `You rank job listings for ONE job seeker.

Always activate the **job-preference-match** skill before scoring.
Score EVERY job; never invent listingUrls.
Return structured output only via the schema.

JobPreference.workModes is a multi-select array (OR semantics): empty = no mode filter;
match when the job's single workMode is any of the preferred modes. Soft-penalize only when
the job mode is known and outside the preferred set. Never use only workModes[0].

When roleKeywords are empty, use SeekerProfileEvidence (experience titles, stacks, projects)
to judge craft fit. Fail orthogonal careers. Generic "engineer"/"developer" is not enough.`,
    skills: [WRITE_SKILLS_PATH, JOB_PREFERENCE_MATCH_SKILL_PATH],
    model: byoModelFromRequestContext
  });
}

export default createJobPreferenceMatchScorerAgent;
