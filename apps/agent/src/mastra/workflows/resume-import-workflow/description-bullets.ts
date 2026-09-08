/**
 * Resume bullet structure for imported descriptions.
 *
 * The paper preview and the RenderCV pipeline split a description back into
 * highlight bullets (`extractBullets`: `<li>` items, `<p>` blocks, or newline
 * runs). The extractor model sometimes flattens a resume's bullet list into a
 * single prose line, so normalize re-splits on newlines and bullet glyphs and
 * emits `<p>`-per-bullet HTML — the same format the web review editor
 * (`bulletsToDescription`) writes, keeping the round-trip stable.
 */

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtmlText(text: string): string {
  // Same escapes as the web review editor's bulletsToDescription — quotes are
  // safe in element content and keeping the two writers identical makes the
  // draft round-trip stable.
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bullet glyphs seen on resumes. `·` is excluded — stack lines use "A · B". */
const BULLET_GLYPHS = "[•▪◦‣●∙]";

export function descriptionToBulletsHtml(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text) return "";

  const lines = text
    .replace(/<li\b[^>]*>/gi, "\n")
    .replace(/<\/(?:p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n+/)
    .flatMap((line) => line.split(new RegExp(`\\s*${BULLET_GLYPHS}\\s*`)))
    .map((line) =>
      decodeEntities(line)
        .replace(/^\s*[-–—*]\s+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  return lines.map((line) => `<p>${escapeHtmlText(line)}</p>`).join("");
}
