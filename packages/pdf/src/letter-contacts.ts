/**
 * Pure cover-letter contact-line builder — safe for browser bundles (see
 * `doc.ts`). Extracted from `cover-letter.ts` so web previews mirror the
 * PDF's contact line without importing the node-only render entry.
 */
import { contactHref, displayContact, parseRenderCvSocial, sortContacts } from "#@/contacts";
import { type PdfContact } from "#@/types";

const CORE_CONTACT_TYPES = new Set(["location", "phone", "email", "website"]);

export type CoverLetterContactItem = {
  type: string;
  label: string;
  href: string | null;
};

/** Name + one contact line: same omit rules as the resume (no Discord / unknown / invalid socials). */
export function buildCoverLetterContactItems(
  contacts: PdfContact[],
  profileEmail: string
): CoverLetterContactItem[] {
  const list = [...contacts];
  const hasEmail = list.some((c) => c.type === "email");
  if (!hasEmail && profileEmail.trim()) {
    list.unshift({ type: "email", value: profileEmail.trim(), sortOrder: -1 });
  }

  const items: CoverLetterContactItem[] = [];
  const seen = new Set<string>();
  for (const contact of sortContacts(list)) {
    const social = parseRenderCvSocial(contact.type, contact.value);
    if (!social && !CORE_CONTACT_TYPES.has(contact.type)) continue;

    const label = displayContact(contact.type, contact.value);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      type: contact.type,
      label,
      href: contactHref(contact.type, contact.value)
    });
  }
  return items;
}
