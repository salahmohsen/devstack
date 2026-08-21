export type ExperienceDateRow = {
  fromDate: string | null | undefined;
  toDate: string | null | undefined;
  isPresent: boolean | null | undefined;
};

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

/** Civil YYYY-MM-DD as UTC midnight of that date (not Date.parse, which is an instant). */
function parseDay(value: string | null | undefined): number | null {
  if (value == null || !value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function civilDayUtc(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole years from merged overlapping dated experience ranges. Null if none dated. */
export function mergeExperienceYears(
  rows: readonly ExperienceDateRow[],
  now: Date = new Date()
): number | null {
  const nowDay = civilDayUtc(now);
  const intervals: Array<{ start: number; end: number }> = [];
  for (const row of rows) {
    const start = parseDay(row.fromDate);
    if (start == null) continue;
    const end = row.isPresent ? nowDay : parseDay(row.toDate);
    if (end == null || end < start) continue;
    intervals.push({ start, end });
  }
  if (intervals.length === 0) return null;
  intervals.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (!last || iv.start > last.end) {
      merged.push({ ...iv });
    } else {
      last.end = Math.max(last.end, iv.end);
    }
  }
  let ms = 0;
  for (const iv of merged) ms += iv.end - iv.start;
  // 365d year so a non-leap calendar year still counts as 1 (365.25 floors it to 0).
  return Math.floor(ms / MS_PER_YEAR);
}
