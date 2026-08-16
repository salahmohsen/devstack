import { describe, expect, it } from "vitest";

import { decideTwoAxis, type TwoAxisPrefs } from "#@/job-discovery/two-axis";

const egyptRemotePrefs: TwoAxisPrefs = {
  workModes: ["remote"],
  locations: [],
  remoteRegions: ["egypt"]
};

describe("decideTwoAxis", () => {
  it("drops unknown work mode", () => {
    expect(
      decideTwoAxis({
        workMode: null,
        hiringRegion: "worldwide",
        location: null,
        prefs: egyptRemotePrefs
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

  it("remote + unknown listing drops when remoteRegions is set; empty remoteRegions keeps it", () => {
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: null,
        location: null,
        prefs: egyptRemotePrefs
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: null,
        location: null,
        prefs: { ...egyptRemotePrefs, remoteRegions: [] }
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
    const allThree: TwoAxisPrefs = {
      workModes: ["remote", "hybrid", "onsite"],
      locations: ["egypt"],
      remoteRegions: ["egypt"]
    };
    const emptyModes: TwoAxisPrefs = {
      workModes: [],
      locations: ["egypt"],
      remoteRegions: ["egypt"]
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
        prefs: { workModes: ["onsite"], locations: [], remoteRegions: [] }
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: { workModes: ["hybrid"], locations: [], remoteRegions: [] }
      }).action
    ).toBe("drop");
  });

  it("onsite/hybrid requires place overlap", () => {
    expect(
      decideTwoAxis({
        workMode: "onsite",
        hiringRegion: "us",
        location: "New York",
        prefs: { workModes: ["onsite"], locations: ["egypt"], remoteRegions: [] }
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: { workModes: ["hybrid"], locations: ["egypt"], remoteRegions: [] }
      }).action
    ).toBe("pass");
  });

  it("hybrid+egypt drops remote+latam", () => {
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "latam",
        location: "LatAm",
        prefs: { workModes: ["hybrid"], locations: ["egypt"], remoteRegions: ["egypt"] }
      }).action
    ).toBe("drop");
  });

  it("remote+hybrid egypt prefs drop remote+latam unless remoteRegions is worldwide", () => {
    const remoteHybridEgypt: TwoAxisPrefs = {
      workModes: ["remote", "hybrid"],
      locations: ["egypt"],
      remoteRegions: ["egypt"]
    };

    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "latam",
        location: "LatAm",
        prefs: remoteHybridEgypt
      }).action
    ).toBe("drop");

    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "latam",
        location: "LatAm",
        prefs: { ...remoteHybridEgypt, remoteRegions: [] }
      }).action
    ).toBe("pass");
  });

  it("hybrid-only drops remotes regardless of remoteRegions", () => {
    for (const remoteRegions of [["egypt"], ["eu"], []] as const) {
      expect(
        decideTwoAxis({
          workMode: "remote",
          hiringRegion: "egypt",
          location: "Cairo",
          prefs: { workModes: ["hybrid"], locations: ["egypt"], remoteRegions: [...remoteRegions] }
        }).action
      ).toBe("drop");
    }
  });

  it("does not pass hybrid because leftover worldwide sits on locations", () => {
    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "latam",
        location: "LatAm",
        prefs: { workModes: ["hybrid"], locations: ["worldwide"], remoteRegions: [] }
      }).action
    ).toBe("drop");
  });
});
