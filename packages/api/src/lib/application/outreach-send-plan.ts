import { type SendOutreachOverrides } from "@tsu-stack/core";

const emailLike = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
};

export type OutreachSendValues = {
  to: string;
  subject: string;
  body: string;
  attachments: { resume: boolean; cover: boolean };
};

/**
 * Pure send-time resolution (spec #8, #11): overrides win over stored rows;
 * the default selection attaches both kit PDFs; an all-off selection, a
 * missing recipient, or an empty subject/body fails before any IO.
 */
export function resolveOutreachSendValues(input: {
  recruiterEmail: string | null;
  outreachSubject: string | null;
  outreachBody: string | null;
  overrides?: SendOutreachOverrides;
}): { error: "NO_RECIPIENT" | "NO_ATTACHMENTS" | "NO_MESSAGE" } | OutreachSendValues {
  const to = emailLike(input.overrides?.to ?? input.recruiterEmail);
  if (!to) return { error: "NO_RECIPIENT" };

  const attachments = input.overrides?.attachments ?? { resume: true, cover: true };
  if (!attachments.resume && !attachments.cover) return { error: "NO_ATTACHMENTS" };

  const subject = (input.overrides?.subject ?? input.outreachSubject ?? "").trim();
  const body = (input.overrides?.body ?? input.outreachBody ?? "").trim();
  if (!subject || !body) return { error: "NO_MESSAGE" };

  return { to, subject, body, attachments };
}
