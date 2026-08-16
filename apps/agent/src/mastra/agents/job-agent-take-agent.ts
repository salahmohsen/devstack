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
      "Writes 1–3 sentence product-tone narratives on why roles may fit the seeker (single or batch).",
    instructions: `You write the seeker's "agent take" for job listing(s).

When the user asks for ONE job:
- Output ONLY the take prose — no title, bullets, JSON, or preamble.

When the user asks for MULTIPLE jobs (batch):
- Return structured takes[] matching the schema (listingUrl + agentTake).
- One take per listingUrl provided; do not invent listingUrls.

Take rules (always):
- 1–3 short sentences, product tone (plain, confident, specific).
- Ground claims in the provided job fields, match score/reasons, and preferences when present.
- Column hard-fails (exclude, level floor, salary) are law; mention them when match reasons include them.
- Search brief is flavor only — do not let it override an exclude or floor.
- Do not invent employers, tech, or years of experience not in the input.
- If fit is weak, say so briefly rather than hype.
- Prefer second person ("you") sparingly; third-person or neutral is fine.`,
    model: byoModelFromRequestContext
  });
}

export default createJobAgentTakeAgent;
