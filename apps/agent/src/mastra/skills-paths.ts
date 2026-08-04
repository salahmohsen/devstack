import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute paths to Mastra filesystem skills under apps/agent/skills/.
 * Agents attach these via `skills: [...]` (no Workspace required).
 *
 * @see https://mastra.ai/docs/agents/skills
 * @see https://mastra.ai/docs/workspace/skills
 */
const agentPackageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const skillsRoot = resolve(agentPackageRoot, "skills");

export function skillPath(name: string): string {
  return resolve(skillsRoot, name);
}

/** Meta skill: how to author skills (always available to mail AI agents). */
export const WRITE_SKILLS_PATH = skillPath("write-skills");

/** Career Inbox system-label classification. */
export const MAIL_CLASSIFICATION_SKILL_PATH = skillPath("mail-classification");

/** Extract listings from job_notifier mails. */
export const JOB_NOTIFIER_HARVEST_SKILL_PATH = skillPath("job-notifier-harvest");

/** Score harvested jobs vs preferences. */
export const JOB_PREFERENCE_MATCH_SKILL_PATH = skillPath("job-preference-match");

/** Link/create application from career mail. */
export const CRM_APPLICATION_MATCH_SKILL_PATH = skillPath("crm-application-match");

/** Propose pipeline stage/outcome from mail. */
export const CRM_STAGE_POLICY_SKILL_PATH = skillPath("crm-stage-policy");
