import { type z } from "zod";

import { JOB_TITLE_PACK_IDS, TITLE_PACKS, type JobTitleId, type JobTitlePackId } from "./constants";

function isJobTitlePackId(value: string): value is JobTitlePackId {
  return (JOB_TITLE_PACK_IDS as readonly string[]).includes(value);
}

function uniqueKeywords(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function seedSet(titleId: JobTitlePackId): Set<string> {
  return new Set(TITLE_PACKS[titleId].keywords.map((k) => k.toLowerCase()));
}

/**
 * When switching packs: drop previous seed keywords, keep user extras, inject next seeds.
 * Switching to `custom` keeps current keywords (no seed inject).
 */
export function applyTitlePack(input: {
  nextTitleId: JobTitleId;
  previousTitleId: JobTitleId | null;
  currentKeywords: readonly string[];
}): string[] {
  if (input.nextTitleId === "custom") {
    return uniqueKeywords(input.currentKeywords);
  }

  const nextSeeds = TITLE_PACKS[input.nextTitleId].keywords;
  let extras: string[];

  if (input.previousTitleId != null && isJobTitlePackId(input.previousTitleId)) {
    const previousSeeds = seedSet(input.previousTitleId);
    extras = input.currentKeywords.filter((k) => !previousSeeds.has(k.trim().toLowerCase()));
  } else {
    extras = [...input.currentKeywords];
  }

  return uniqueKeywords([...nextSeeds, ...extras]);
}

/** Pack: union of seeds and stored role keywords. Custom: role keywords only. */
export function effectiveRoleKeywords(input: {
  titleId: JobTitleId | null;
  roleKeywords: readonly string[];
}): string[] {
  if (input.titleId != null && isJobTitlePackId(input.titleId)) {
    return uniqueKeywords([...TITLE_PACKS[input.titleId].keywords, ...input.roleKeywords]);
  }
  return uniqueKeywords(input.roleKeywords);
}

export function hasValidDiscoveryTitle(input: {
  titleId: JobTitleId | null;
  customTitle: string | null;
  roleKeywords: readonly string[];
}): boolean {
  if (input.titleId == null) return false;
  if (isJobTitlePackId(input.titleId)) return true;
  if (input.titleId !== "custom") return false;
  const title = input.customTitle?.trim() ?? "";
  return title.length > 0 && input.roleKeywords.length >= 2;
}

/** Combobox items: pack labels plus Custom title. */
export function titlePackOptions(): Array<{ value: JobTitleId; label: string }> {
  return [
    ...JOB_TITLE_PACK_IDS.map((id) => {
      return { value: id, label: TITLE_PACKS[id].label };
    }),
    { value: "custom", label: "Custom title" }
  ];
}

/**
 * When `titleId === "custom"`, require a non-empty title and ≥2 role keywords.
 * No-op for packs, unset, or omitted `titleId` (partial upsert).
 */
export function refineCustomDiscoveryTitle(
  value: {
    titleId?: JobTitleId | "" | null;
    customTitle?: string | null;
    roleKeywords?: readonly string[] | null;
  },
  ctx: z.core.$RefinementCtx
): void {
  if (value.titleId !== "custom") return;
  const title = value.customTitle?.trim() ?? "";
  if (title.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["customTitle"],
      message: "Enter a custom title"
    });
  }
  if ((value.roleKeywords?.length ?? 0) < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["roleKeywords"],
      message: "Custom titles need at least two role keywords"
    });
  }
}

/** Stable catalog/query key for a discovery title config; null when invalid. */
export function ingestQueryKey(input: {
  titleId: JobTitleId | null;
  customTitle: string | null;
  roleKeywords: readonly string[];
}): string | null {
  if (!hasValidDiscoveryTitle(input)) return null;
  if (input.titleId != null && isJobTitlePackId(input.titleId)) {
    return `pack:${input.titleId}`;
  }
  const sorted = input.roleKeywords
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .toSorted((a, b) => a.localeCompare(b));
  return `custom:${sorted.join("|")}`;
}
