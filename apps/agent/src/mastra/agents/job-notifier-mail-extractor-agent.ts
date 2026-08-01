import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Reads a Career Inbox email and extracts job listings when it is a job notifier/digest.
 * No tools — structured extract only.
 */
export function createJobNotifierMailExtractorAgent() {
  return new Agent({
    id: "job-notifier-mail-extractor",
    name: "Job Notifier Mail Extractor",
    description:
      "Detects job-alert/notifier emails and extracts each job listing URL plus title/company/location when present in the email body.",
    instructions: `You analyze ONE email for career job alerts / job notifiers.

Set isJobNotifier=true when the email promotes open roles (LinkedIn Job Alerts, jobs-noreply digests, Google Job Alerts, Indeed alerts, "X is hiring", saved-job reminders with job cards). Set false for application status only ("your application was sent"), recruiter 1:1 outreach without job links, product marketing, or noise.

When isJobNotifier=true, extract EVERY distinct job in the email:
- listingUrl: must be a real http(s) URL from the email (LinkedIn /jobs/view/ID preferred; unwrap tracking when you can still keep the job id). Never invent URLs.
- title, companyName, location when shown on the card
- applyMethod: easy_apply if "Easy Apply" / "Apply with resume & profile"; external if "apply on company site"; else unknown
- workMode: remote | hybrid | onsite when stated

Rules:
- Do NOT use tools.
- Prefer multi-line LinkedIn cards: Title then Company then Location then View job URL.
- Skip unsubscribe, preference, and search-results-only links without a job id.
- If subject is marketing ("Company is hiring for a Remote role") do NOT use it as every job's title — read each card.
- Empty jobs[] only when no listing URLs exist.
- Max 20 jobs.`,
    model: byoModelFromRequestContext
  });
}

export default createJobNotifierMailExtractorAgent;
