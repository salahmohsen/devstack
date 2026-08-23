/**
 * Strip common LLM punctuation/voice tells from apply-package prose.
 * Inspired by Wikipedia "Signs of AI writing" / humanizer skill: no em/en dashes,
 * no spaced double-hyphen asides, prefer plain commas/periods.
 */

const EM_OR_EN_DASH = /\s*[—–]\s*/g;
/** Spaced `--` used like an em dash (keep compound words like `end-to-end`). */
const SPACED_DOUBLE_HYPHEN = /\s+--\s+/g;

/** Replace em/en dashes and spaced `--` with a comma+space (or period-friendly join). */
export function stripAiDashes(text: string): string {
  return text
    .replace(EM_OR_EN_DASH, ", ")
    .replace(SPACED_DOUBLE_HYPHEN, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .trim();
}

/** Humanize one prose field; empty/whitespace stays empty string. */
export function humanizeApplyPackageProse(text: string): string {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";
  return stripAiDashes(trimmed);
}

/** Map humanize over bullet lists; drop empties after clean. */
export function humanizeApplyPackageBullets(bullets: readonly string[]): string[] {
  return bullets.map(humanizeApplyPackageProse).filter((b) => b.length > 0);
}
