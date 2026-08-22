import { CLOSE_SKILL_FAMILIES, collectSurfaceKeys } from "#@/application/job-skills";

export type HeldSkill = {
  id?: string;
  name: string;
  aliases?: readonly string[];
};

export type HeldSkillWithId = HeldSkill & { id: string };

export type ClassifiedJobSkills = {
  available: boolean;
  have: string[];
  close: { name: string; via: string }[];
  missing: string[];
  percent: number | null;
};

function familyOfSurfaces(surfaces: Set<string>): readonly string[] | null {
  for (const family of CLOSE_SKILL_FAMILIES) {
    if (family.some((member) => surfaces.has(member))) return family;
  }
  return null;
}

export function classifyJobSkills(input: {
  jobSkills: readonly string[];
  held: readonly HeldSkill[];
}): ClassifiedJobSkills {
  const jobSkills = input.jobSkills.map((skill) => skill.trim()).filter(Boolean);
  if (jobSkills.length === 0) {
    return { available: false, have: [], close: [], missing: [], percent: null };
  }

  const heldKeys = new Set<string>();
  const heldVia: { keys: Set<string>; name: string }[] = [];
  for (const row of input.held) {
    const keys = collectSurfaceKeys(row.name, row.aliases ?? []);
    for (const key of keys) heldKeys.add(key);
    heldVia.push({ keys, name: row.name });
  }

  const have: string[] = [];
  const close: { name: string; via: string }[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    const surfaces = collectSurfaceKeys(skill);
    if ([...surfaces].some((key) => heldKeys.has(key))) {
      have.push(skill);
      continue;
    }
    const family = familyOfSurfaces(surfaces);
    let via: string | null = null;
    if (family) {
      for (const row of heldVia) {
        const hit = family.find((member) => row.keys.has(member) && !surfaces.has(member));
        if (hit) {
          via = row.name;
          break;
        }
      }
    }
    if (via) close.push({ name: skill, via });
    else missing.push(skill);
  }

  return {
    available: true,
    have,
    close,
    missing,
    percent: Math.round((have.length / jobSkills.length) * 100)
  };
}
