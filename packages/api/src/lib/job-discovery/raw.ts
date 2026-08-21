import {
  canonicalizeJobUrl,
  inferWorkModeFromText,
  normalizeHiringRegion,
  normalizeStatedEmploymentType,
  normalizeStatedWorkMode,
  NormalizedListingSchema,
  type NormalizedListing,
  type WorkMode
} from "@tsu-stack/core";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Boards send 0 for unstated pay. Never store that as a real salary. */
export function asStatedSalary(value: unknown): number | null {
  const n = asFiniteNumber(value);
  return n != null && n > 0 ? n : null;
}

/** First stated work mode, then location text (`Remote`, `Hybrid`, `On-site`). */
export function statedWorkMode(
  values: readonly unknown[],
  location?: string | null
): WorkMode | null {
  for (const value of values) {
    const mode = normalizeStatedWorkMode(value);
    if (mode) return mode;
  }
  return inferWorkModeFromText(location);
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = asNonEmptyString(item);
    if (text) out.push(text);
  }
  return out;
}

export function asWorkMode(value: unknown): WorkMode | null {
  return normalizeStatedWorkMode(value);
}

export function asEmploymentType(value: unknown): string | null {
  return normalizeStatedEmploymentType(value);
}

export function asHiringRegion(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asNonEmptyString(value);
    if (!text) continue;
    const slug = normalizeHiringRegion(text);
    if (slug) return slug;
  }
  return null;
}

export function asPostedAt(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return asPostedAt(Number(trimmed));
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function asListingUrl(value: unknown): string | null {
  const raw = asNonEmptyString(value);
  return raw ? canonicalizeJobUrl(raw) : null;
}

/** Stringify every entry — ints/objects cannot be `.trim()`-joined. */
export function stringifyEntry(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  const rec = asRecord(value);
  if (!rec) return "";
  for (const key of ["name", "slug", "alpha2"] as const) {
    const text = asNonEmptyString(rec[key]);
    if (text) return text;
  }
  return "";
}

export function joinEntries(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(value) || value.length === 0) return null;
  const parts = value.map(stringifyEntry).filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function rowsFrom(body: unknown, key: string): unknown[] {
  if (Array.isArray(body)) return body;
  const rec = asRecord(body);
  const rows = rec?.[key];
  return Array.isArray(rows) ? rows : [];
}

export function toNormalizedListing(listing: NormalizedListing): NormalizedListing | null {
  const parsed = NormalizedListingSchema.safeParse(listing);
  return parsed.success ? parsed.data : null;
}
