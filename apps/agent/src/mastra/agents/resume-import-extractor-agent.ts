import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

export function createResumeImportExtractorAgent() {
  return new Agent({
    id: "resume-import-extractor",
    name: "Resume Import Extractor",
    description:
      "Extracts profile, experiences, projects, and skills/stacks from resume plain text. Pure structured extract; no tools.",
    instructions: `You extract structured portfolio data from resume plain text.

Return only facts present or clearly implied in the text. Prefer empty arrays over invention.
Do not invent employers, projects, dates, or skills that are not supported by the resume.

Output sections:
1. profile — name, email (if present), professional summary, contact channels
2. experiences — jobs/roles with title, organization, description, date range
3. projects — portfolio-worthy projects with title, summary/description, year, related tech
4. stacks — technologies/skills as stack names (e.g. "React", "TypeScript", "PostgreSQL")

Linking:
- When a project is nested under a job/role, set experienceIndex to that experience's
  0-based index in the experiences array (or experienceClientId if you assign matching ids).
- Standalone projects leave experienceIndex / experienceClientId null.

Dates:
- Prefer ISO YYYY-MM-DD when a full date is known.
- If only month/year is known, use the first day of that month (YYYY-MM-01).
- If only year is known, use YYYY-01-01.
- If present/current role, set isPresent true and toDate null.
- Project year: explicit year when stated; else derive from end/start dates when available.

Contacts:
- type must be one of: website, email, phone, location, linkedin, github, x, youtube
- value is the URL, handle, phone number, or location string as written

Stacks:
- Use clean display names (React not react.js when clearly React).
- Deduplicate near-duplicates when obvious.
- Prefer names that match common tech branding.

IMPORTANT RULES:
- Do NOT use any tools. Process only the resume text and existing context provided.
- Prefer empty arrays over guessing.
- Keep descriptions concise; preserve key achievements when present.
- Return structured output matching the requested schema exactly.`,
    model: byoModelFromRequestContext
  });
}

export default createResumeImportExtractorAgent;
