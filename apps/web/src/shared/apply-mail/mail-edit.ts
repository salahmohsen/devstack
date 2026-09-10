/**
 * Paragraph reassembly for the editable outbound mail — same commit contract
 * as the cover letter paper: committing an emptied paragraph removes it,
 * otherwise it replaces in place. The caller persists `join("\n\n")`.
 */
export function applyMailParagraphEdit(
  paragraphs: string[],
  index: number,
  next: string
): string[] {
  return paragraphs.flatMap((paragraph, i) => (i === index ? (next ? [next] : []) : [paragraph]));
}
