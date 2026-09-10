import {
  formatStackTypeLabel,
  normalizeStackType,
  STACK_TYPE_ORDER
} from "@tsu-stack/core/stack/stack-type";

/**
 * Group skills by `type` for the resume Skills section.
 * Unknown/null types land in "other". Order follows core {@link STACK_TYPE_ORDER}.
 */
export function groupStacksByType(
  stacks: Array<{ name: string; type?: string | null; sortOrder?: number }>
): Array<{ type: string; label: string; names: string[] }> {
  const map = new Map<string, Array<{ name: string; sortOrder: number; idx: number }>>();
  stacks.forEach((s, idx) => {
    const key = normalizeStackType(s.type);
    const list = map.get(key) ?? [];
    if (list.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) return;
    list.push({
      name: s.name,
      sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : Number.MAX_SAFE_INTEGER,
      idx
    });
    map.set(key, list);
  });

  const ordered: Array<{ type: string; label: string; names: string[] }> = [];
  const seen = new Set<string>();

  const namesFor = (type: string) => {
    const list = map.get(type);
    if (!list?.length) return [];
    return [...list]
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.idx - b.idx)
      .map((x) => x.name);
  };

  for (const type of STACK_TYPE_ORDER) {
    const names = namesFor(type);
    if (names.length === 0) continue;
    ordered.push({ type, label: formatStackTypeLabel(type), names });
    seen.add(type);
  }

  for (const type of map.keys()) {
    if (seen.has(type)) continue;
    const names = namesFor(type);
    if (names.length === 0) continue;
    ordered.push({ type, label: formatStackTypeLabel(type), names });
  }

  return ordered;
}

/**
 * Stack names for a project card on the resume.
 *
 * - Uses stack entity `name` only (never npm dependency package names).
 * - No type filter, deny-list, or cap — the featured gate is the filter.
 * - Caller should pass only featured, portfolio-included stacks.
 * - Order: sortOrder ascending, then first-seen name.
 */
export function projectStackNames(stacks: Array<{ name: string; sortOrder?: number }>): string[] {
  if (stacks.length === 0) return [];

  const sorted = [...stacks].toSorted((a, b) => {
    const ao = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return 0;
  });

  const names: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) {
    const name = s.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * Keep the project stacks that render on a project's `Stack:` line.
 *
 * The stack entity is the single source of truth: a project stack renders only
 * when the same entity is in `featuredPortfolioStacks` (portfolio-included AND
 * `isFeatured`). Name membership — not the project row's own flags — is the
 * gate, because not every caller hydrates `isFeatured` onto the project join.
 *
 * The resume Skills section is deliberately NOT filtered this way; it carries
 * every portfolio-included stack (see `skillEntries`).
 */
export function filterPortfolioProjectStacks(
  projectStacks: Array<{
    name: string;
    type?: string | null;
    includedInPortfolio?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
  }>,
  featuredPortfolioStacks: Array<{ name: string }>
): Array<{ name: string; type?: string | null; sortOrder?: number }> {
  const featuredNames = new Set(
    featuredPortfolioStacks.map((s) => s.name.trim().toLowerCase()).filter(Boolean)
  );

  return projectStacks.filter((s) => {
    if (s.includedInPortfolio === false) return false;
    return featuredNames.has(s.name.trim().toLowerCase());
  });
}
