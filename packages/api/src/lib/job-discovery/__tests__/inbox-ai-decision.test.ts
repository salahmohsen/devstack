import { describe, expect, it } from "vitest";

import { decideEvaluateOutcome, decideInboxAiKeep } from "#@/lib/job-discovery/inbox-ai";
import {
  leftoverExtractIfNeeded,
  mergeLeftoverExtract,
  needsLeftoverByoExtract
} from "#@/lib/job-discovery/leftover-extract";

describe("decideInboxAiKeep", () => {
  it("dismisses only an AI fail under minMatchScore", () => {
    expect(decideInboxAiKeep({ passed: false, source: "ai" })).toBe("dismissed");
  });

  it("keeps an AI pass", () => {
    expect(decideInboxAiKeep({ passed: true, source: "ai" })).toBe("passed");
  });

  it("does not dismiss when the scorer fell back to heuristic", () => {
    expect(decideInboxAiKeep({ passed: false, source: "heuristic" })).toBe("heuristic");
    expect(decideInboxAiKeep({ passed: true, source: "heuristic" })).toBe("heuristic");
  });
});

describe("decideEvaluateOutcome", () => {
  it("includes agentTake on inbox insert when take succeeds before insert", () => {
    expect(
      decideEvaluateOutcome({
        scoreError: false,
        keep: "passed",
        takeText: "Strong fit for your React + Egypt remote prefs."
      })
    ).toEqual({
      outcome: "passed",
      insert: {
        trackingStatus: "inbox",
        agentTake: "Strong fit for your React + Egypt remote prefs."
      },
      backfill: false
    });
  });

  it("still inserts a keeper when take fails", () => {
    expect(
      decideEvaluateOutcome({ scoreError: false, keep: "passed", takeText: null }).insert
    ).toEqual({ trackingStatus: "inbox", agentTake: null });
  });

  it("does not insert a dismissed row on score_error", () => {
    expect(decideEvaluateOutcome({ scoreError: true, keep: null, takeText: null })).toEqual({
      outcome: "skipped",
      insert: null,
      backfill: true
    });
  });
});

describe("leftover BYO extract", () => {
  it("is invoked when required skills are empty", async () => {
    let invoked = false;
    const result = await leftoverExtractIfNeeded({
      willCallAgent: true,
      skills: [],
      employmentType: "full_time",
      extract: async () => {
        invoked = true;
        return { employmentType: "full_time" as const, required: ["React"], preferred: [] };
      }
    });
    expect(needsLeftoverByoExtract({ skills: [], employmentType: "full_time" })).toBe(true);
    expect(invoked).toBe(true);
    expect(result).toEqual({
      invoked: true,
      result: { employmentType: "full_time", required: ["React"], preferred: [] }
    });
  });

  it("is not invoked when skills are rich and employment is known", async () => {
    let invoked = false;
    await leftoverExtractIfNeeded({
      willCallAgent: true,
      skills: ["React", "TypeScript"],
      employmentType: "full_time",
      extract: async () => {
        invoked = true;
        return { employmentType: "full_time" as const, required: ["Go"], preferred: [] };
      }
    });
    expect(invoked).toBe(false);
  });

  it("does not apply extracted workMode and fills thin leftover only", () => {
    const merged = mergeLeftoverExtract(
      { employmentType: "unknown", required: [], preferred: [] },
      { employmentType: "contract", required: ["Katalon"], preferred: ["GraphQL"] }
    );
    expect(merged).toEqual({
      employmentType: "contract",
      required: ["Katalon"],
      preferred: ["GraphQL"]
    });
    expect(
      mergeLeftoverExtract(
        { employmentType: "full_time", required: ["React", "TypeScript"], preferred: [] },
        { employmentType: "contract", required: ["Go"], preferred: ["Rust"] }
      )
    ).toEqual({
      employmentType: "full_time",
      required: ["React", "TypeScript"],
      preferred: []
    });
  });
});
