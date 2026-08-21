import { describe, expect, it } from "vitest";

import {
  decideEvaluateOutcome,
  decideInboxAiKeep,
  shouldInsertAfterCapRecheck,
  shouldRefundHeuristicIncrement
} from "#@/lib/job-discovery/inbox-ai";
import {
  leftoverExtractIfNeeded,
  mergeLeftoverExtract,
  needsLeftoverByoExtract,
  parseLeftoverExtract
} from "#@/lib/job-discovery/leftover-extract";

describe("decideInboxAiKeep", () => {
  it("dismisses only an AI fail under minMatchScore", () => {
    expect(decideInboxAiKeep({ passed: false, source: "ai" })).toBe("dismissed");
  });

  it("keeps an AI pass", () => {
    expect(decideInboxAiKeep({ passed: true, source: "ai" })).toBe("passed");
  });

  it("does not dismiss a below-min heuristic that still passed cheap rules", () => {
    expect(decideInboxAiKeep({ passed: false, source: "heuristic", rulesFailed: false })).toBe(
      "heuristic"
    );
    expect(decideInboxAiKeep({ passed: true, source: "heuristic", rulesFailed: false })).toBe(
      "heuristic"
    );
  });

  it("dismisses a heuristic rules miss (title-keyword / exclude / evidence)", () => {
    expect(decideInboxAiKeep({ passed: false, source: "heuristic", rulesFailed: true })).toBe(
      "dismissed"
    );
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

  it("inserts a heuristic keeper with take when the one try succeeds", () => {
    expect(
      decideEvaluateOutcome({
        scoreError: false,
        keep: "heuristic",
        takeText: "Fit is unclear but the stack matches."
      }).insert
    ).toEqual({
      trackingStatus: "inbox",
      agentTake: "Fit is unclear but the stack matches."
    });
  });

  it("still inserts a heuristic keeper when take fails", () => {
    expect(
      decideEvaluateOutcome({ scoreError: false, keep: "heuristic", takeText: null }).insert
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

describe("shouldInsertAfterCapRecheck", () => {
  it("refuses inbox insert when the re-check sees 50 open inbox", () => {
    expect(
      shouldInsertAfterCapRecheck({
        trackingStatus: "inbox",
        openInbox: 50,
        inboxThisRun: 3,
        jobsPerRun: 25
      })
    ).toBe(false);
  });

  it("still inserts dismissed when open inbox is already 50", () => {
    expect(
      shouldInsertAfterCapRecheck({
        trackingStatus: "dismissed",
        openInbox: 50,
        inboxThisRun: 25,
        jobsPerRun: 25
      })
    ).toBe(true);
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

  it("does not refund 2×N when leftover extract already ran", () => {
    expect(shouldRefundHeuristicIncrement(true)).toBe(false);
    expect(shouldRefundHeuristicIncrement(false)).toBe(true);
  });

  it("treats a failed leftover parse as null so a 1-skill catalog list is kept", () => {
    expect(parseLeftoverExtract({})).toBeNull();
    expect(parseLeftoverExtract({ required: [], preferred: [] })).toBeNull();
    expect(
      parseLeftoverExtract({ employmentType: "unknown", required: [], preferred: [] })
    ).toBeNull();
    expect(
      mergeLeftoverExtract(
        { employmentType: "full_time", required: ["React"], preferred: [] },
        parseLeftoverExtract({ object: { foo: "bar" } })
      )
    ).toEqual({
      employmentType: "full_time",
      required: ["React"],
      preferred: []
    });
    expect(parseLeftoverExtract({ required: ["Go"], preferred: [] })).toEqual({
      employmentType: null,
      required: ["Go"],
      preferred: []
    });
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
