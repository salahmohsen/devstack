import { type TimelineEvent, type TimelineWhen } from "@/shared/ui/timeline";

export type HubExperienceRow = {
  id: string;
  title: string;
  organization: string;
  fromDate: string | null;
  toDate: string | null;
  isPresent: boolean;
  summary?: string | null;
  projectCount?: number;
};

function yearLabel(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const year = /^(\d{4})/.exec(value);
    return year?.[1] ?? value.slice(0, 4);
  }
  return String(parsed.getUTCFullYear());
}

function whenFor(row: HubExperienceRow): TimelineWhen {
  if (row.isPresent) return "now";
  if (row.fromDate) {
    const start = new Date(row.fromDate);
    if (!Number.isNaN(start.getTime()) && start.getTime() > Date.now()) return "future";
  }
  return "past";
}

function metaFor(row: HubExperienceRow): string | undefined {
  const bits = [row.organization];
  if (row.projectCount && row.projectCount > 0) {
    bits.push(`${row.projectCount} project${row.projectCount === 1 ? "" : "s"}`);
  }
  return bits.length > 0 ? bits.join(" · ") : undefined;
}

/** Newest first: current role, then later start dates. */
function compareExperiencesNewestFirst(a: HubExperienceRow, b: HubExperienceRow): number {
  if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
  const aEnd = a.isPresent ? "9999" : (a.toDate ?? a.fromDate ?? "");
  const bEnd = b.isPresent ? "9999" : (b.toDate ?? b.fromDate ?? "");
  const byEnd = bEnd.localeCompare(aEnd);
  if (byEnd !== 0) return byEnd;
  return (b.fromDate ?? "").localeCompare(a.fromDate ?? "");
}

export type ExperienceTimelineEvent = TimelineEvent & {
  summaryHtml?: string;
};

export function experiencesToTimelineEvents(
  rows: readonly HubExperienceRow[]
): ExperienceTimelineEvent[] {
  return [...rows].toSorted(compareExperiencesNewestFirst).map((row) => {
    const summary = row.summary?.trim();
    return {
      id: row.id,
      when: whenFor(row),
      time: row.isPresent ? "Now" : yearLabel(row.fromDate),
      title: row.title,
      detail: metaFor(row),
      summaryHtml: summary && summary.length > 0 ? summary : undefined
    };
  });
}

export function parseListExperiencesResult(result: unknown): HubExperienceRow[] {
  if (!result || typeof result !== "object") return [];
  const list = (result as { experiences?: unknown }).experiences;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const row = parseExperienceRow(item);
    return row ? [row] : [];
  });
}

export function parseGetExperienceResult(result: unknown): HubExperienceRow[] {
  if (!result || typeof result !== "object") return [];
  const record = result as { found?: unknown; experience?: unknown };
  if (record.found === false) return [];
  const row = parseExperienceRow(record.experience);
  return row ? [row] : [];
}

function parseExperienceRow(value: unknown): HubExperienceRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  if (typeof row.organization !== "string") return null;
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    fromDate: typeof row.fromDate === "string" ? row.fromDate : null,
    toDate: typeof row.toDate === "string" ? row.toDate : null,
    isPresent: row.isPresent === true,
    summary: typeof row.summary === "string" ? row.summary : null,
    projectCount: typeof row.projectCount === "number" ? row.projectCount : undefined
  };
}
