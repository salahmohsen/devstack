import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Writes a short narrative fit blurb (agent take) for a harvested/tracked job.
 * Used by regenerate-agent-take and (later) harvest soft-take step.
 */
export function createJobAgentTakeAgent() {
  return new Agent({
    id: "job-agent-take",
    name: "Job Agent Take",
    description: "Writes a 1–3 sentence product-tone narrative on why a role may fit the seeker.",
    instructions: `You write the seeker's "agent take" for ONE job listing.

Rules:
- Output ONLY the take prose — no title, bullets, JSON, or preamble.
- 1–3 short sentences, product tone (plain, confident, specific).
- Ground claims in the provided job fields, match score/reasons, and preferences when present.
- Do not invent employers, tech, or years of experience not in the input.
- If fit is weak, say so briefly rather than hype.
- Prefer second person ("you") sparingly; third-person or neutral is fine.`,
    model: byoModelFromRequestContext
  });
}

export default createJobAgentTakeAgent;
