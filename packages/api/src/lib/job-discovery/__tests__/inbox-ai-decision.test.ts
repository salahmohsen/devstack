import { describe, expect, it, vi } from "vitest";

import { jobDiscoveryRunRepository } from "@tsu-stack/db";

import {
  recordDiscoveryScoringWarning,
  decideEvaluateOutcome,
  decideInboxAiKeep,
  shouldInsertAfterCapRecheck
} from "#@/lib/job-discovery/inbox-ai";

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
        poolSize: 25
      })
    ).toBe(false);
  });

  it("still inserts dismissed when open inbox is already 50", () => {
    expect(
      shouldInsertAfterCapRecheck({
        trackingStatus: "dismissed",
        openInbox: 50,
        inboxThisRun: 25,
        poolSize: 25
      })
    ).toBe(true);
  });
});

it("does not retry a successfully inserted candidate when its warning write fails", async () => {
  const write = vi
    .spyOn(jobDiscoveryRunRepository, "addWarning")
    .mockRejectedValueOnce(new Error("warning storage unavailable"));
  try {
    await expect(
      recordDiscoveryScoringWarning("fixture-user", "fixture-run", "fallback")
    ).resolves.toBeUndefined();
  } finally {
    write.mockRestore();
  }
});
