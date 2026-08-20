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
  const jobSkills = input.jobSkills.map((s) => s.trim()).filter(Boolean);
  if (jobSkills.length === 0) {
    return { available: false, matched: [], missing: [], percent: null };
  }
  const held = new Set(input.stackNames.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of jobSkills) {
    if (held.has(skill.toLowerCase())) matched.push(skill);
    else missing.push(skill);
  }
  return {
    available: true,
    matched,
    missing,
    percent: Math.round((matched.length / jobSkills.length) * 100)
  };
}
