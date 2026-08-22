import { z } from "zod";

import {
  astToFilterValues,
  filterValuesToAst,
  isCompleteFilterLeaf,
  ListQueryError,
  parseRsql,
  printRsql,
  type FilterLeaf,
  type ListQueryResource
} from "@tsu-stack/core";

export const ListSearchSchema = z.object({
  q: z.string().optional(),
  filter: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  projectId: z.string().optional(),
  resumeId: z.string().optional(),
  applicationId: z.string().optional(),
  experienceId: z.string().optional(),
  stackId: z.string().optional()
});
export type ListSearch = z.infer<typeof ListSearchSchema>;

export type ListSearchJobsPage = Extract<ListQueryResource, "new-jobs" | "tracked-jobs">;
export type ListSearchVariant = "catalog" | ListSearchJobsPage;

export const NEW_JOBS_SEED = "trackingStatus==inbox";
export const TRACKED_SEED = "outcome==null";
export const NEW_JOBS_ALL = "trackingStatus=in=(inbox,dismissed)";
export const TRACKED_ALL = "outcome=unrestricted=";

const ASC_SORT_KEYS = new Set(["title", "name", "company", "stage"]);

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** oRPC / HTTP 400 from an invalid list `filter` or `sortBy`. */
export function isListQueryBadRequest(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; status?: unknown };
  return candidate.code === "BAD_REQUEST" || candidate.status === 400;
}

/** Coerce unknown route search into list params. Invalid `sortDir` is dropped. */
export function parseListSearch(raw: unknown): ListSearch {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const parsed = ListSearchSchema.safeParse({
    q: optionalTrimmedString(record.q),
    filter: optionalTrimmedString(record.filter),
    sortBy: optionalTrimmedString(record.sortBy),
    sortDir: record.sortDir === "asc" || record.sortDir === "desc" ? record.sortDir : undefined,
    projectId: optionalTrimmedString(record.projectId),
    resumeId: optionalTrimmedString(record.resumeId),
    applicationId: optionalTrimmedString(record.applicationId),
    experienceId: optionalTrimmedString(record.experienceId),
    stackId: optionalTrimmedString(record.stackId)
  });
  return parsed.success ? parsed.data : {};
}

export function jobsSeedRsql(page: ListSearchJobsPage): string {
  return page === "new-jobs" ? NEW_JOBS_SEED : TRACKED_SEED;
}

export function jobsAllRsql(page: ListSearchJobsPage): string {
  return page === "new-jobs" ? NEW_JOBS_ALL : TRACKED_ALL;
}

/** Omitted `filter` → page seed. Caller `replace`s the URL when this differs. */
export function resolveJobsFilterParam({
  page,
  filter
}: {
  page: ListSearchJobsPage;
  filter?: string;
}): string {
  const trimmed = filter?.trim();
  if (trimmed) return trimmed;
  return jobsSeedRsql(page);
}

export function isListNarrowed({
  q,
  filter,
  page
}: {
  q?: string;
  filter?: string;
  page: ListQueryResource;
}): boolean {
  if (typeof q === "string" && q.trim().length > 0) return true;
  const current = filter?.trim();
  if (!current) return false;
  if (page === "new-jobs") return current !== NEW_JOBS_SEED;
  if (page === "tracked-jobs") return current !== TRACKED_SEED;
  return true;
}

export function defaultSortDir(sortBy: string): "asc" | "desc" {
  return ASC_SORT_KEYS.has(sortBy) ? "asc" : "desc";
}

function isNewJobsAllLeaf(leaf: FilterLeaf): boolean {
  if (leaf.field !== "trackingStatus" || leaf.operator !== "is_any_of") return false;
  if (!Array.isArray(leaf.value)) return false;
  const values = leaf.value.filter((item): item is string => typeof item === "string").toSorted();
  return values.length === 2 && values[0] === "dismissed" && values[1] === "inbox";
}

/**
 * URL `filter` → Cubby chips. `outcome=unrestricted=` is not a chip.
 * New-jobs page-scoped all (`trackingStatus=in=(inbox,dismissed)`) is also not a chip.
 */
export function filterValuesFromRsql(
  filter: string | undefined,
  resource: ListQueryResource
): FilterLeaf[] {
  const trimmed = filter?.trim();
  if (!trimmed) return [];
  try {
    const leaves = astToFilterValues(parseRsql(trimmed, resource));
    if (resource === "new-jobs") return leaves.filter((leaf) => !isNewJobsAllLeaf(leaf));
    return leaves;
  } catch (error) {
    if (error instanceof ListQueryError) return [];
    throw error;
  }
}

const LIST_SEARCH_QUERY_KEYS = ["q", "filter", "sortBy", "sortDir"] as const;

/** Merge list query params; omit empty q/filter/sort so the URL stays shareable. */
export function withListSearch(
  search: ListSearch,
  patch: Partial<Pick<ListSearch, (typeof LIST_SEARCH_QUERY_KEYS)[number]>>
): ListSearch {
  const next: ListSearch = { ...search, ...patch };
  for (const key of LIST_SEARCH_QUERY_KEYS) {
    const value = next[key];
    if (value == null || value === "") delete next[key];
  }
  return next;
}

/**
 * Chip `onValueChange` → URL `filter`.
 * Empty complete leaves: catalogs omit; jobs write page-scoped **all** (not seed).
 * Missing partition leaf next to other chips also gets the all sentinel so the
 * server allowlist stays satisfied.
 */
export function rsqlFromFilterValues(
  values: readonly FilterLeaf[],
  resource: ListQueryResource
): string | undefined {
  const complete = values.filter(isCompleteFilterLeaf);
  const printed = printRsql(filterValuesToAst(complete));
  if (resource === "new-jobs") {
    const hasTracking = complete.some((leaf) => leaf.field === "trackingStatus");
    if (hasTracking) return printed.length > 0 ? printed : NEW_JOBS_ALL;
    return printed.length > 0 ? `${NEW_JOBS_ALL};${printed}` : NEW_JOBS_ALL;
  }
  if (resource === "tracked-jobs") {
    const hasOutcome = complete.some((leaf) => leaf.field === "outcome");
    if (hasOutcome) return printed.length > 0 ? printed : TRACKED_ALL;
    return printed.length > 0 ? `${TRACKED_ALL};${printed}` : TRACKED_ALL;
  }
  return printed.length > 0 ? printed : undefined;
}
