import { Agent } from "@mastra/core/agent";

import { MODEL_PRESETS } from "#@/mastra/model-config";
import { getApplicationTool } from "#@/mastra/tools/get-application.tool";
import { listOpenApplicationsTool } from "#@/mastra/tools/list-open-applications.tool";

/**
 * Drafts a short professional reply to career mail.
 * Optional CRM read tools (tenant-scoped via requestContext.userId).
 * Send is always a separate product step.
 */
export function createMailReplyAgent() {
  return new Agent({
    id: "mail-reply",
    name: "Mail Reply",
    description:
      "Drafts concise career email replies with optional CRM application lookup. No send.",
    instructions: `You write a short professional reply draft for a job seeker.

Rules:
- Warm, concise, confident — not salesy or desperate.
- 3–6 short paragraphs max; plain text (no HTML).
- Address the sender by first name when available.
- If job/company context is provided in the prompt, use it; otherwise you may call list-open-applications or get-application when the company name appears in the email.
- Do not invent interview times, salary, or commitments the seeker did not make.
- Do not claim to attach a resume or files.
- Subject should be a proper Re: line when the original subject is present.
- title is a short queue label for the review list (e.g. "Reply · Acme screener").
- Prefer structured JSON output via the schema when provided.`,
    model: MODEL_PRESETS.default,
    tools: {
      listOpenApplications: listOpenApplicationsTool,
      getApplication: getApplicationTool
    }
  });
}

export default createMailReplyAgent;
