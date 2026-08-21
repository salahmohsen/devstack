import { applyYearsCap } from "#@/job-discovery/years-cap";

export const FIT_DIMENSIONS = [
  { key: "title", weight: 20 },
  { key: "experience", weight: 25 },
  { key: "seniority", weight: 15 },
  { key: "skills", weight: 15 },
  { key: "company", weight: 10 },
  { key: "location", weight: 15 }
] as const;

export type FitDimensionKey = (typeof FIT_DIMENSIONS)[number]["key"];

export type FitDimensionScore = {
  key: FitDimensionKey;
  score: number;
  comment: string;
};

export type FitAnalysis = {
  overall: number;
  displayOverall: number;
  capped: boolean;
  dimensions: FitDimensionScore[];
  strengths: string[];
  gaps: string[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function overallFitScore(dimensions: readonly FitDimensionScore[]): number {
  const byKey = new Map(dimensions.map((row) => [row.key, clampScore(row.score)]));
  let sum = 0;
  for (const dim of FIT_DIMENSIONS) {
    sum += (byKey.get(dim.key) ?? 0) * dim.weight;
  }
  return Math.round(sum / 100);
}

export function applyFitYearsCap(input: {
  overall: number;
  listingMinYears: number | null | undefined;
  seekerYears: number | null | undefined;
}): { overall: number; displayOverall: number; capped: boolean } {
  const cap = applyYearsCap({
    aiScore: input.overall,
    listingMinYears: input.listingMinYears,
    seekerYears: input.seekerYears
  });
  return {
    overall: cap.landScore,
    displayOverall: cap.displayScore,
    capped: cap.capped
  };
}

export function sanitizeFitAnalysis(raw: unknown): FitAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const rows = Array.isArray(rec.dimensions) ? rec.dimensions : [];
  const dimensions: FitDimensionScore[] = [];
  for (const dim of FIT_DIMENSIONS) {
    const hit = rows.find(
      (row) => row && typeof row === "object" && (row as { key?: unknown }).key === dim.key
    ) as { score?: unknown; comment?: unknown } | undefined;
    dimensions.push({
      key: dim.key,
      score: clampScore(typeof hit?.score === "number" ? hit.score : 0),
      comment: typeof hit?.comment === "string" ? hit.comment.trim() : ""
    });
  }
  const overall = overallFitScore(dimensions);
  const listingMinYears = typeof rec.listingMinYears === "number" ? rec.listingMinYears : null;
  const seekerYears = typeof rec.seekerYears === "number" ? rec.seekerYears : null;
  const capped = applyFitYearsCap({ overall, listingMinYears, seekerYears });
  const strengths = Array.isArray(rec.strengths)
    ? rec.strengths.filter((s): s is string => typeof s === "string").slice(0, 8)
    : [];
  const gaps = Array.isArray(rec.gaps)
    ? rec.gaps.filter((s): s is string => typeof s === "string").slice(0, 8)
    : [];
  return {
    overall: capped.overall,
    displayOverall: capped.displayOverall,
    capped: capped.capped,
    dimensions,
    strengths,
    gaps
  };
}

export function fitAnalysisPackageHash(parts: {
  resumeText: string;
  coverText: string;
  listingUrl: string | null;
}): string {
  const payload = [parts.resumeText.trim(), parts.coverText.trim(), parts.listingUrl ?? ""].join(
    "|"
  );
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 31 + payload.charCodeAt(i)) | 0;
  }
  return `fh_${Math.abs(hash).toString(16)}`;
}
