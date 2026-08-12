/**
 * Canonical stack type vocabulary + display/order helpers.
 * Single source for resume PDF, organize sort, and UI labels.
 */

/** Resume / importance foundation order (most foundational first). */
export const STACK_TYPE_ORDER = [
  "language",
  "framework",
  "ui",
  "state management",
  "database",
  "auth",
  "ai",
  "deployment",
  "storage",
  "testing",
  "tooling",
  "other"
] as const;

export type StackTypeSlug = (typeof STACK_TYPE_ORDER)[number];

/** Lower rank = more foundational (derived from {@link STACK_TYPE_ORDER}). */
export const STACK_TYPE_IMPORTANCE_RANK: Record<string, number> = Object.fromEntries(
  STACK_TYPE_ORDER.map((type, i) => [type, i])
);

/** Display labels for known types (resume PDF + stack UI). */
export const STACK_TYPE_LABELS: Record<string, string> = {
  framework: "Framework",
  language: "Language",
  database: "Database",
  ui: "UI",
  auth: "Auth",
  deployment: "Deployment",
  testing: "Testing",
  ai: "AI",
  tooling: "Tooling",
  storage: "Storage",
  "state management": "State Management",
  other: "Other"
};

/** Types usually excluded from resume/portfolio by default. */
export const STACK_NOISE_TYPES = new Set(["tooling", "testing"]);

export function normalizeStackType(type: string | null | undefined): string {
  const normalized = type?.trim().toLowerCase();
  return (normalized && normalized.length > 0 ? normalized : "other").replace(/_/g, " ");
}

/** Title-case / acronym-aware label for PDF and UI. */
export function formatStackTypeLabel(type: string): string {
  const t = normalizeStackType(type);
  if (!t) return "Other";
  if (STACK_TYPE_LABELS[t]) return STACK_TYPE_LABELS[t]!;
  const ACRONYMS = new Set(["ui", "ai", "css", "html", "api", "db"]);
  return t
    .split(/[\s_/-]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Default portfolio inclusion after organize:
 * importance sort + project use; tooling/testing noise down-ranked.
 */
export function recommendPortfolioInclusion(
  stacks: Array<{
    id: string;
    type?: string | null;
    projectCount?: number;
    includedInPortfolio?: boolean;
  }>,
  sortOrder: string[]
): Set<string> {
  const rank = new Map(sortOrder.map((id, i) => [id, i]));
  const ordered = [...stacks].toSorted((a, b) => {
    const ar = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const br = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    return (b.projectCount ?? 0) - (a.projectCount ?? 0);
  });

  const n = ordered.length;
  const importantCutoff =
    sortOrder.length > 0
      ? Math.max(6, Math.ceil(Math.min(sortOrder.length, n) * 0.4))
      : Math.max(6, Math.ceil(n * 0.4));

  const include = new Set<string>();
  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i]!;
    const type = normalizeStackType(s.type);
    const isNoise = STACK_NOISE_TYPES.has(type);
    const projects = s.projectCount ?? 0;
    const importanceRank = rank.get(s.id);
    const inTopBand =
      importanceRank !== undefined ? importanceRank < importantCutoff : i < importantCutoff;

    if (isNoise && projects < 2 && !inTopBand) continue;
    if (inTopBand || projects >= 2 || (!isNoise && projects >= 1)) {
      include.add(s.id);
    }
  }

  if (include.size === 0 && ordered.length > 0) {
    for (const s of ordered.slice(0, Math.min(6, ordered.length))) {
      include.add(s.id);
    }
  }

  return include;
}
