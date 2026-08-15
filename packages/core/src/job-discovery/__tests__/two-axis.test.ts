import { describe, expect, it } from "vitest";

import { decideTwoAxis } from "#@/job-discovery/two-axis";

const egyptRemotePrefs = {
  workModes: ["remote"] as Array<"remote" | "hybrid" | "onsite">,
  locations: ["egypt"]
};

describe("decideTwoAxis", () => {
  it("drops unknown work mode", () => {
    expect(
      decideTwoAxis({
        workMode: null,
        hiringRegion: "worldwide",
        location: null,
        prefs: { workModes: ["remote"], locations: ["egypt"] }
      }).action
    ).toBe("drop");
  });

  it("drops remote+latam for egypt prefs; keeps remote+mena and remote+worldwide", () => {
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "latam",
        location: "LatAm",
        prefs: egyptRemotePrefs
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "mena",
        location: null,
        prefs: egyptRemotePrefs
      }).action
    ).toBe("pass");

    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: null,
        prefs: egyptRemotePrefs
      }).action
    ).toBe("pass");
  });

  it("drops remote+us for egypt prefs", () => {
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "us",
        location: "US only",
        prefs: egyptRemotePrefs
      }).action
    ).toBe("drop");
  });

  it("remote + no hiringRegion treats as worldwide (pass) when remote selected", () => {
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: null,
        location: null,
        prefs: egyptRemotePrefs
      }).action
    ).toBe("pass");
  });

  it("drops when listing mode not in prefs", () => {
    expect(
      decideTwoAxis({
        workMode: "onsite",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: egyptRemotePrefs
      }).action
    ).toBe("drop");
  });

  it("all three work modes skips mode filter (same as empty)", () => {
    const allThree = {
      workModes: ["remote", "hybrid", "onsite"] as Array<"remote" | "hybrid" | "onsite">,
      locations: ["egypt"]
    };
    const emptyModes = {
      workModes: [] as Array<"remote" | "hybrid" | "onsite">,
      locations: ["egypt"]
    };

    for (const prefs of [allThree, emptyModes]) {
      expect(
        decideTwoAxis({
          workMode: "hybrid",
          hiringRegion: "egypt",
          location: "Cairo",
          prefs
        }).action
      ).toBe("pass");
      expect(
        decideTwoAxis({
          workMode: "remote",
          hiringRegion: "mena",
          location: null,
          prefs
        }).action
      ).toBe("pass");
    }
  });

  it("onsite/hybrid with empty user locations drops", () => {
    expect(
      decideTwoAxis({
        workMode: "onsite",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: { workModes: ["onsite"], locations: [] }
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: { workModes: ["hybrid"], locations: [] }
      }).action
    ).toBe("drop");
  });

  it("onsite/hybrid requires place overlap", () => {
    expect(
      decideTwoAxis({
        workMode: "onsite",
        hiringRegion: "us",
        location: "New York",
        prefs: { workModes: ["onsite"], locations: ["egypt"] }
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: { workModes: ["hybrid"], locations: ["egypt"] }
      }).action
    ).toBe("pass");
  });

  it("hybrid+egypt drops remote+latam", () => {
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "latam",
        location: "LatAm",
        prefs: { workModes: ["hybrid"], locations: ["egypt"] }
      }).action
    ).toBe("drop");
  });
});
