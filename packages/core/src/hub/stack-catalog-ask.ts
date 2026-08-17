/**
 * Everyday phrasing that should read the stack catalog this turn.
 * Organize / detect stay their own tools.
 */
export function userTurnAsksStackCatalog(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\b(organize|detect)\b.{0,40}\bstacks?\b|\bstacks?\b.{0,40}\b(organize|detect)\b/i.test(t)) {
    return false;
  }
  if (
    /\b(stack list|list (my )?stacks|pull (the |my )?(full )?stack|filter .{0,80}stacks|my stacks)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(skills? i use|tools i use|tech i (use|know)|technologies\/languages|other technologies)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return /\b(skills|stacks|tech stack)\b/i.test(t) && /\b(list|pull|filter|what)\b/i.test(t);
}

/** “you didn’t pull / I can’t find the answer” after a stack ask. */
export function userTurnRetriesStackCatalog(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /you didn'?t (pull|generate)|didn'?t (pull|generate) (the )?(stack|answer)|can'?t find your answer|again you didn'?t/i.test(
    t
  );
}
