import {
  canonicalizeJobUrl,
  extractPublicJobListingFromHtmlAsync,
  fetchListingAlternateText,
  fetchPublicHtmlAsText,
  formatJobPageTextForLlm,
  pickBetterListingDescription,
  type PublicJobListingExtract
} from "@tsu-stack/core";

/** Cap listing text injected into apply-package workflow input (~12k). */
const MAX_CHARS = 12_000;

export type FetchListingPageResult = {
  ok: boolean;
  text: string;
  finalUrl?: string;
  status?: number;
  title?: string | null;
  extract?: PublicJobListingExtract | null;
  error?: string;
};

/**
 * Thin HTTP fetch of a job listing / apply URL for apply-package preflight
 * and Fix posting URL refresh. Lives in packages/api so the API layer never
 * imports from apps/agent.
 *
 * Uses site-agnostic extract: JSON-LD → embedded SPA JSON → Readability → meta.
 */
async function fetchListingHtml(listingUrl: string) {
  const options = { maxChars: MAX_CHARS, includeHtml: true } as const;
  let result = await fetchPublicHtmlAsText(listingUrl, options);
  if (!result.ok || (result.html?.length ?? 0) < 200) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    result = await fetchPublicHtmlAsText(listingUrl, options);
  }
  return result;
}

export async function fetchListingPageText(url: string): Promise<FetchListingPageResult> {
  const listingUrl = canonicalizeJobUrl(url) ?? url;
  const result = await fetchListingHtml(listingUrl);
  const pageUrl = result.finalUrl ?? listingUrl;
  const extract =
    result.html && result.html.length > 200
      ? await extractPublicJobListingFromHtmlAsync(result.html, pageUrl)
      : null;
  if (extract && result.html) {
    const alternate = await fetchListingAlternateText(result.html, pageUrl);
    const picked = pickBetterListingDescription(extract.description, alternate);
    if (picked) extract.description = picked;
  }
  const text = formatJobPageTextForLlm({
    pageText: result.text,
    extract,
    pageTitle: result.title,
    maxChars: MAX_CHARS
  });
  return {
    ok: result.ok,
    text,
    finalUrl: result.finalUrl ?? listingUrl,
    status: result.status,
    title: result.title ?? extract?.title ?? null,
    extract,
    error: result.error
  };
}

/** Prefer listing `url`, then `applyUrl`, when http(s). */
export function pickHttpListingUrl(
  url: string | null | undefined,
  applyUrl: string | null | undefined
): string | null {
  for (const candidate of [url, applyUrl]) {
    const raw = candidate?.trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return raw;
    } catch {
      // ignore invalid
    }
  }
  return null;
}
