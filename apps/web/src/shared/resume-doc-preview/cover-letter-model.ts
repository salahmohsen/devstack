import { buildCoverLetterContactItems } from "@tsu-stack/pdf/doc";

export type CoverLetterModel = {
  name: string;
  contactLine: string | null;
  dateLine: string;
  company: string | null;
  roleTitle: string | null;
  paragraphs: Array<{ id: string; text: string }>;
};

/** Mirrors packages/pdf cover-letter.template.ts field order + presence. */
export function buildCoverLetterModel(input: {
  candidateName: string;
  contacts: Array<{ type: string; value: string }>;
  profileEmail: string;
  companyName: string | null | undefined;
  roleTitle: string | null | undefined;
  body: string;
  date?: Date;
}): CoverLetterModel {
  // Same builder the PDF uses (browser-safe export): unshift the profile
  // email when contacts lack one, sortContacts order, dedupe by label,
  // displayContact labels. Index sortOrder stands in for the display order.
  const items = buildCoverLetterContactItems(
    input.contacts.map((contact, index) => {
      return { ...contact, sortOrder: index };
    }),
    input.profileEmail
  );
  const company = (input.companyName?.trim() ?? "") || null;
  const roleTitle = (input.roleTitle?.trim() ?? "") || null;
  const date = input.date ?? new Date();
  return {
    name: input.candidateName.trim() || "Candidate",
    contactLine: items.length > 0 ? items.map((item) => item.label).join(" | ") : null,
    dateLine: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }),
    company,
    roleTitle,
    paragraphs: splitCoverLetterParagraphs(input.body).map((text, index) => {
      return {
        id: `p-${index}`,
        text
      };
    })
  };
}

/**
 * Verbatim mirror of packages/pdf `splitCoverLetterParagraphs`: CRLF
 * normalized, blank-line split (whitespace-only lines count), and EVERY
 * paragraph collapses stray intra-paragraph newlines to spaces — so the
 * paper matches the PDF for bodies with soft line breaks.
 */
function splitCoverLetterParagraphs(body: string): string[] {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (byBlank.length > 1) return byBlank;

  return [trimmed.replace(/\n+/g, " ").trim()].filter(Boolean);
}
