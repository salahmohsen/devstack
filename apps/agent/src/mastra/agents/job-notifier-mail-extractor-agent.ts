import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { JOB_NOTIFIER_HARVEST_SKILL_PATH, WRITE_SKILLS_PATH } from "#@/mastra/skills-paths";

/**
 * Reads a Career Inbox email and extracts job listings when it is a job notifier/digest.
 * Judgment and extraction are skill-driven AI only (no regex harvest).
 */
export function createJobNotifierMailExtractorAgent() {
  return new Agent({
    id: "job-notifier-mail-extractor",
    name: "Job Notifier Mail Extractor",
    description:
      "Detects job-notifier emails and extracts each job listing (URL, title, company) using harvest skills.",
    instructions: `You analyze ONE email for job listings.

Always activate the **job-notifier-harvest** skill before extracting.
Scan body text AND HTML carefully — many digests only put listing URLs in anchor hrefs.

- Set isJobNotifier from intent (skill rules).
- Extract every distinct open role with a real listingUrl from the email.
- Never invent URLs.
- No tools other than skill tools.
- Return structured JSON via the schema only.`,
    skills: [WRITE_SKILLS_PATH, JOB_NOTIFIER_HARVEST_SKILL_PATH],
    model: byoModelFromRequestContext
  });
}

export default createJobNotifierMailExtractorAgent;
