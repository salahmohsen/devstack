/** Copy columns that must be grounded in project analysis on edit. */
export const PROJECT_ANALYSIS_COPY_COLUMNS = ["summary", "description"] as const;

const STOP_TERMS = new Set([
  "this",
  "that",
  "with",
  "from",
  "have",
  "been",
  "were",
  "they",
  "them",
  "then",
  "than",
  "also",
  "into",
  "over",
  "under",
  "about",
  "after",
  "before",
  "using",
  "used",
  "uses",
  "make",
  "made",
  "more",
  "most",
  "such",
  "only",
  "just",
  "very",
  "each",
  "other",
  "which",
  "while",
  "where",
  "when",
  "what",
  "your",
  "their",
  "there",
  "here",
  "project",
  "projects",
  "application",
  "applications",
  "system",
  "systems",
  "platform",
  "platforms"
]);

export type ProjectAnalysisGrounding =
  | { ok: true }
  | { ok: false; reason: "missing_analysis" | "ungrounded" };

function significantTerms(text: string): Set<string> {
  const terms = new Set<string>();
  const normalized = text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ");
  for (const raw of normalized.split(/\s+/)) {
    const term = raw.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, "");
    if (term.length < 4) continue;
    if (STOP_TERMS.has(term)) continue;
    terms.add(term);
  }
  return terms;
}

export function extractProjectAnalysisOutline(
  analysis: string,
  excerptChars = 2400
): { headings: string[]; excerpt: string; truncated: boolean } {
  const trimmed = analysis.trim();
  const headings: string[] = [];
  for (const match of trimmed.matchAll(/^#{1,3}\s+(.+)$/gm)) {
    const heading = match[1]?.trim() ?? "";
    if (!heading) continue;
    headings.push(heading);
    if (headings.length >= 16) break;
  }
  return {
    headings,
    excerpt: trimmed.slice(0, excerptChars),
    truncated: trimmed.length > excerptChars
  };
}

export function projectPatchTouchesCopy(patch: Record<string, unknown>): boolean {
  return PROJECT_ANALYSIS_COPY_COLUMNS.some((column) => {
    const value = patch[column];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/**
 * Edit patches that change summary/description must come from analysis
 * (plus any analysis the user just added on the same patch). Title, year,
 * links, and portfolio flags do not need analysis. Creates skip this check —
 * the interview is the source.
 */
export function projectPatchGroundedInAnalysis(input: {
  mode: "create" | "update";
  analysis: string | null | undefined;
  patch: Record<string, unknown>;
}): ProjectAnalysisGrounding {
  if (input.mode === "create") return { ok: true };
  if (!projectPatchTouchesCopy(input.patch)) return { ok: true };

  const analysisPatch = typeof input.patch.analysis === "string" ? input.patch.analysis.trim() : "";
  const basis = `${input.analysis ?? ""}\n${analysisPatch}`.trim();
  if (!basis) return { ok: false, reason: "missing_analysis" };

  const proposed = PROJECT_ANALYSIS_COPY_COLUMNS.map((column) => {
    const value = input.patch[column];
    return typeof value === "string" ? value : "";
  }).join(" ");
  const proposedTerms = [...significantTerms(proposed)];
  if (proposedTerms.length === 0) return { ok: false, reason: "ungrounded" };

  const analysisTerms = significantTerms(basis);
  const hits = proposedTerms.filter((term) => analysisTerms.has(term));
  const ratio = hits.length / proposedTerms.length;
  if (hits.length < 2 || ratio < 0.25) return { ok: false, reason: "ungrounded" };
  return { ok: true };
}
