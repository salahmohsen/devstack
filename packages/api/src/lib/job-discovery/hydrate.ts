import {
  extractJobListingFromHtml,
  fetchListingAlternateText,
  fetchPublicHtmlAsText,
  isThinJobDescription,
  normalizeHiringRegion,
  pickBetterListingDescription
} from "@tsu-stack/core";
import {
  jobPostingRepository,
  preferLongerJobDescription,
  type JobPostingEntity
} from "@tsu-stack/db";

import { catalogFieldsHash, type CatalogHashFields } from "#@/lib/job-discovery/content-hash";

export type HydratePostingResult = {
  description: string | null;
  listingClosed: boolean;
  location: string | null;
  salaryRange: string | null;
  workMode: string | null;
  hiringRegion: string | null;
  employmentType: string | null;
  skills: string[];
};

export type StatedCatalogSnapshot = {
  workMode: string | null;
  hiringRegion: string | null;
  employmentType: string | null;
  location: string | null;
  skills: readonly string[] | null;
};

export type StatedExtractSnapshot = {
  workMode?: string | null;
  workModeStated?: boolean;
  hiringRegion?: string | null;
  employmentType?: string | null;
  location?: string | null;
  skills?: readonly string[] | null;
};

export type StatedCatalogWrite = {
  workMode?: string;
  hiringRegion?: string;
  employmentType?: string;
  location?: string;
  skills?: string[];
};

const EMPTY_HYDRATE: HydratePostingResult = {
  description: null,
  listingClosed: false,
  location: null,
  salaryRange: null,
  workMode: null,
  hiringRegion: null,
  employmentType: null,
  skills: []
};

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

function emptySkills(skills: readonly string[] | null | undefined): boolean {
  return skills == null || skills.filter((skill) => skill.trim().length > 0).length === 0;
}

/**
 * Stated JSON-LD / ATS fields only. Never overwrites a non-null catalog workMode
 * and never writes a dictionary guess (`workModeStated !== true`).
 */
export function statedCatalogPatch(
  catalog: StatedCatalogSnapshot,
  extract: StatedExtractSnapshot
): StatedCatalogWrite {
  const patch: StatedCatalogWrite = {};

  if (isBlank(catalog.workMode) && extract.workMode && extract.workModeStated) {
    patch.workMode = extract.workMode;
  }

  if (isBlank(catalog.location)) {
    const location = extract.location?.trim() ?? "";
    if (location.length > 0) patch.location = location;
  }

  if (isBlank(catalog.hiringRegion)) {
    const statedRegion = extract.hiringRegion?.trim() ?? "";
    const region =
      statedRegion.length > 0
        ? statedRegion
        : (normalizeHiringRegion(extract.location ?? null) ??
          normalizeHiringRegion(catalog.location));
    if (region) patch.hiringRegion = region;
  }

  if (isBlank(catalog.employmentType)) {
    const employmentType = extract.employmentType?.trim() ?? "";
    if (employmentType.length > 0) patch.employmentType = employmentType;
  }

  if (emptySkills(catalog.skills) && extract.skills) {
    const skills = extract.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0);
    if (skills.length > 0) patch.skills = skills;
  }

  return patch;
}

/** Adapter-stated catalog pay as a lander string, e.g. `$120k–$150k USD`. */
export function formatCatalogSalaryRange(
  salaryMin: number | null,
  salaryMax: number | null,
  salaryCurrency: string | null
): string | null {
  if (salaryMin == null && salaryMax == null) return null;
  const fmt = (n: number) => (n % 1000 === 0 && Math.abs(n) >= 1000 ? `$${n / 1000}k` : `$${n}`);
  const range =
    salaryMin != null && salaryMax != null
      ? `${fmt(salaryMin)}–${fmt(salaryMax)}`
      : fmt(salaryMin ?? salaryMax!);
  const currency = salaryCurrency?.trim();
  return currency ? `${range} ${currency}` : range;
}

function fromCatalog(posting: JobPostingEntity): HydratePostingResult {
  return {
    description: posting.description,
    listingClosed: posting.closedAt != null,
    location: posting.location,
    salaryRange: formatCatalogSalaryRange(
      posting.salaryMin,
      posting.salaryMax,
      posting.salaryCurrency
    ),
    workMode: posting.workMode,
    hiringRegion: posting.hiringRegion,
    employmentType: posting.employmentType,
    skills: posting.skills ?? []
  };
}

