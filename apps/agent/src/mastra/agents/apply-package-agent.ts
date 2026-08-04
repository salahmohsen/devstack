import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { APPLICATION_APPLY_PACKAGE_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/**
 * Builds a structured apply package draft for one application:
 * selected portfolio rewrites + cover letter + outreach email.
 * Judgment is skill-driven; BYO model via requestContext.
 */
export function createApplyPackageAgent() {
  return new Agent({
    id: "apply-package",
    name: "Apply Package",
    description:
      "Selects and rewrites portfolio evidence for a job, then drafts cover letter and outreach email as a structured apply package.",
    instructions: `You build ONE apply package draft for a job application.

Always activate the **application-apply-package** skill before drafting.

Rules:
- Select + rewrite only; never invent employers, titles, projects, or metrics.
- Project analysis is private rewrite signal only — never print as "Analysis:".
- Cover letter formal; outreach email short.
- Use only experience/project/stack ids from the portfolio snapshot.
- Return structured JSON via the schema only.
- No tools other than skill tools.`,
    skills: [WRITE_SKILLS_PATH, APPLICATION_APPLY_PACKAGE_SKILL_PATH],
    model: byoModelFromRequestContext
  });
}

export default createApplyPackageAgent;
