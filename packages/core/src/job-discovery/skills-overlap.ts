import { classifyJobSkills } from "#@/job-discovery/skill-match";

export type SkillsOverlap = {
  available: boolean;
  matched: string[];
  missing: string[];
  percent: number | null;
};

export function skillsOverlap(input: {
  jobSkills: readonly string[];
  stackNames: readonly string[];
}): SkillsOverlap {
  const classified = classifyJobSkills({
    jobSkills: input.jobSkills,
    held: input.stackNames.map((name) => {
      return { name };
    })
  });
  return {
    available: classified.available,
    matched: classified.have,
    missing: classified.missing,
    percent: classified.percent
  };
}
