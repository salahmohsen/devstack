import { describe, expect, it } from "vitest";

import {
  overallFitScore,
  sanitizeFitAnalysis,
  type FitDimensionScore
} from "#@/application/fit-analysis";

const dims = (scores: number[]): FitDimensionScore[] =>
  (
    [
      ["title", 20],
      ["experience", 25],
      ["seniority", 15],
      ["skills", 15],
      ["company", 10],
      ["location", 15]
    ] as const
  ).map(([key], i) => {
    return { key, score: scores[i] ?? 0, comment: "" };
  });

describe("overallFitScore", () => {
  it("weights Title 20 / Experience 25 / Seniority 15 / Skills 15 / Company 10 / Location 15", () => {
    expect(overallFitScore(dims([100, 100, 100, 100, 100, 100]))).toBe(100);
    expect(overallFitScore(dims([0, 0, 0, 0, 0, 0]))).toBe(0);
    expect(overallFitScore(dims([100, 0, 0, 0, 0, 0]))).toBe(20);
  });

  it("treats missing keys as 0", () => {
    expect(overallFitScore([{ key: "title", score: 100, comment: "" }])).toBe(20);
  });
});

describe("sanitizeFitAnalysis", () => {
  it("drops unknown keys and clamps scores", () => {
    const out = sanitizeFitAnalysis({
      dimensions: [
        { key: "title", score: 150, comment: "ok" },
        { key: "nope", score: 90, comment: "x" }
      ]
    });
    expect(out?.dimensions.find((d) => d.key === "title")?.score).toBe(100);
    expect(out?.dimensions.some((d) => d.key === "title")).toBe(true);
    expect(out?.overall).toBe(20);
  });
});
