import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { fetchPublicHtmlAsText } from "@tsu-stack/core";

const MAX_CHARS = 14_000;

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
  const result = await fetchPublicHtmlAsText(url, { maxChars: MAX_CHARS });
  // Placeholder only after a real HTML response (incl. non-2xx). SSRF / network keep "".
  const emptyPlaceholder =
    result.status != null && (!result.error || result.error.startsWith("HTTP "));
  return {
    ok: result.ok,
    finalUrl: result.finalUrl,
    status: result.status,
    title: result.title,
    text:
      result.text.length > 0
        ? result.text
        : emptyPlaceholder
          ? "(empty page body — may be JS-only or blocked)"
          : "",
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
  execute: async ({ url }) => fetchJobPageContent(url)
});
