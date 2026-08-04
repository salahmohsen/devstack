const FETCH_TIMEOUT_MS = 15_000;
/** Cap listing text injected into apply-package workflow input (~12k). */
const MAX_CHARS = 12_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

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
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CareerInboxBot/1.0; +https://local) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    clearTimeout(timer);
    const html = await res.text();
    const text = htmlToText(html).slice(0, MAX_CHARS);
    return {
      ok: res.ok,
      finalUrl: res.url || url,
      status: res.status,
      text,
      error: res.ok ? undefined : `HTTP ${res.status}`
    };
  } catch (err) {
    return {
      ok: false,
      text: "",
      error: err instanceof Error ? err.message : String(err)
    };
  }
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
