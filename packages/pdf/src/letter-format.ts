/**
 * Pure cover-letter format helpers — safe for browser bundles (see `doc.ts`).
 * Extracted verbatim from `cover-letter.ts` so web previews mirror the PDF's
 * paragraph splitting and date formatting without importing the node-only
 * render entry.
 */

/**
 * Split cover letter body into paragraphs (blank-line separated).
 * Falls back to a single paragraph with soft line breaks joined when no blank lines.
 */
export function splitCoverLetterParagraphs(body: string): string[] {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (byBlank.length > 1) return byBlank;

  return [trimmed.replace(/\n+/g, " ").trim()].filter(Boolean);
}

export function formatLetterDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
