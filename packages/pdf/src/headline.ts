import { type ResumePdfPortfolio } from "#@/types";

/** Calendar rank so ISO dates compare without UTC day-shift. Missing dates sort last. */
function dateRank(raw: string | null): number {
  if (!raw?.trim()) return Number.NEGATIVE_INFINITY;
  const m = raw.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  if (!m) return Number.NEGATIVE_INFINITY;
  const year = Number(m[1]);
  const month = Number(m[2] ?? "01");
  const day = Number(m[3] ?? "01");
  if (!year) return Number.NEGATIVE_INFINITY;
  return year * 10000 + month * 100 + day;
}

/**
 * Among included `isPresent` experiences, latest `fromDate`; else latest overall.
 * Omit if none.
 */
export function resumeHeadline(experiences: ResumePdfPortfolio["experiences"]): string | undefined {
  const included = experiences.filter((e) => e.includedInPortfolio && e.title.trim());
  if (included.length === 0) return undefined;

  const present = included.filter((e) => e.isPresent);
  const pool = present.length > 0 ? present : included;

  let best = pool[0]!;
  let bestRank = dateRank(best.fromDate);
  for (const experience of pool.slice(1)) {
    const rank = dateRank(experience.fromDate);
    if (rank >= bestRank) {
      best = experience;
      bestRank = rank;
    }
  }
  return best.title.trim();
}
