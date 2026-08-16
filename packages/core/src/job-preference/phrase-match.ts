/**
 * Product compounds: a shorter token is a different product if it only
 * appears as the prefix of this span. v1 incident fixture only.
 * Do not list `.js` suffixes — those must still match the short keyword.
 */
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

export function matchesKeywordPhrase(haystack: string, keyword: string): boolean {
  const needle = tokenizePhrase(keyword);
  if (needle.length === 0) return false;
  const tokens = tokenizePhrase(haystack);
  if (tokens.length < needle.length) return false;
  for (let i = 0; i <= tokens.length - needle.length; i += 1) {
    if (!spanEquals(tokens, i, needle)) continue;
    if (isCompoundPrefixOccupancy(tokens, i, needle)) continue;
    return true;
  }
  return false;
}

export function findMatchingKeywords(haystack: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => matchesKeywordPhrase(haystack, keyword));
}
