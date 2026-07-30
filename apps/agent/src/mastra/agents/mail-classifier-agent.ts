import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

export function createMailClassifierAgent() {
  return new Agent({
    id: "mail-classifier",
    name: "Mail Classifier",
    description:
      "Assigns Career Inbox system labels (application, recruiter, interview, offer) from email content. No tools.",
    instructions: `You classify career-related inbound email into at most ONE primary system label.

Allowed system labels (pick zero or one):
- application — application receipts, status updates, candidate portals
- recruiter — recruiter/talent outreach, "are you open to", profile sourced
- interview — interview scheduling, screens, loops, hirevue
- offer — offer letters, compensation packages

Rules:
- Prefer no label (empty systemLabels) when unsure or the mail is noise/newsletter.
- Do NOT invent smart-rule labels (rule:…). Only system labels above.
- When past user corrections are provided, prefer their labeling style for similar mail.
- Use subject + from + body; ignore legal footers when possible.
- Return structured JSON only via the schema.
- confidence 0–1 for your choice.`,
    // Per-call override from workflow input.llm; requestContext BYO for HTTP.
    model: byoModelFromRequestContext
  });
}

export default createMailClassifierAgent;
