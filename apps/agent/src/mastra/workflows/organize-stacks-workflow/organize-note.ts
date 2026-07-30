/**
 * Calm, user-facing notes when organize LLM steps skip or soft-fail.
 * Never include API keys or full stack traces — first line / short message only.
 */

export type OrganizeLlmStep = "rename" | "enrich" | "sort";

function firstLine(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const line = raw.split("\n")[0]?.trim() ?? "";
  return line.slice(0, 160);
}

/** Stable skip note when no BYO model is available (same text so multi-step skips dedupe). */
export function organizeMissingByoNote(_step?: OrganizeLlmStep): string {
  return "AI organize suggestions were skipped — configure a provider in Settings → AI.";
}

/** Agent registry miss — same text for all steps so notes dedupe. */
export function organizeMissingAgentNote(_step?: OrganizeLlmStep): string {
  return "AI organize agent was unavailable — only deterministic merges ran.";
}

/** Soft-fail after catch: include a short provider/reason snippet for balance/billing UX. */
export function organizeLlmFailedNote(step: OrganizeLlmStep, error: unknown): string {
  const detail = firstLine(error);
  const detailSuffix = detail ? ` (${detail})` : "";
  switch (step) {
    case "rename":
      return `AI rename failed for some stacks — results may be incomplete${detailSuffix}.`;
    case "enrich":
      return `AI enrichments failed for some stacks — results may be incomplete${detailSuffix}.`;
    case "sort":
      return `AI importance order failed — stack order was left unchanged${detailSuffix}.`;
  }
}

/** Dedupe while preserving first-seen order. */
export function uniqueNotes(...groups: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const note of group) {
      const trimmed = note.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}
