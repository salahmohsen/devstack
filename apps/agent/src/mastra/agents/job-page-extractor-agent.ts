import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { fetchJobPageTool } from "#@/mastra/tools/fetch-job-page.tool";

/**
 * Fetches a job URL (via tool) and extracts structured application fields.
 */
export function createJobPageExtractorAgent() {
  return new Agent({
    id: "job-page-extractor",
    name: "Job Page Extractor",
    description:
      "Fetches a job listing URL and extracts company, title, location, apply method, and apply URL.",
    instructions: `You enrich ONE job listing for a career CRM.

You usually receive pre-fetched page text from fetch-job-page (workflow injects it). If PAGE TEXT is missing, call tool fetch-job-page once with the listingUrl.

Fields:
- title, companyName (required — never "Unknown" when page or card has a real value)
- location, salaryRange, description (short, max ~800 chars)
- listingUrl: the canonical board URL (LinkedIn jobs/view/ID when possible)
- applyUrl: external company/ATS apply URL if present; null for Easy Apply only
- applyMethod: easy_apply | external | email | unknown
- workMode: remote | hybrid | onsite | null
- source: linkedin | indeed | company_website | other

Rules:
- Prefer page title/text facts over mail-card hints when they conflict.
- LinkedIn page titles often look like "Role | Company | LinkedIn" — split carefully.
- If the page is a login wall or empty, keep title/company from mail-card hints when they look real.
- Detect Easy Apply vs "Apply on company website" carefully.
- Do not invent employers or URLs.
- title must look like a job role (Engineer, Developer, Manager, …), not a marketing subject line.`,
    model: byoModelFromRequestContext,
    tools: {
      fetchJobPage: fetchJobPageTool
    }
  });
}

export default createJobPageExtractorAgent;
