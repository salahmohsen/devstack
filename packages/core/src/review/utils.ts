import { type ReviewItemKind, type ReviewItemStatus } from "./types";

export const REVIEW_ITEM_KINDS = ["reply_draft"] as const satisfies readonly ReviewItemKind[];

export const REVIEW_ITEM_STATUSES = [
  "pending",
  "confirmed",
  "discarded",
  "sent"
] as const satisfies readonly ReviewItemStatus[];

export const REVIEW_ITEM_KIND_LABELS: Record<ReviewItemKind, string> = {
  reply_draft: "Reply draft"
};

export const REVIEW_ITEM_STATUS_LABELS: Record<ReviewItemStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  discarded: "Discarded",
  sent: "Sent"
};

/**
 * Deterministic first-pass reply body (no LLM). Workers may replace later via Mastra.
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
