import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { CRM_APPLICATION_MATCH_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/**
 * Matches career mail to an open Application or proposes creating one.
 * Judgment only — server performs DB writes.
 */
export function createCrmApplicationMatcherAgent() {
  return new Agent({
    id: "crm-application-matcher",
    name: "CRM Application Matcher",
    description:
      "Links Career Inbox mail to an open application or proposes creating a new CRM row. Semantic match only.",
    instructions: `You link career email to the seeker's Applications CRM.

Always activate the **crm-application-match** skill before deciding.
Return structured JSON only (kind, applicationId?, companyName?, title?, reason).
Never invent applicationIds that are not in the open applications list.`,
    skills: [WRITE_SKILLS_PATH, CRM_APPLICATION_MATCH_SKILL_PATH],
    model: byoModelFromRequestContext
  });
}

export default createCrmApplicationMatcherAgent;
