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

/** Split an outreach body into paragraphs (blank-line separated). */
export function splitOutreachParagraphs(bodyText: string): string[] {
  return bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean);
}

/**
 * Build the mail model from stored/send-time values. Contact display text
 * mirrors the PDF contact line (`displayContact` semantics re-implemented
 * here to keep core dependency-free): emails/phones verbatim, social
 * handles normalized to host labels, URLs stripped.
 */
export function buildOutreachMailModel(input: {
  subject: string;
  bodyText: string;
  senderName: string | null | undefined;
  contacts: ReadonlyArray<{ type: string; value: string }>;
}): OutreachMailModel {
  const contactLines: OutreachContactLine[] = [];
  for (const contact of input.contacts) {
    const value = contact.value.trim();
    if (!value) continue;
    const type = contact.type.toLowerCase();
    let text = value;
    let href: string | null = null;
    if (type === "email") {
      href = `mailto:${value}`;
    } else if (type === "phone") {
      href = `tel:${value.replace(/[^\d+]/g, "")}`;
    } else if (/^https?:\/\//i.test(value)) {
      href = value;
      text = value
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "")
        .replace(/^www\./i, "");
    } else if (type === "github" && !value.includes(".") && !value.includes("/")) {
      text = `github.com/${value.replace(/^@/, "")}`;
    } else if (type === "linkedin" && !value.includes("linkedin.") && !/^https?:/i.test(value)) {
      text = `linkedin.com/in/${value.replace(/^@/, "").replace(/^in\//, "")}`;
    } else if (type === "x" && !value.includes("x.com") && !/^https?:/i.test(value)) {
      text = `x.com/${value.replace(/^@/, "")}`;
    } else if (type === "website") {
      text = value
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "")
        .replace(/^www\./i, "");
      href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }
    contactLines.push({ text, href });
  }

  return {
    subject: input.subject.trim(),
    paragraphs: splitOutreachParagraphs(input.bodyText),
    senderName: input.senderName?.trim() ?? "",
    contactLines
  };
}
