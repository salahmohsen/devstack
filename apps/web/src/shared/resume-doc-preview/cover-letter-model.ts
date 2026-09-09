import {
  buildCoverLetterContactItems,
  formatLetterDate,
  splitCoverLetterParagraphs
} from "@tsu-stack/pdf/doc";

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
  contacts: Array<{ type: string; value: string; sortOrder?: number }>;
  profileEmail: string;
  companyName: string | null | undefined;
  roleTitle: string | null | undefined;
  body: string;
  date?: Date;
}): CoverLetterModel {
  // Same builders the PDF uses (browser-safe exports): unshift the profile
  // email when contacts lack one, sortContacts order (real DB sortOrder wins
  // when provided; index stands in otherwise), dedupe by label, displayContact
  // labels, formatLetterDate.
  const items = buildCoverLetterContactItems(
    input.contacts.map((contact, index) => {
      return { ...contact, sortOrder: contact.sortOrder ?? index };
    }),
    input.profileEmail
  );
  const company = (input.companyName?.trim() ?? "") || null;
  const roleTitle = (input.roleTitle?.trim() ?? "") || null;
  const date = input.date ?? new Date();
  return {
    name: input.candidateName.trim() || "Candidate",
    contactLine: items.length > 0 ? items.map((item) => item.label).join(" | ") : null,
    dateLine: formatLetterDate(date),
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
