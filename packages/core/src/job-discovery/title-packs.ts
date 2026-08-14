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
