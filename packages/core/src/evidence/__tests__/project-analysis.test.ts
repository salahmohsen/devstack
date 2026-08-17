import { describe, expect, it } from "vitest";

import {
  extractProjectAnalysisOutline,
  projectPatchGroundedInAnalysis
} from "#@/evidence/project-analysis";

describe("extractProjectAnalysisOutline", () => {
  it("pulls headings and a short excerpt", () => {
    const outline = extractProjectAnalysisOutline(
      "# EDGE Admin\n\nOps console.\n\n## Business overview\n\nMulti-center workspace.\n",
      40
    );
    expect(outline.headings).toEqual(["EDGE Admin", "Business overview"]);
    expect(outline.excerpt.startsWith("# EDGE Admin")).toBe(true);
    expect(outline.truncated).toBe(true);
  });
});

const analysis = `
# Personal Hub — engineering analysis
A self-hostable multi-user career OS. Hono + oRPC typed API, Drizzle schema,
Better Auth, Mastra agents. Public portfolios and a Career Inbox.
`;

describe("projectPatchGroundedInAnalysis", () => {
  it("allows creates and metadata-only updates", () => {
    expect(
      projectPatchGroundedInAnalysis({
        mode: "create",
        analysis: null,
        patch: { title: "New", summary: "Invented story", year: 2026 }
      })
    ).toEqual({ ok: true });
    expect(
      projectPatchGroundedInAnalysis({
        mode: "update",
        analysis: null,
        patch: { title: "Dev-Hub", year: 2026, demoUrl: "https://hub.example.com" }
      })
    ).toEqual({ ok: true });
  });

  it("blocks summary edits when analysis is empty", () => {
    expect(
      projectPatchGroundedInAnalysis({
        mode: "update",
        analysis: "   ",
        patch: { summary: "Backend-first career OS on Hono" }
      })
    ).toEqual({ ok: false, reason: "missing_analysis" });
  });

  it("allows copy that reuses analysis facts", () => {
    expect(
      projectPatchGroundedInAnalysis({
        mode: "update",
        analysis,
        patch: {
          summary:
            "Self-hostable career OS. Typed Hono + oRPC API, Drizzle, Better Auth, Mastra agents."
        }
      })
    ).toEqual({ ok: true });
  });

  it("blocks invented copy that does not appear in analysis", () => {
    expect(
      projectPatchGroundedInAnalysis({
        mode: "update",
        analysis,
        patch: {
          summary: "Native iOS banking wallet with Salesforce and React Native."
        }
      })
    ).toEqual({ ok: false, reason: "ungrounded" });
  });

  it("treats an analysis patch as extra basis for user-stated facts", () => {
    expect(
      projectPatchGroundedInAnalysis({
        mode: "update",
        analysis,
        patch: {
          analysis: "Also uses Redis for the job queue.",
          summary: "Career OS with Hono, oRPC, and a Redis job queue."
        }
      })
    ).toEqual({ ok: true });
  });
});
