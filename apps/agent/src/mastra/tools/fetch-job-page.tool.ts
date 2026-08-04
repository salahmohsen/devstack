import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { assertPublicHttpUrl } from "@tsu-stack/core";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CHARS = 14_000;

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
    .replace(/\s+/g, " ")
    .trim();
}

export type FetchJobPageResult = {
  ok: boolean;
  finalUrl?: string;
  status?: number;
  title?: string | null;
  text: string;
  error?: string;
};

/**
 * Shared HTTP fetch used by the Mastra tool and the harvest workflow step.
 * Not a search tool — URL must already be known from the mail.
 */
export async function fetchJobPageContent(url: string): Promise<FetchJobPageResult> {
  try {
    assertPublicHttpUrl(url);
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

    const finalUrl = res.url || url;
    try {
      assertPublicHttpUrl(finalUrl);
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
    const title =
      html
        .match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        ?.trim()
        .slice(0, 300) ??
      html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
      null;
    const text = htmlToText(html).slice(0, MAX_CHARS);
    return {
      ok: res.ok,
      finalUrl,
      status: res.status,
      title,
      text: text.length > 0 ? text : "(empty page body — may be JS-only or blocked)",
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

/**
 * Fetch a job listing URL and return readable text for the job-page extractor.
 */
export const fetchJobPageTool = createTool({
  id: "fetch-job-page",
  description:
    "Fetch a job listing or apply URL over HTTP and return page title + main text (no login). Use for each listingUrl from a job-alert email.",
  inputSchema: z.object({
    url: z.string().url().describe("Job listing or apply page URL")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    finalUrl: z.string().optional(),
    status: z.number().optional(),
    title: z.string().nullable().optional(),
    text: z.string(),
    error: z.string().optional()
  }),
  execute: async ({ url }) => fetchJobPageContent(url)
});
