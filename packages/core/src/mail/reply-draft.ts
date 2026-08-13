import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";

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
  jobContext: MailReplyJobContextSchema.nullable().optional(),
  /** Server-resolved BYO model + key for this run. Never log `llm.apiKey`. */
  llm: RuntimeLlmConfigSchema.optional()
});
export type MailReplyDraftInput = z.infer<typeof MailReplyDraftInputSchema>;

export const MailReplyDraftOutputSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(20_000),
  /** Product path is AI-only (`llm`). `heuristic` retained for tests/fixtures only. */
  source: z.enum(["heuristic", "llm"]),
  notes: z.string().optional()
});
export type MailReplyDraftOutput = z.infer<typeof MailReplyDraftOutputSchema>;

/**
 * Deterministic first-pass reply body (no LLM). Tests/fixtures only.
 */
export function buildHeuristicReplyDraft(input: {
  fromName: string;
  subject: string;
  preview: string;
}): { title: string; subject: string; bodyText: string } {
  const name = input.fromName.trim() || "there";
  const first = name.split(/\s+/)[0] ?? "there";
  const subject = input.subject.trim() || "(no subject)";
  const replySubject = subject.match(/^re:\s*/i) ? subject : `Re: ${subject}`;
  const previewLine = input.preview.trim().slice(0, 280);

  const bodyText = [
    `Hi ${first},`,
    "",
    `Thanks for your note${subject ? ` about “${subject}”` : ""}.`,
    previewLine ? "" : "",
    previewLine
      ? `I read your message and will follow up with a more detailed reply shortly.`
      : `I will follow up with a more detailed reply shortly.`,
    "",
    "Best regards"
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  return {
    title: `Reply · ${subject.slice(0, 80)}`,
    subject: replySubject.slice(0, 500),
    bodyText
  };
}

/**
 * @deprecated Product path is AI-only. Kept for unit tests/fixtures.
 * Do not use as a production fallback.
 */
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
