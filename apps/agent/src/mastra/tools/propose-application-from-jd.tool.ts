import { createTool } from "@mastra/core/tools";

import {
  ProposeApplicationFromJdInputSchema,
  ProposeApplicationFromJdOutputSchema
} from "@tsu-stack/core";

/**
 * Client HITL tool — structured JD proposal for the UI card.
 *
 * **No `execute`:** the agent loop must suspend so the hub UI can show the card
 * and resume via AI SDK `addToolOutput` (`package` | `save` | `dismiss`).
 * A server `execute` that returns dismiss immediately races the card and can
 * leave completed tool parts that (with a broad sendAutomaticallyWhen) restart
 * the chat.
 *
 * Never write CRM rows here — only `create-application` after user choice.
 */
export const proposeApplicationFromJdTool = createTool({
  id: "propose-application-from-jd",
  description:
    "Propose a job application parsed from a JD or listing URL. Set matchScore 0–100 from the current saved seeker profile (a number, not a string); use null when profile or listing evidence is insufficient. Never invent a provisional 50. Include title, companyName, the FULL job description (every section — responsibilities, stack, requirements, benefits; never a 2-paragraph teaser), location, url (the listing URL) when known, notes (1–3 sentence agent's take grounded in the saved seeker profile). When the posting states them, set workMode (remote|hybrid|onsite), salaryRange, requiredSkills (string[] from Requirements / Technology stack), and preferredSkills (string[] from Nice to have). Do not invent salary or work mode. After a jobPageExtractor result or a LinkedIn/job URL paste, you MUST call this tool — never dump extractor JSON. Use the extractor fields as-is. Do not call jobPageExtractor or fetch-job-page again after extract already ran — a short or empty description is fine (login wall). If extract failed, still propose with url and an empty description. Wait for user button: package | save | dismiss. After calling this tool, write no user-facing text — the card is the confirmation UI. Do not invent CRM rows without this confirmation.",
  inputSchema: ProposeApplicationFromJdInputSchema,
  outputSchema: ProposeApplicationFromJdOutputSchema
});
