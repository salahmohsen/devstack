import { fetchPublicHtmlAsText } from "@tsu-stack/core";

/** Cap listing text injected into apply-package workflow input (~12k). */
const MAX_CHARS = 12_000;

export type FetchListingPageResult = {
  ok: boolean;
  text: string;
  finalUrl?: string;
  status?: number;
  error?: string;
};

/**
 * Thin HTTP fetch of a job listing / apply URL for apply-package preflight.
 * Lives in packages/api so the API layer never imports from apps/agent.
 */
export async function fetchListingPageText(url: string): Promise<FetchListingPageResult> {
  const result = await fetchPublicHtmlAsText(url, { maxChars: MAX_CHARS });
  return {
    ok: result.ok,
    text: result.text,
    finalUrl: result.finalUrl,
    status: result.status,
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
