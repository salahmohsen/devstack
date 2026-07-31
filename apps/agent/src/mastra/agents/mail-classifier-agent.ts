import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

export function createMailClassifierAgent() {
  return new Agent({
    id: "mail-classifier",
    name: "Mail Classifier",
    description:
      "Assigns Career Inbox system labels (application, application_status, recruiter, interview, offer, job_notifier, noise) from email content. No tools.",
    instructions: `You classify career-related inbound email into at most ONE primary system label.

Allowed system labels (pick zero or one):
- application — application receipts / portal notices that belong on the Applications card
- application_status — “application was sent/update” status mail (CRM path; not job harvest)
- recruiter — recruiter/talent outreach, "are you open to", profile sourced
- interview — interview scheduling, screens, loops, hirevue
- offer — offer letters, compensation packages
- job_notifier — board/job-alert digests (LinkedIn jobalerts, Indeed alerts, multi-job digests). Harvest path — not interview/CRM.
- noise — product updates, marketing, board profile spam, non-career mail that should not clutter career cards

Rules:
- Prefer no label (empty systemLabels) when unsure or the mail is a pure newsletter without career intent.
- Prefer job_notifier for job-alert digests even if they mention “interview” as a role title.
- Prefer noise for product/SaaS marketing that is not recruiting or application status.
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
