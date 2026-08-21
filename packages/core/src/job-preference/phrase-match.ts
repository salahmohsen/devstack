/** Occupied product spans. Do not list `.js` suffixes — those still match the short keyword. */
export const KEYWORD_COMPOUNDS = ["react native"] as const;

const PUNCT_TO_SPACE = /[._/-]+/g;

function normalizePhraseText(value: string): string {
  return value.toLowerCase().replace(PUNCT_TO_SPACE, " ").replace(/\s+/g, " ").trim();
}

function tokenizePhrase(value: string): string[] {
  const normalized = normalizePhraseText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length > 0);
}

function spanEquals(tokens: readonly string[], start: number, needle: readonly string[]): boolean {
  if (start < 0 || start + needle.length > tokens.length) return false;
  for (let i = 0; i < needle.length; i += 1) {
    if (tokens[start + i] !== needle[i]) return false;
  }
  return true;
}

const COMPOUND_TOKEN_SPANS = KEYWORD_COMPOUNDS.map((compound) => tokenizePhrase(compound));

/** True when `needle` at `start` is only a prefix of a listed compound span. */
function isCompoundPrefixOccupancy(
  tokens: readonly string[],
  start: number,
  needle: readonly string[]
): boolean {
  for (const compound of COMPOUND_TOKEN_SPANS) {
    if (needle.length >= compound.length) continue;
    if (!spanEquals(tokens, start, compound)) continue;
    if (spanEquals(compound, 0, needle)) return true;
  }
  return false;
}

/**
 * Hyphen/space spellings of the same role word. `normalizePhraseText` already
 * turns "front-end" into "front end"; "frontend" is still one token.
 */
const JOINED_SPELLINGS: Readonly<Record<string, readonly string[]>> = {
  frontend: ["frontend", "front end"],
  backend: ["backend", "back end"],
  fullstack: ["fullstack", "full stack"]
};

function needleVariants(keyword: string): string[][] {
  const primary = tokenizePhrase(keyword);
  if (primary.length === 0) return [];
  const spellings = JOINED_SPELLINGS[primary.join("")];
  if (!spellings) return [primary];
  const seen = new Set<string>();
  const variants: string[][] = [];
  for (const spelling of spellings) {
    const tokens = tokenizePhrase(spelling);
    const key = tokens.join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push(tokens);
  }
  return variants;
}

export function matchesKeywordPhrase(haystack: string, keyword: string): boolean {
  const needles = needleVariants(keyword);
  if (needles.length === 0) return false;
  const tokens = tokenizePhrase(haystack);
  for (const needle of needles) {
    if (tokens.length < needle.length) continue;
    for (let i = 0; i <= tokens.length - needle.length; i += 1) {
      if (!spanEquals(tokens, i, needle)) continue;
      if (isCompoundPrefixOccupancy(tokens, i, needle)) continue;
      return true;
    }
  }
  return false;
}

export function findMatchingKeywords(haystack: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => matchesKeywordPhrase(haystack, keyword));
}
