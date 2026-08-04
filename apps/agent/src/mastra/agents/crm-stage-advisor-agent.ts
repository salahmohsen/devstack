import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { CRM_STAGE_POLICY_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/**
 * Proposes pipeline stage/outcome from classified mail.
 * Server applies monotonic stage rails.
 */
export function createCrmStageAdvisorAgent() {
  return new Agent({
    id: "crm-stage-advisor",
    name: "CRM Stage Advisor",
    description:
      "Proposes application stage/outcome updates from career mail labels and body. Monotonic advance enforced by server.",
    instructions: `You propose pipeline stage changes for an application after career mail arrives.

Always activate the **crm-stage-policy** skill.
Return structured JSON only (targetStage?, targetOutcome?, reason).
Do not invent stages outside the product enum.`,
    skills: [WRITE_SKILLS_PATH, CRM_STAGE_POLICY_SKILL_PATH],
    model: byoModelFromRequestContext
  });
}

export default createCrmStageAdvisorAgent;
