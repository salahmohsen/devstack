/**
 * After get-search-brief, identity / rules / show-the-brief only need the File
 * Diff. Section / what-changed questions need a short spoken answer.
 *
 * Conservative: default false unless the turn is clearly about a missing or
 * changed brief section.
 */
const BRIEF_SECTION_RE =
  /\b(?:intro(?:duction)?|opening|paragraph|section|skills?(?:\s+section)?|who(?:\s+i\s+am)?\s+paragraph|target jobs|compensation)\b/;

const WHAT_CHANGED_RE = /\bwhat\s+changed\b/;
const WHAT_HAPPENED_RE = /\bwhat\s+happened(?:\s+to)?\b/;
const WHERE_IS_RE = /\bwhere(?:'s|\s+is)\b/;
const WHERE_DID_RE = /\bwhere\s+did\b/;
const WENT_OR_MISSING_RE = /\b(?:go|gone|missing|dropped|removed|disappeared|rewritten|deleted)\b/;

function normalizeSearchBriefUserTurn(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchBriefUserTurnNeedsSpokenAnswer(text: string): boolean {
  const q = normalizeSearchBriefUserTurn(text);
  if (!q) return false;
  if (WHAT_CHANGED_RE.test(q)) return true;
  if (!BRIEF_SECTION_RE.test(q)) return false;
  if (WHAT_HAPPENED_RE.test(q)) return true;
  if (WHERE_IS_RE.test(q)) return true;
  if (WHERE_DID_RE.test(q) && WENT_OR_MISSING_RE.test(q)) return true;
  return WENT_OR_MISSING_RE.test(q);
}
