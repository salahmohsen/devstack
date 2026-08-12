import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  extractPublicJobListingFromHtmlAsync,
  fetchPublicHtmlAsText,
  formatJobPageTextForLlm,
  type PublicJobListingExtract
} from "@tsu-stack/core";

const MAX_CHARS = 14_000;

export type FetchJobPageResult = {
  ok: boolean;
  finalUrl?: string;
  status?: number;
  title?: string | null;
  text: string;
  error?: string;
  /** Deterministic listing fields (JSON-LD / embedded JSON / Readability / meta). */
  extract?: PublicJobListingExtract | null;
};

/**
 * Shared HTTP fetch used by the Mastra tool and the harvest workflow step.
 * Not a search tool — URL must already be known from the mail.
 *
 * Site-agnostic extract: schema.org JobPosting → embedded SPA JSON →
 * Readability main content → meta tags.
 */
export async function fetchJobPageContent(url: string): Promise<FetchJobPageResult> {
  const result = await fetchPublicHtmlAsText(url, {
    maxChars: MAX_CHARS,
    includeHtml: true
  });
  // Placeholder only after a real HTML response (incl. non-2xx). SSRF / network keep "".
  const emptyPlaceholder =
    result.status != null && (!result.error || result.error.startsWith("HTTP "));

  const extract =
    result.html && result.html.length > 200
      ? await extractPublicJobListingFromHtmlAsync(result.html, result.finalUrl ?? url)
      : null;

  const rawText =
    result.text.length > 0
      ? result.text
      : emptyPlaceholder
        ? "(empty page body — may be JS-only or blocked)"
        : "";

  const text = formatJobPageTextForLlm({
    pageText: rawText,
    extract,
    pageTitle: result.title ?? extract?.title,
    maxChars: MAX_CHARS
  });

  return {
    ok: result.ok,
    finalUrl: result.finalUrl,
    status: result.status,
    title: result.title ?? extract?.title ?? null,
    text,
    extract,
    error: result.error
  };
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
  execute: async ({ url }) => {
    const page = await fetchJobPageContent(url);
    // Tool output stays lean (no extract object) for agent tool schema stability.
    return {
      ok: page.ok,
      finalUrl: page.finalUrl,
      status: page.status,
      title: page.title,
      text: page.text,
      error: page.error
    };
  }
});
