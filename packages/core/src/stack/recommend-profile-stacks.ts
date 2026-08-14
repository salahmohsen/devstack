/**
 * Featured-on-profile picks for organize (public stack row + resume Skills).
 * Tight set — not the full portfolio. LLM can refine; this is the fallback.
 */

import { normalizeStackType, STACK_NOISE_TYPES } from "#@/stack/stack-type";

/** Types that usually belong on a resume / profile skills row. */
export const FEATURED_PROFILE_TYPES = new Set([
  "language",
  "framework",
  "ui",
  "state management",
  "database",
  "auth",
  "ai"
]);

/** Secondary types allowed only when they are actually used. */
const FEATURED_SECONDARY_TYPES = new Set(["deployment", "storage"]);

/**
 * Names hiring managers expect on a skills row. Boost only — never a hard
 * allowlist (custom/internal stacks can still be featured).
 */
const RESUME_STAPLE_NAMES = new Set([
  "typescript",
  "javascript",
  "python",
  "go",
  "golang",
  "rust",
  "java",
  "kotlin",
  "swift",
  "ruby",
  "php",
  "c#",
  "c++",
  "react",
  "next.js",
  "nextjs",
  "vue",
  "vue.js",
  "svelte",
  "angular",
  "solid",
  "node.js",
  "nodejs",
  "node",
  "deno",
  "bun",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "sqlite",
  "tailwind css",
  "tailwind",
  "graphql",
  "trpc",
  "prisma",
  "drizzle",
  "aws",
  "cloudflare",
  "vercel",
  "docker",
  "kubernetes",
  "openai",
  "anthropic",
  "mastra"
]);

export type FeaturedStackCandidate = {
  id: string;
  name?: string;
  type?: string | null;
  projectCount?: number;
  isFeatured?: boolean;
};

export const FEATURED_PROFILE_MAX = 12;
export const FEATURED_PROFILE_MIN = 6;
/** How many catalog rows we send the LLM (sort-head + already featured). */
export const FEATURED_PROFILE_PROMPT_WINDOW = 48;

export function featuredProfileCap(catalogSize: number): number {
  if (catalogSize <= 0) return 0;
  if (catalogSize <= 4) return catalogSize;
  return Math.min(
    FEATURED_PROFILE_MAX,
    Math.max(FEATURED_PROFILE_MIN, Math.round(catalogSize * 0.18))
  );
}

function stapleName(name: string | undefined): boolean {
  if (!name) return false;
  return RESUME_STAPLE_NAMES.has(name.trim().toLowerCase());
}

export function isFeaturedProfileType(type: string | null | undefined): boolean {
  const t = normalizeStackType(type);
  return FEATURED_PROFILE_TYPES.has(t);
}

function isSecondaryProfileType(type: string | null | undefined): boolean {
  return FEATURED_SECONDARY_TYPES.has(normalizeStackType(type));
}

function isNoiseType(type: string | null | undefined): boolean {
  return STACK_NOISE_TYPES.has(normalizeStackType(type));
}

export function sanitizeFeaturedStackIds(
  ids: Iterable<string>,
  survivingIds: Iterable<string>,
  max = FEATURED_PROFILE_MAX
): string[] {
  const allowed = new Set(survivingIds);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Map LLM 0-based indices onto a candidate window (same ordinal trick as sort).
 */
export function mapFeaturedIndices(
  candidates: Array<{ id: string }>,
  indices: number[],
  max = FEATURED_PROFILE_MAX
): string[] {
  const n = candidates.length;
  const seen = new Set<number>();
  const ids: string[] = [];
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= n || seen.has(i)) continue;
    seen.add(i);
    const id = candidates[i]?.id;
    if (!id) continue;
    ids.push(id);
    if (ids.length >= max) break;
  }
  return ids;
}

/**
 * Build the compact catalog the LLM ranks: sort-head + already-featured extras.
 */
export function featuredPromptWindow(
  stacks: FeaturedStackCandidate[],
  sortOrder: string[]
): FeaturedStackCandidate[] {
  const byId = new Map(stacks.map((s) => [s.id, s]));
  const out: FeaturedStackCandidate[] = [];
  const seen = new Set<string>();

  for (const id of sortOrder) {
    const s = byId.get(id);
    if (!s || seen.has(id)) continue;
    seen.add(id);
    out.push(s);
    if (out.length >= FEATURED_PROFILE_PROMPT_WINDOW) break;
  }

  for (const s of stacks) {
    if (seen.has(s.id)) continue;
    if (!s.isFeatured) continue;
    seen.add(s.id);
    out.push(s);
  }

  if (out.length === 0) {
    return [...stacks].toSorted((a, b) => (b.projectCount ?? 0) - (a.projectCount ?? 0));
  }
  return out;
}

function rankValue(s: FeaturedStackCandidate, sortRank: Map<string, number>, i: number): number {
  const order = sortRank.get(s.id) ?? 10_000 + i;
  const projects = s.projectCount ?? 0;
  const staple = stapleName(s.name) ? -40 : 0;
  const typeBoost = isFeaturedProfileType(s.type) ? -80 : isSecondaryProfileType(s.type) ? -20 : 40;
  const unused = projects === 0 ? 80 : 0;
  return order + unused + typeBoost + staple - Math.min(projects, 8) * 3;
}

