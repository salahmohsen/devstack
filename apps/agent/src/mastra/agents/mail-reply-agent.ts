import { Agent } from "@mastra/core/agent";

import { MODEL_PRESETS } from "#@/mastra/model-config";

/**
 * Drafts a short professional reply to career mail.
 * No tools — structured output only. Send is always a separate product step.
 */
export function createMailReplyAgent() {
  return new Agent({
    id: "mail-reply",
    name: "Mail Reply",
    description:
      "Drafts concise career email replies (recruiter, interview, application). No tools; no send.",
    instructions: `You write a short professional reply draft for a job seeker.

Rules:
- Warm, concise, confident — not salesy or desperate.
- 3–6 short paragraphs max; plain text (no HTML).
- Address the sender by first name when available.
- If job/company context is provided, reference it naturally once.
- Do not invent interview times, salary, or commitments the seeker did not make.
- Do not claim to attach a resume or files.
- Subject should be a proper Re: line when the original subject is present.
- title is a short queue label for the review list (e.g. "Reply · Acme screener").
- Return structured JSON only via the schema.`,
    model: MODEL_PRESETS.default
  });
}

export default createMailReplyAgent;
