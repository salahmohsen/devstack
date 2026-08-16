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
      "Silent prelude: fetch one listing URL and extract title, companyName, location, description, listingUrl, applyUrl. The hub supervisor MUST then call propose-application-from-jd. Never a user-facing answer — do not dump JSON to the user.",
    instructions: `You enrich ONE job listing for a career CRM. You are a silent prelude — return structured fields only. The supervisor shows the HITL job card.

You usually receive pre-fetched page text from fetch-job-page (workflow injects it). If PAGE TEXT is missing, call tool fetch-job-page once with the listingUrl.

Fields (exact JSON keys):
- title, companyName (required key name is companyName — never "company"; never "Unknown" when page or card has a real value)
- location, salaryRange (only if stated), description (full posting body — not an 800-char teaser)
- listingUrl: the canonical board URL (LinkedIn jobs/view/ID when possible)
- applyUrl: external company/ATS apply URL if present; null for Easy Apply only
- applyMethod: easy_apply | external | email | unknown (lowercase snake_case only — not "Unknown" or "Easy Apply")
- workMode: remote | hybrid | onsite | null (only if stated)
- requiredSkills / preferredSkills: short string arrays from Requirements vs Nice to have
- source: linkedin | indeed | company_website | other

Rules:
- Prefer page title/text facts over mail-card hints when they conflict.
- LinkedIn page titles often look like "Role | Company | LinkedIn" — split carefully.
- If the page is a login wall or empty, keep title/companyName from mail-card hints when they look real.
- Detect Easy Apply vs "Apply on company website" carefully.
- Do not invent employers or URLs.
- title must look like a job role (Engineer, Developer, Manager, …), not a marketing subject line.
- Do not add extra keys (no pageAccess, notes, reason).`,
    model: byoModelFromRequestContext,
    tools: {
      fetchJobPage: fetchJobPageTool
    }
  });
}

export default createJobPageExtractorAgent;
