import { z } from "zod";

export const JobSkillBandSchema = z.enum(["required", "preferred"]);
export type JobSkillBand = z.infer<typeof JobSkillBandSchema>;

export const JobSkillTagSchema = z.object({
  name: z.string(),
  stackId: z.string().nullable(),
  band: JobSkillBandSchema
});
export type JobSkillTag = z.infer<typeof JobSkillTagSchema>;

/** Trim, lowercase, collapse internal whitespace for exact name match. */
export function normalizeJobSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve extracted skill names against the user's stacks.
 * Exact normalized name only — never auto-creates stacks. First stack wins on collisions.
 */
export function resolveJobSkillTags(
  names: { name: string; band: JobSkillBand }[],
  stacks: { id: string; name: string }[]
): JobSkillTag[] {
  const stackIdByNormalizedName = new Map<string, string>();
  for (const stack of stacks) {
    const key = normalizeJobSkillName(stack.name);
    if (!key || stackIdByNormalizedName.has(key)) continue;
    stackIdByNormalizedName.set(key, stack.id);
  }

  return names.map((entry) => {
    const key = normalizeJobSkillName(entry.name);
    const stackId = key ? (stackIdByNormalizedName.get(key) ?? null) : null;
    return {
      name: entry.name,
      stackId,
      band: entry.band
    };
  });
}