/**
 * Deterministic featured-on-profile set (resume Skills row).
 * Prefers languages / frameworks / data / auth / AI used on real projects.
 */
export function recommendFeaturedStacks(
  stacks: FeaturedStackCandidate[],
  sortOrder: string[]
): Set<string> {
  const cap = featuredProfileCap(stacks.length);
  const include = new Set<string>();
  if (cap === 0) return include;

  const sortRank = new Map(sortOrder.map((id, i) => [id, i]));
  const ordered = [...stacks].toSorted(
    (a, b) => rankValue(a, sortRank, 0) - rankValue(b, sortRank, 1)
  );

  const canKeepExisting = (s: FeaturedStackCandidate) => {
    const projects = s.projectCount ?? 0;
    if (!s.isFeatured) return false;
    if (isNoiseType(s.type) && projects < 3) return false;
    return true;
  };

  for (const s of ordered) {
    if (include.size >= cap) break;
    if (canKeepExisting(s)) include.add(s.id);
  }

  const eligible = (s: FeaturedStackCandidate) => {
    if (include.has(s.id)) return false;
    const projects = s.projectCount ?? 0;
    if (projects < 1) return false;
    if (isNoiseType(s.type)) return false;
    if (isFeaturedProfileType(s.type)) return true;
    if (isSecondaryProfileType(s.type) && projects >= 2) return true;
    return stapleName(s.name) && projects >= 1;
  };

  for (const s of ordered) {
    if (include.size >= cap) break;
    if (eligible(s)) include.add(s.id);
  }

  if (include.size === 0) {
    for (const s of ordered) {
      if (include.size >= Math.min(4, cap, ordered.length)) break;
      if (isNoiseType(s.type) && (s.projectCount ?? 0) < 3) continue;
      include.add(s.id);
    }
  }

  return include;
}

/**
 * Prefer a valid LLM pick; fill short lists from the heuristic so the
 * profile row is never empty when the catalog has real product tech.
 */
/**
 * Hiring-manager prompt: pick a resume Skills row from a compact TSV window.
 * Indices only — same ordinal trick as organize sort.
 */
export function buildProfilePickPrompt(window: FeaturedStackCandidate[], cap: number): string {
  const lines = window
    .map((s, i) => {
      const featured = s.isFeatured ? "yes" : "no";
      return `${i}\t${s.name ?? "?"}\t${s.type ?? "other"}\t${s.projectCount ?? 0}\t${featured}`;
    })
    .join("\n");

  const limit = Math.min(FEATURED_PROFILE_MAX, Math.max(1, cap));

  return `You are a hiring manager who spends 8 seconds on an engineer's public profile.

The profile has one tight "featured stacks" row — the same idea as a resume Skills line.
Pick ONLY the headline technologies this person should lead with. Fewer and sharper is better.

Catalog TSV: index, name, type, projects, already_featured
${lines}

Include:
- Languages they actually ship in
- Product frameworks / meta-frameworks they build with
- Primary database, auth, and at most 1–2 signature platforms (AI, cloud) they use on real projects

Exclude:
- Linters, formatters, test runners, coverage, husky, commit hooks
- Monorepo/build glue (turbo, nx, vite-only tooling), package managers, editors
- One-off utilities and tiny libraries nobody puts on a resume
- Duplicate products in the same family — keep the one with more projects (React vs Preact, Postgres vs Prisma unless Prisma is the only data story)

Cap: ${limit} stacks. Never more than ${FEATURED_PROFILE_MAX}.
If already_featured=yes and it still belongs, keep it. Do not keep featured lint/test noise.

Examples of YES: TypeScript, React, Next.js, PostgreSQL, Tailwind, Cloudflare
Examples of NO: ESLint, Prettier, Vitest, Husky, lodash, pnpm

Return JSON only: {"featured":[0,2,5],"rationale":"one short sentence"}`;
}

function dropNoisePicks(ids: string[], stacks: FeaturedStackCandidate[]): string[] {
  const byId = new Map(stacks.map((s) => [s.id, s]));
  return ids.filter((id) => {
    const s = byId.get(id);
    if (!s) return false;
    const projects = s.projectCount ?? 0;
    if (isNoiseType(s.type) && !(s.isFeatured && projects >= 3)) return false;
    return true;
  });
}

export function resolveFeaturedStackIds(input: {
  llmIds?: Iterable<string>;
  stacks: FeaturedStackCandidate[];
  sortOrder: string[];
}): string[] {
  const cap = featuredProfileCap(input.stacks.length);
  const surviving = input.stacks.map((s) => s.id);
  const fromLlm = dropNoisePicks(
    sanitizeFeaturedStackIds(input.llmIds ?? [], surviving, cap),
    input.stacks
  );
  const minimumKeep = Math.min(3, cap, input.stacks.length);

  if (fromLlm.length >= minimumKeep) return fromLlm;

  const heuristic = recommendFeaturedStacks(input.stacks, input.sortOrder);
  return sanitizeFeaturedStackIds([...fromLlm, ...heuristic], surviving, cap);
}
