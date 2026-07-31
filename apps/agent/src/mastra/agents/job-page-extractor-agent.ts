import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Structured extract of a single job posting from page text or mail card context.
 * No tools — fetch happens outside the agent (workflow/server step).
 */
export function createJobPageExtractorAgent() {
  return new Agent({
    id: "job-page-extractor",
    name: "Job Page Extractor",
    description:
      "Extracts company, title, location, apply method, and apply URL from job page or alert card text. Pure structured extract; no tools.",
    instructions: `You extract structured job application data from job listing text (email card or page HTML converted to text).

Return only facts present or clearly implied. Prefer null over invention.

Fields:
- title: role title
- companyName: hiring company
- location: city/region or null
- salaryRange: free text or null
- description: short JD summary (max ~1500 chars) or null
- listingUrl: the board/listing URL provided (do not invent)
- applyUrl: external apply URL if the page says apply on company site; null for Easy Apply only
- applyMethod: one of easy_apply | external | email | unknown
  - easy_apply: Easy Apply / Apply with resume & profile on LinkedIn/Indeed
  - external: Apply on company website with a separate URL
  - email: mailto or recruiter email apply
  - unknown: cannot tell
- workMode: remote | hybrid | onsite | null

Rules:
- Do NOT use tools.
- Do NOT invent employers or titles.
- If text is a login wall, return best-effort from title tags only and applyMethod unknown.
- listingUrl must match the URL given in the user message when provided.`,
    model: byoModelFromRequestContext
  });
}

export default createJobPageExtractorAgent;
