/**
 * Everyday phrasing that should run the Today letter workflow.
 * "what's up with {company}" is a company ask, not Today.
 */
export function userTurnAsksDailyBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /what (do )?you have for me today|what you have for me today|what (do )?we have( today)?|what have we (got )?today|what we got today|what have you (got )?today/i.test(
      t
    )
  ) {
    return true;
  }
  if (/^(hey|hi|yo|ok|okay)?[,.]?\s*(what'?s|whats)\s+up(\s+today)?\s*[.?!]*$/i.test(t)) {
    return true;
  }
  if (/^(hey|hi|yo|ok|okay)?[,.]?\s*(what'?s|whats|what is)\s+new(\s+today)?\s*[.?!]*$/i.test(t)) {
    return true;
  }
  if (
    /\bwhat'?s\s+up\s+with\b/i.test(t) &&
    !/\b(catch me up|what we have|for me today)\b/i.test(t)
  ) {
    return false;
  }
  if (
    /what'?s (new|up)( today)?\b|daily (recap|brief|briefing)|for me today|today'?s (brief|briefing|pile|stuff)|catch me up|what'?s(?: \w+){0,3} on my plate|\bon my plate\b|brief me\b|anything (new )?(for me|today)|what landed|what showed up|update me( on today)?|what should i know today/i.test(
      t
    )
  ) {
    return true;
  }
  if (/\b(what|anything|whats|what'?s)\b[\s\S]{0,80}\btoday\b/i.test(t)) return true;
  return false;
}
