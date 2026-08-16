import { decodeHtmlEntities } from "#@/common/extract-job-listing-page";
import { assertPublicHttpUrl, assertPublicHttpUrlResolved } from "#@/common/public-http-url";

const DEFAULT_TIMEOUT_MS = 15_000;
/** Soft default when callers omit maxChars (agent listing pages). */
const DEFAULT_MAX_CHARS = 14_000;

/**
 * Prefer a real browser UA — LinkedIn guest job pages often thin-out or
 * authwall bot-like agents while still serving full SSR HTML to Chrome UAs.
 */
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1"
} as const;

export type FetchPublicHtmlResult = {
  ok: boolean;
  text: string;
  finalUrl?: string;
  status?: number;
  title?: string | null;
  /** Present when `includeHtml` was requested (caller may run structured extract). */
  html?: string;
  /** Meta description / og:description when present. */
  description?: string | null;
  error?: string;
};

/** Strip scripts/styles/tags and decode common entities for LLM-friendly plain text. */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(stripped).replace(/\s+/g, " ").trim();
}

function metaContent(html: string, propertyOrName: string): string | null {
  const prop = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // property/name before content, or content before property/name
  const a = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")
  )?.[1];
  if (a?.trim()) return a.trim();
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i")
  )?.[1];
  const s = b?.trim();
  if (!s) return null;
  return s;
}

export function extractHtmlTitle(html: string): string | null {
  const titleTag = html
    .match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    ?.trim()
    .slice(0, 300);
  if (titleTag) return titleTag;
  return (
    metaContent(html, "og:title")?.slice(0, 300) ??
    metaContent(html, "twitter:title")?.slice(0, 300) ??
    null
  );
}

export function extractHtmlDescription(html: string): string | null {
  return (
    metaContent(html, "og:description")?.slice(0, 2_000) ??
    metaContent(html, "twitter:description")?.slice(0, 2_000) ??
    metaContent(html, "description")?.slice(0, 2_000) ??
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
  options?: { maxChars?: number; timeoutMs?: number; includeHtml?: boolean }
): Promise<FetchPublicHtmlResult> {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const includeHtml = options?.includeHtml === true;

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
    const description = extractHtmlDescription(html);
    // Prefer meta description near the top so LLMs see the posting, not chrome.
    const bodyText = htmlToText(html);
    const textParts = [
      title ? `Page title: ${title}` : null,
      description ? `Meta description: ${description}` : null,
      bodyText
    ].filter(Boolean);
    const text = textParts.join("\n\n").slice(0, maxChars);
    return {
      ok: res.ok,
      finalUrl,
      status: res.status,
      title,
      description,
      text,
      ...(includeHtml ? { html } : {}),
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

export type FetchPublicHttpStatusResult = {
  ok: boolean;
  status?: number;
  finalUrl?: string;
  error?: string;
};

/** SSRF-safe status probe (HEAD or GET). Does not read the body. */
export async function fetchPublicHttpStatus(
  url: string,
  options?: { timeoutMs?: number; method?: "HEAD" | "GET" }
): Promise<FetchPublicHttpStatusResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const method = options?.method ?? "HEAD";

  try {
    await assertPublicHttpUrlResolved(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: "follow",
        headers: { ...DEFAULT_HEADERS }
      });
    } finally {
      clearTimeout(timer);
    }

    const finalUrl = res.url || url;
    try {
      assertPublicHttpUrl(finalUrl);
      if (hostKey(finalUrl) !== hostKey(url)) {
        await assertPublicHttpUrlResolved(finalUrl);
      }
    } catch (err) {
      return {
        ok: false,
        finalUrl,
        status: res.status,
        error: err instanceof Error ? err.message : String(err)
      };
    }

    return { ok: res.ok, status: res.status, finalUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
