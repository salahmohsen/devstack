import { buildDocumentPDFBytes, type DocumentBlock, type DocumentParams } from "pdfnative";

import { loadPdfALatinFontEntries } from "#@/mastra/lib/pdf/pdfa-latin-font";

export type CoverLetterPdfInput = {
  candidateName: string;
  body: string;
  companyName?: string | null;
  roleTitle?: string | null;
  /** Defaults to now. */
  date?: Date;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/**
 * Split cover letter body into paragraphs (blank-line separated).
 * Falls back to single paragraphs split by newlines when no blank lines.
 */
function splitParagraphs(body: string): string[] {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  if (byBlank.length > 1) return byBlank;

  // Single block — keep as one paragraph (join soft line breaks).
  return [trimmed.replace(/\n+/g, " ").trim()].filter(Boolean);
}

/**
 * Build a simple multi-paragraph cover letter PDF (pdfnative, same stack as resume).
 */
export async function buildCoverLetterPdfBytes(input: CoverLetterPdfInput): Promise<Uint8Array> {
  const blocks: DocumentBlock[] = [];

  blocks.push({
    type: "heading",
    text: "Cover Letter",
    level: 1
  });

  const companyName = input.companyName?.trim() ?? "";
  const roleTitle = input.roleTitle?.trim() ?? "";
  const metaParts = [
    input.candidateName.trim() || null,
    formatDate(input.date ?? new Date()),
    companyName,
    roleTitle ? `Re: ${roleTitle}` : null
  ].filter(Boolean);

  if (metaParts.length > 0) {
    blocks.push({
      type: "paragraph",
      text: metaParts.join(" · "),
      fontSize: 9,
      color: "#555555"
    });
  }

  blocks.push({ type: "spacer", height: 16 });

  const paragraphs = splitParagraphs(input.body);
  for (const paragraph of paragraphs) {
    blocks.push({
      type: "paragraph",
      text: paragraph,
      fontSize: 11,
      lineHeight: 1.4
    });
    blocks.push({ type: "spacer", height: 10 });
  }

  const params: DocumentParams = {
    blocks,
    fontEntries: await loadPdfALatinFontEntries()
  };
  return buildDocumentPDFBytes(params, {
    tagged: "pdfa2u",
    margins: { t: 52, r: 52, b: 52, l: 52 }
  });
}
