import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Opening + skills paragraphs only. Structured lists are assembled by the API renderer.
 */
export function createSearchBriefWriterAgent() {
  return new Agent({
    id: "search-brief-writer",
    name: "Search Brief Writer",
    description: "Writes opening and skills paragraphs for the seeker search brief.",
    instructions: `You write two short paragraphs for the seeker's search brief.

Output JSON only:
{"opening": string, "skills": string}

Rules:
- opening: who I am from the provided profile, evidence, and title. 1–3 sentences.
- skills: what I want to work with from featured/stack names and project titles. 1–3 sentences.
- Do not invent sectors, companies, pay, or level.
- Do not contradict the structured lists in the user message.
- No markdown headings or bullet lists in the paragraphs.`,
    model: byoModelFromRequestContext
  });
}

export default createSearchBriefWriterAgent;
