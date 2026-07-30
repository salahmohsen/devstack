import { z } from "zod";

import { buildHeuristicReplyDraft } from "./utils";

/** Optional CRM/job context for a more grounded reply. */
export const MailReplyJobContextSchema = z.object({
  companyName: z.string().default(""),
  title: z.string().default(""),
  stage: z.string().nullable().optional()
});
export type MailReplyJobContext = z.infer<typeof MailReplyJobContextSchema>;

export const MailReplyDraftInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  fromName: z.string().default(""),
  fromEmail: z.string().min(1),
  subject: z.string().default(""),
  preview: z.string().default(""),
  bodyText: z.string().default(""),
  labels: z.array(z.string()).default([]),
  jobContext: MailReplyJobContextSchema.nullable().optional()
});
export type MailReplyDraftInput = z.infer<typeof MailReplyDraftInputSchema>;

export const MailReplyDraftOutputSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(20_000),
  source: z.enum(["heuristic", "llm"]),
  notes: z.string().optional()
});
export type MailReplyDraftOutput = z.infer<typeof MailReplyDraftOutputSchema>;

/** Local fallback when agent is down or rejects. */
export function heuristicMailReplyDraft(input: MailReplyDraftInput): MailReplyDraftOutput {
  const base = buildHeuristicReplyDraft({
    fromName: input.fromName,
    subject: input.subject,
    preview: input.preview
  });
  const company = input.jobContext?.companyName?.trim();
  const role = input.jobContext?.title?.trim();
  let bodyText = base.bodyText;
  if (company || role) {
    const ctx = [role, company ? `at ${company}` : null].filter(Boolean).join(" ");
    bodyText = bodyText.replace(
      "I will follow up with a more detailed reply shortly.",
      `Regarding ${ctx}, I will follow up with a more detailed reply shortly.`
    );
    if (!bodyText.includes("Regarding") && company) {
      bodyText = bodyText.replace(
        "I read your message and will follow up with a more detailed reply shortly.",
        `I read your message about ${ctx} and will follow up with a more detailed reply shortly.`
      );
    }
  }
  return {
    title: base.title,
    subject: base.subject,
    bodyText,
    source: "heuristic",
    notes: "local_heuristic"
  };
}
