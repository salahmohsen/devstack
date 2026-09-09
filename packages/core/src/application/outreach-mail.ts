import { stripUrl } from "#@/utils/strings";

/**
 * Single parity source for the outbound outreach mail (spec: sent HTML and
 * the dialog preview must render the same structure from the same shape).
 * The email template and the web preview both consume this model.
 */
export type OutreachContactLine = { text: string; href: string | null };

export type OutreachMailModel = {
  subject: string;
  paragraphs: string[];
  senderName: string;
  contactLines: OutreachContactLine[];
};

/**
 * Split an outreach body into paragraphs (blank-line separated). CRLF is
 * normalized to LF first and blank lines containing only whitespace act as
 * separators, mirroring the PDF's `splitCoverLetterParagraphs` normalization.
 * Single newlines stay inside a paragraph (the email renders them as soft
 * breaks instead of the PDF's space join).
 */
export function splitOutreachParagraphs(bodyText: string): string[] {
  return bodyText
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean);
}

/** Display text for a contact — mirrors pdf `displayContact` semantics. */
function contactText(type: string, v: string): string {
  if (type === "email" || type === "phone" || type === "location") return v;
  if (type === "github" && !v.includes(".") && !v.includes("/")) {
    return `github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "linkedin" && !v.includes("linkedin.") && !/^https?:/i.test(v)) {
    return `linkedin.com/in/${v.replace(/^@/, "").replace(/^in\//, "")}`;
  }
  if (type === "x" && !v.includes("x.com") && !v.includes("twitter.") && !/^https?:/i.test(v)) {
    return `x.com/${v.replace(/^@/, "")}`;
  }
  return stripUrl(v);
}

/** Link target for a contact — mirrors pdf `contactHref` semantics. */
function contactHref(type: string, v: string): string | null {
  if (type === "email") {
    const addr = v.replace(/^mailto:/i, "");
    return addr.includes("@") ? `mailto:${addr}` : null;
  }
  if (type === "phone") {
    const num = v.replace(/^tel:/i, "").trim();
    return num ? `tel:${num}` : null;
  }
  if (type === "location") return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  if (type === "linkedin") {
    if (v.includes("linkedin.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.linkedin.com/in/${v.replace(/^@/, "").replace(/^in\//, "")}`;
  }
  if (type === "github") {
    if (v.includes("github.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "x") {
    if (v.includes("x.com") || v.includes("twitter.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://x.com/${v.replace(/^@/, "")}`;
  }
  if (v.includes(".") || v.includes("/")) return `https://${v.replace(/^\/\//, "")}`;
  return null;
}

/**
 * Build the mail model from stored/send-time values. Contact text/href
 * semantics mirror the PDF contact line (`displayContact`/`contactHref`
 * re-implemented here to keep core dependency-free): emails/phones verbatim,
 * social handles normalized to host labels, other values stripped via
 * `stripUrl`.
 *
 * Intentional deviation: contact type comparison is case-insensitive (the
 * PDF compares case-sensitively); the contact type pgEnum only stores
 * lowercase values. Contact types without a dedicated branch above (e.g.
 * youtube, instagram, telegram, bluesky, mastodon, discord, or unknown
 * types) use the generic strip/fallback treatment.
 */
export function buildOutreachMailModel(input: {
  subject: string;
  bodyText: string;
  senderName: string | null | undefined;
  /**
   * Contacts opted into the outreach, in render order. Values are used as
   * given (trimmed); contacts with an empty value are dropped. Text and
   * href follow the pdf contact-line semantics described on this function.
   */
  contacts: ReadonlyArray<{ type: string; value: string }>;
}): OutreachMailModel {
  const contactLines: OutreachContactLine[] = [];
  for (const contact of input.contacts) {
    const value = contact.value.trim();
    if (!value) continue;
    const type = contact.type.toLowerCase();
    contactLines.push({ text: contactText(type, value), href: contactHref(type, value) });
  }

  return {
    subject: input.subject.trim(),
    paragraphs: splitOutreachParagraphs(input.bodyText),
    senderName: input.senderName?.trim() ?? "",
    contactLines
  };
}
