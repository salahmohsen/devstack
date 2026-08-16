import { z } from "zod";

import { parseCanonicalStackNames } from "#@/stack/canonical-stack-names";

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

const MIN_SKILL_MENTION_CHARS = 3;

/** Languages/fundamentals that are not portfolio "products" but show up in JDs. */
const WEB_FUNDAMENTAL_SKILL_NAMES = ["HTML", "CSS", "JavaScript"] as const;

/**
 * Alternate JD spellings → canonical display name.
 * Longest pattern wins at match time (`React Query` before `React`).
 */
const CANONICAL_SKILL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  React: ["React.js", "ReactJS"],
  Vue: ["Vue.js", "VueJS"],
  Angular: ["Angular.js", "AngularJS"],
  "Next.js": ["NextJS", "Next js"],
  Nuxt: ["Nuxt.js", "NuxtJS"],
  "Node.js": ["NodeJS", "Node.js"],
  "Tailwind CSS": ["Tailwind", "TailwindCSS"],
  "TanStack Query": ["React Query", "react-query"],
  "Styled Components": ["styled-components"],
  TypeScript: ["Typescript"],
  PostgreSQL: ["Postgres"],
  "Framer Motion": ["Framer-Motion"]
};

type SkillMentionPattern = {
  display: string;
  pattern: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushUniqueName(out: string[], seen: Set<string>, name: string): void {
  const trimmed = name.trim();
  if (trimmed.length < MIN_SKILL_MENTION_CHARS) return;
  const key = normalizeJobSkillName(trimmed);
  if (!key || seen.has(key)) return;
  seen.add(key);
  out.push(trimmed.slice(0, 80));
}

/** Display names: caller extras (user stacks), then canonical products, then HTML/CSS/JS. */
export function buildJobSkillMentionNames(extraNames: readonly string[] = []): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of extraNames) pushUniqueName(out, seen, name);
  for (const name of parseCanonicalStackNames()) pushUniqueName(out, seen, name);
  for (const name of WEB_FUNDAMENTAL_SKILL_NAMES) pushUniqueName(out, seen, name);
  return out;
}

/**
 * Longest-first match patterns. Extra/user names keep their own spelling;
 * canonical names also match known aliases but emit the canonical display.
 */
export function buildJobSkillMentionPatterns(
  extraNames: readonly string[] = []
): SkillMentionPattern[] {
  const displays = buildJobSkillMentionNames(extraNames);
  const extraKeys = new Set(
    extraNames.map((name) => normalizeJobSkillName(name)).filter((key) => key.length > 0)
  );
  const entries: SkillMentionPattern[] = [];
  const seenPattern = new Set<string>();

  const add = (display: string, pattern: string) => {
    if (pattern.trim().length < MIN_SKILL_MENTION_CHARS) return;
    const key = normalizeJobSkillName(pattern);
    if (!key || seenPattern.has(key)) return;
    seenPattern.add(key);
    entries.push({ display, pattern });
  };

  for (const display of displays) {
    add(display, display);
    if (extraKeys.has(normalizeJobSkillName(display))) continue;
    const aliases = CANONICAL_SKILL_ALIASES[display];
    if (!aliases) continue;
    for (const alias of aliases) add(display, alias);
  }

  entries.sort((a, b) => b.pattern.length - a.pattern.length);
  return entries;
}

/** Pull catalog names from JD prose. Longest match wins. */
export function extractSkillMentions(
  text: string,
  extraNames: readonly string[] = []
): { required: string[]; preferred: string[] } {
  if (!text.trim()) return { required: [], preferred: [] };
  const patterns = buildJobSkillMentionPatterns(extraNames);
  if (patterns.length === 0) return { required: [], preferred: [] };
  const parts = text.split(/\b(?:nice to have|what you.?ll love|benefits)\b/i);
  const requiredHay = parts[0] ?? text;
  const preferredHay = parts.slice(1).join("\n");

  const collect = (hay: string): string[] => {
    const found: string[] = [];
    const foundKeys = new Set<string>();
    let remaining = hay;
    for (const { display, pattern } of patterns) {
      const re = new RegExp(escapeRegExp(pattern), "i");
      if (!re.test(remaining)) continue;
      const key = normalizeJobSkillName(display);
      if (!foundKeys.has(key)) {
        foundKeys.add(key);
        found.push(display);
      }
      remaining = remaining.replace(re, " ");
    }
    return found;
  };

  const required = collect(requiredHay);
  const requiredKeys = new Set(required.map((name) => normalizeJobSkillName(name)));
  const preferred = collect(preferredHay).filter(
    (name) => !requiredKeys.has(normalizeJobSkillName(name))
  );
  return { required, preferred };
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
