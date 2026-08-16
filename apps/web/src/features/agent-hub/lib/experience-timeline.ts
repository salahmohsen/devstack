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

function detailFor(row: HubExperienceRow): string | undefined {
  const bits = [row.organization];
  if (row.projectCount && row.projectCount > 0) {
    bits.push(`${row.projectCount} project${row.projectCount === 1 ? "" : "s"}`);
  }
  if (row.summary?.trim()) bits.push(row.summary.trim());
  return bits.length > 0 ? bits.join(" · ") : undefined;
}

function compareExperiences(a: HubExperienceRow, b: HubExperienceRow): number {
  if (a.isPresent !== b.isPresent) return a.isPresent ? 1 : -1;
  const aKey = a.fromDate ?? "";
  const bKey = b.fromDate ?? "";
  return aKey.localeCompare(bKey);
}

export function experiencesToTimelineEvents(rows: readonly HubExperienceRow[]): TimelineEvent[] {
  return [...rows].toSorted(compareExperiences).map((row) => {
    return {
      id: row.id,
      when: whenFor(row),
      time: row.isPresent ? "Now" : yearLabel(row.fromDate),
      title: row.title,
      detail: detailFor(row)
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
