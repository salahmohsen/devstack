import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { APPLICATION_APPLY_PACKAGE_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/**
 * Builds a structured apply package draft for one application:
 * rewrite-all portfolio evidence (chunked) + cover letter + outreach email.
 * Judgment is skill-driven; BYO model via requestContext.
 */
export function createApplyPackageAgent() {
  return new Agent({
    id: "apply-package",
    name: "Apply Package",
    description:
      "Rewrites all portfolio experiences and projects for a job, then drafts professional summary, cover letter, and outreach email as a structured apply package.",
    instructions: `You build apply package content for a job application across multi-step phases.

Always activate the **application-apply-package** skill before rewriting or drafting.

Product (rewrite-all):
- Rewrite every experience/project you are given in this call (portfolio snapshot is already opted-in).
- Do not select top-N or emit include:false for a catalog of items as the primary path.
- Final PDF include flags are set by the server (all true); you focus on grounded rewrites + letters.

Phases (one per call):
- Experience rewrite (chunks): one rewrite per experienceId; keep company/title; 2–5 grounded bullets.
- Project rewrite (chunks): one rewrite per projectId; keep name; summary (+ bullets when supported).
- Summary + letters: professionalSummary, formal cover, short outreach from rewritten evidence.

Rules:
- Never invent employers, titles, projects, metrics, tools, or achievements.
- Project analysis is private rewrite signal only — never print as "Analysis:".
- Cover letter formal; outreach email short.
- proposedRecruiterEmail only if a contact email appears in the job text; else null.
- Use only experience/project/stack ids from the input for this phase.
- Return structured JSON via the schema only.
- No tools other than skill tools.`,
    skills: [WRITE_SKILLS_PATH, APPLICATION_APPLY_PACKAGE_SKILL_PATH],
    model: byoModelFromRequestContext
  });
}

export default createApplyPackageAgent;
