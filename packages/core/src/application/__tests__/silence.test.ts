import { describe, expect, it } from "vitest";

import { silencePhase } from "#@/application/silence";

describe("silencePhase", () => {
  it("is quiet under 7 days", () => {
    expect(
      silencePhase({
        now: new Date("2026-08-20"),
        stageChangedAt: new Date("2026-08-18"),
        lastLinkedMailAt: null,
        lastSilenceNudgeAt: null,
        lastGhostSuggestAt: null
      })
    ).toBe("quiet");
  });

  it("nudges at 7 days once", () => {
    expect(
      silencePhase({
        now: new Date("2026-08-20"),
        stageChangedAt: new Date("2026-08-13"),
        lastLinkedMailAt: null,
        lastSilenceNudgeAt: null,
        lastGhostSuggestAt: null
      })
    ).toBe("nudge7");
  });

  it("does not re-nudge after a 7d notify before 14d", () => {
    expect(
      silencePhase({
        now: new Date("2026-08-20"),
        stageChangedAt: new Date("2026-08-12"),
        lastLinkedMailAt: null,
        lastSilenceNudgeAt: new Date("2026-08-19"),
        lastGhostSuggestAt: null
      })
    ).toBe("quiet");
  });

  it("suggests ghost at 14 days", () => {
    expect(
      silencePhase({
        now: new Date("2026-08-20"),
        stageChangedAt: new Date("2026-08-01"),
        lastLinkedMailAt: null,
        lastSilenceNudgeAt: new Date("2026-08-08"),
        lastGhostSuggestAt: null
      })
    ).toBe("suggestGhost14");
  });

  it("linked mail resets the clock", () => {
    expect(
      silencePhase({
        now: new Date("2026-08-20"),
        stageChangedAt: new Date("2026-08-01"),
        lastLinkedMailAt: new Date("2026-08-19"),
        lastSilenceNudgeAt: new Date("2026-08-08"),
        lastGhostSuggestAt: null
      })
    ).toBe("quiet");
  });
});
