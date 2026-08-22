import {
  CANONICAL_SKILL_ALIASES,
  CLOSE_SKILL_FAMILIES,
  normalizeJobSkillName
} from "#@/application/job-skills";

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

function collectSurfaceKeys(name: string, aliases: readonly string[] = []): Set<string> {
  const keys = new Set<string>();
  const add = (raw: string) => {
    const key = normalizeJobSkillName(raw);
    if (key) keys.add(key);
  };
  add(name);
  for (const alias of aliases) add(alias);
  const nameKey = normalizeJobSkillName(name);
  for (const [canonical, extras] of Object.entries(CANONICAL_SKILL_ALIASES)) {
    const family = [canonical, ...extras].map(normalizeJobSkillName);
    if (
      family.includes(nameKey) ||
      extras.some((extra) => keys.has(normalizeJobSkillName(extra)))
    ) {
      for (const member of family) keys.add(member);
    }
  }
  return keys;
}

function familyOfSurfaces(surfaces: Set<string>): readonly string[] | null {
  for (const family of CLOSE_SKILL_FAMILIES) {
    if (family.some((member) => surfaces.has(member))) return family;
  }
  return null;
}

/**
 * Exact name/alias or a unique `CANONICAL_SKILL_ALIASES` hit onto one catalog
 * row. Never prefix/suffix (`Java` ↛ `JavaScript`). Collisions and empty
 * catalog return null — Enter must not confirm a guess.
 */
export function preselectHeldSkillForAlias(
  token: string,
  held: readonly HeldSkillWithId[]
): string | null {
  if (held.length === 0) return null;
  const tokenKey = normalizeJobSkillName(token);
  if (!tokenKey) return null;

  const hits = new Set<string>();
  for (const row of held) {
    if (collectSurfaceKeys(row.name, row.aliases ?? []).has(tokenKey)) {
      hits.add(row.id);
      if (hits.size > 1) return null;
    }
  }
  if (hits.size !== 1) return null;
  return hits.values().next().value ?? null;
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
