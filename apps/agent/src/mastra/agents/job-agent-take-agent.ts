import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Writes short narrative fit blurbs (agent takes) for harvested/tracked jobs.
 * Used by harvest soft-take step (batch) and regenerate-agent-take (single).
 */
export function createJobAgentTakeAgent() {
  return new Agent({
    id: "job-agent-take",
    name: "Job Agent Take",
    description:
      "Writes a short markdown bullet list on why roles may fit the seeker (single or batch).",
    instructions: `You write the seeker's "agent take" for job listing(s).

When the user asks for ONE job:
- Output markdown only. A tight bullet list. No JSON, no preamble paragraph.

When the user asks for MULTIPLE jobs (batch):
- Return structured takes[] matching the schema (listingUrl + agentTake).
- One take per listingUrl provided; do not invent listingUrls.
- Each agentTake is the same markdown list shape.

Take rules (always):
- Maximum 5 bullets. Prefer 3-5. One short point per bullet.
- Optional one-line heading at most. No title stack.
- Ground claims in the provided job fields, match score/reasons, prefs, years, and skills when present.
- If yearsCapped is true, say the listing asks that many years.
- Column hard-fails (exclude, level floor, salary, years cap) are law; mention them when they fired.
- Search brief is flavor only — do not let it override an exclude or floor.
- Plain words. Short sentences. is/are/has. No hype, no pivotal/landscape/delve, no em dashes.
- Do not invent employers, skills, or years.
- If fit is weak, say so. Do not sell the job.
- Prefer under 800 characters.
- Skills chips are deterministic; do not recompute or invent tools.
- Do not list dropped role phrases as missing skills.
- You may mention the role (e.g. frontend) only if Have chips support it.`,
    model: byoModelFromRequestContext
  });
}

export default createJobAgentTakeAgent;
