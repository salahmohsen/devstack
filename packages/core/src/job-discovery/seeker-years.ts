export type ExperienceDateRow = {
  fromDate: string | null | undefined;
  toDate: string | null | undefined;
  isPresent: boolean | null | undefined;
};

function parseDay(value: string | null | undefined): number | null {
  if (value == null || !value.trim()) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return t;
}

/** Whole years from merged overlapping dated experience ranges. Null if none dated. */
export function mergeExperienceYears(
  rows: readonly ExperienceDateRow[],
  now: Date = new Date()
): number | null {
  const nowMs = now.getTime();
  const intervals: Array<{ start: number; end: number }> = [];
  for (const row of rows) {
    const start = parseDay(row.fromDate);
    if (start == null) continue;
    const end = row.isPresent ? nowMs : (parseDay(row.toDate) ?? nowMs);
    if (end < start) continue;
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
  return Math.floor(ms / (365 * 24 * 60 * 60 * 1000));
}
