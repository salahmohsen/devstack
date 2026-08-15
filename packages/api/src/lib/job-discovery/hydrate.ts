import {
  extractJobListingFromHtml,
  fetchPublicHtmlAsText,
  isThinJobDescription
} from "@tsu-stack/core";
import {
  jobPostingRepository,
  preferLongerJobDescription,
  type JobPostingEntity
} from "@tsu-stack/db";

import { catalogFieldsHash } from "#@/lib/job-discovery/content-hash";

export type HydratePostingResult = {
  description: string | null;
  listingClosed: boolean;
  location: string | null;
  salaryRange: string | null;
};

const EMPTY_HYDRATE: HydratePostingResult = {
  description: null,
  listingClosed: false,
  location: null,
  salaryRange: null
};

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
    )
  };
}

export async function hydratePostingIfNeeded(postingId: string): Promise<HydratePostingResult> {
  const posting = await jobPostingRepository.findById(postingId);
  if (!posting) return EMPTY_HYDRATE;
  if (!isThinJobDescription(posting.description)) return fromCatalog(posting);

  const fallback = fromCatalog(posting);
  try {
    const fetched = await fetchPublicHtmlAsText(posting.listingUrl, { includeHtml: true });
    if (!fetched.ok || !fetched.html) return fallback;

    const extract = await extractJobListingFromHtml(fetched.html, posting.listingUrl);
    const extractedDescription = extract.description?.trim() ?? "";
    const description = preferLongerJobDescription(
      extractedDescription.length > 0 ? extractedDescription : null,
      posting.description
    );
    // Description is the only shared HTTP field written back to the catalog.
    if (description && description !== posting.description) {
      const contentHash = catalogFieldsHash({
        adapterId: posting.adapterId,
        externalId: posting.externalId,
        listingUrl: posting.listingUrl,
        title: posting.title,
        companyName: posting.companyName,
        location: posting.location,
        workMode: posting.workMode,
        skills: posting.skills ?? [],
        description
      });
      await jobPostingRepository
        .setDescription(posting.id, description, contentHash)
        .catch(() => null);
    }
    let listingClosed = posting.closedAt != null;
    if (extract.listingClosed) {
      await jobPostingRepository.markClosed(posting.id, new Date()).catch(() => null);
      listingClosed = true;
    }
    const extractedLocation = extract.location?.trim() ?? "";
    const location = extractedLocation.length > 0 ? extractedLocation : posting.location;
    return {
      description: description ?? posting.description,
      listingClosed,
      location,
      salaryRange: fallback.salaryRange
    };
  } catch {
    return fallback;
  }
}
