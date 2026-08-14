import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { getApplicationTool } from "#@/mastra/tools/get-application.tool";
import { getExperienceTool } from "#@/mastra/tools/get-experience.tool";
import { getJobPreferencesTool } from "#@/mastra/tools/get-job-preferences.tool";
import { getProjectTool } from "#@/mastra/tools/get-project.tool";
import { getResumeTool } from "#@/mastra/tools/get-resume.tool";
import { getStackTool } from "#@/mastra/tools/get-stack.tool";
import { listExperiencesTool } from "#@/mastra/tools/list-experiences.tool";
import { listOpenApplicationsTool } from "#@/mastra/tools/list-open-applications.tool";
import { listProjectsTool } from "#@/mastra/tools/list-projects.tool";
import { listResumesTool } from "#@/mastra/tools/list-resumes.tool";
import { listStacksTool } from "#@/mastra/tools/list-stacks.tool";

/**
 * Drafts a short professional reply to career mail.
 * Focused CRM + profile read tools (tenant-scoped via requestContext.userId).
 * Send is always a separate product step — this agent never sends email.
 */
export function createMailReplyAgent() {
  return new Agent({
    id: "mail-reply",
    name: "Mail Reply",
    description:
      "Drafts concise career email replies using job CRM + profile context. Never sends.",
    instructions: `You write a short professional reply draft for a job seeker.

## Tools (use for job + profile context)
- Job CRM: list-open-applications, get-application — ground the reply in the pipeline when company/role is unclear or job context is missing.
- Preferences: get-job-preferences — tone/constraints (roles, locations, multi-select work modes) when relevant.
- Profile evidence: list-experiences / get-experience, list-projects / get-project, list-stacks / get-stack — mention real experience only when it strengthens the reply.
- Resumes: list-resumes / get-resume — metadata only (names/default); never claim you attached a file.

Be efficient: call tools only when needed. Prefer job context already in the prompt. List → get only for the matching item. Do not dump the whole portfolio into the email.

## Rules
- Warm, concise, confident — not salesy or desperate.
- 3–6 short paragraphs max; plain text (no HTML).
- Address the sender by first name when available.
- If job/company context is provided in the prompt, use it; otherwise call list-open-applications / get-application when the company is clear in the email.
- Do not invent interview times, salary, or commitments the seeker did not make.
- Do not claim to attach a resume or files.
- **NEVER send email.** You only draft title, subject, and bodyText. Send is a separate human-confirmed product step.
- Subject should be a proper Re: line when the original subject is present.
- title is a short queue label for the review list (e.g. "Reply · Acme screener").
- Prefer structured JSON output via the schema when provided.`,
    model: byoModelFromRequestContext,
    tools: {
      listOpenApplications: listOpenApplicationsTool,
      getApplication: getApplicationTool,
      getJobPreferences: getJobPreferencesTool,
      listExperiences: listExperiencesTool,
      getExperience: getExperienceTool,
      listProjects: listProjectsTool,
      getProject: getProjectTool,
      listStacks: listStacksTool,
      getStack: getStackTool,
      listResumes: listResumesTool,
      getResume: getResumeTool
    }
  });
}

export default createMailReplyAgent;