function applyPatch(base: HydratePostingResult, patch: StatedCatalogWrite): HydratePostingResult {
  return {
    ...base,
    location: patch.location ?? base.location,
    workMode: patch.workMode ?? base.workMode,
    hiringRegion: patch.hiringRegion ?? base.hiringRegion,
    employmentType: patch.employmentType ?? base.employmentType,
    skills: patch.skills ?? base.skills
  };
}

/** Rehash only when the JD text changed. Workplace fills must not change the hash. */
export function statedPersistContentHash(
  posting: CatalogHashFields,
  nextDescription: string | null
): string | undefined {
  if (nextDescription == null || nextDescription === posting.description) return undefined;
  return catalogFieldsHash({
    ...posting,
    description: nextDescription
  });
}

async function persistStated(
  posting: JobPostingEntity,
  patch: StatedCatalogWrite,
  description: string | null
): Promise<void> {
  const descriptionChanged = description != null && description !== posting.description;
  if (!descriptionChanged && Object.keys(patch).length === 0) return;

  const contentHash = statedPersistContentHash(
    {
      adapterId: posting.adapterId,
      externalId: posting.externalId,
      listingUrl: posting.listingUrl,
      title: posting.title,
      companyName: posting.companyName,
      location: posting.location,
      workMode: posting.workMode,
      skills: posting.skills ?? [],
      description: posting.description
    },
    description
  );

  await jobPostingRepository
    .patchStatedFields(posting.id, {
      ...patch,
      ...(descriptionChanged && description ? { description } : {}),
      ...(contentHash != null ? { contentHash } : {})
    })
    .catch(() => null);
}

/** Adapter HTML previews (Freehire) are often a partial JD even above the thin bar. */
function looksLikeHtmlPreview(description: string | null | undefined): boolean {
  const trimmed = description?.trim() ?? "";
  if (trimmed.length === 0 || trimmed.length >= 2_500) return false;
  return /<[a-z][\s\S]*>/i.test(trimmed);
}

function needsHttpHydrate(posting: JobPostingEntity): boolean {
  return (
    isThinJobDescription(posting.description) ||
    looksLikeHtmlPreview(posting.description) ||
    posting.workMode == null ||
    isBlank(posting.location)
  );
}

export async function hydratePostingIfNeeded(postingId: string): Promise<HydratePostingResult> {
  const posting = await jobPostingRepository.findById(postingId);
  if (!posting) return EMPTY_HYDRATE;

  if (!needsHttpHydrate(posting)) {
    const local = statedCatalogPatch(posting, {});
    if (Object.keys(local).length > 0) {
      await persistStated(posting, local, posting.description);
    }
    return applyPatch(fromCatalog(posting), local);
  }

  const fallback = fromCatalog(posting);
  try {
    const fetched = await fetchPublicHtmlAsText(posting.listingUrl, { includeHtml: true });
    if (!fetched.ok || !fetched.html) {
      const local = statedCatalogPatch(posting, {});
      if (Object.keys(local).length > 0) {
        await persistStated(posting, local, posting.description);
      }
      return applyPatch(fallback, local);
    }

    const extract = await extractJobListingFromHtml(fetched.html, posting.listingUrl);
    const alternate = await fetchListingAlternateText(
      fetched.html,
      fetched.finalUrl ?? posting.listingUrl
    );
    const extractedDescription =
      pickBetterListingDescription(extract.description, alternate) ??
      extract.description?.trim() ??
      "";
    const description = preferLongerJobDescription(
      extractedDescription.length > 0 ? extractedDescription : null,
      posting.description
    );
    const workplace = statedCatalogPatch(posting, {
      workMode: extract.workMode,
      workModeStated: extract.workModeStated,
      hiringRegion: extract.hiringRegion,
      employmentType: extract.employmentType,
      location: extract.location,
      skills: extract.skills
    });
    await persistStated(posting, workplace, description);

    let listingClosed = posting.closedAt != null;
    if (extract.listingClosed) {
      await jobPostingRepository.markClosed(posting.id, new Date(), "http_gone").catch(() => null);
      listingClosed = true;
    }

    return applyPatch(
      {
        description: description ?? posting.description,
        listingClosed,
        location: posting.location,
        salaryRange: fallback.salaryRange,
        workMode: posting.workMode,
        hiringRegion: posting.hiringRegion,
        employmentType: posting.employmentType,
        skills: posting.skills ?? []
      },
      workplace
    );
  } catch {
    const local = statedCatalogPatch(posting, {});
    if (Object.keys(local).length > 0) {
      await persistStated(posting, local, posting.description).catch(() => null);
    }
    return applyPatch(fallback, local);
  }
}
