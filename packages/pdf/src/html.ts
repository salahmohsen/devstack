function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Prefer list items; else split multi-paragraph HTML into bullet-sized chunks.
 * Avoid dumping a wall of prose as a single bullet (bad for ATS + humans).
 */
export function extractBullets(html: string): string[] {
  const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]!).replace(/\s+/g, " ").trim();
    if (text) items.push(text);
  }
  if (items.length > 0) return items;

  const plain = stripHtml(html);
  if (!plain) return [];

  const paragraphs = plain
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length > 1) return paragraphs;

  return [paragraphs[0]!];
}

export function summaryPlainText(html: string): string {
  return stripHtml(html);
}
