import { assertPublicHttpUrl, assertPublicHttpUrlResolved } from "#@/common/public-http-url";

const DEFAULT_TIMEOUT_MS = 15_000;
/** Soft default when callers omit maxChars (agent listing pages). */
const DEFAULT_MAX_CHARS = 14_000;

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; CareerInboxBot/1.0; +https://local) AppleWebKit/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
} as const;

export type FetchPublicHtmlResult = {
  ok: boolean;
  text: string;
  finalUrl?: string;
  status?: number;
  title?: string | null;
  error?: string;
};

/** Strip scripts/styles/tags and decode common entities for LLM-friendly plain text. */
export function htmlToText(html: string): string {
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

export function extractHtmlTitle(html: string): string | null {
  return (
    html
      .match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?.trim()
      .slice(0, 300) ??
    html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
    null
  );
}

function hostKey(url: string): string {
  try {
    return new URL(url).hostname
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

/**
 * SSRF-safe public HTML fetch → plain text.
 * DNS-resolves the request URL (rebinding guard), then asserts the final URL
 * after redirects (string host check + resolve when hostname changed).
 */
export async function fetchPublicHtmlAsText(
  url: string,
  options?: { maxChars?: number; timeoutMs?: number }
): Promise<FetchPublicHtmlResult> {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    await assertPublicHttpUrlResolved(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { ...DEFAULT_HEADERS }
      });
    } finally {
      clearTimeout(timer);
    }

    const finalUrl = res.url || url;
    try {
      // Always re-check final URL string form (scheme/host literals).
      assertPublicHttpUrl(finalUrl);
      // If redirect landed on a different host, re-resolve DNS for rebinding.
      if (hostKey(finalUrl) !== hostKey(url)) {
        await assertPublicHttpUrlResolved(finalUrl);
      }
    } catch (err) {
      return {
        ok: false,
        finalUrl,
        status: res.status,
        text: "",
        error: err instanceof Error ? err.message : String(err)
      };
    }

    const html = await res.text();
    const title = extractHtmlTitle(html);
    const text = htmlToText(html).slice(0, maxChars);
    return {
      ok: res.ok,
      finalUrl,
      status: res.status,
      title,
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
