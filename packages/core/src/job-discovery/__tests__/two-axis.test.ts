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

  it("remote + unknown listing drops when remoteRegions is set; empty remoteRegions and empty locations keep it", () => {
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
        prefs: { workModes: ["remote"], locations: [], remoteRegions: [] }
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

  it("empty remoteRegions and empty locations keep any remote including US-only", () => {
    const openRemote: TwoAxisPrefs = {
      workModes: ["remote"],
      locations: [],
      remoteRegions: []
    };
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "us",
        location: "United States",
        prefs: openRemote
      }).action
    ).toBe("pass");
  });

  it("egypt hunt keeps EMEA remotes and drops EU-only and UK-only remotes", () => {
    const egyptHome: TwoAxisPrefs = {
      workModes: ["remote", "hybrid"],
      locations: ["egypt", "Cairo"],
      remoteRegions: []
    };
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "emea",
        location: null,
        prefs: egyptHome
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "eu",
        location: null,
        prefs: egyptHome
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "uk",
        location: "United Kingdom",
        prefs: egyptHome
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: null,
        location: "Gurugram, HARYANA, in",
        prefs: egyptHome
      }).action
    ).toBe("drop");
  });

  it("hybrid/onsite is a strict place match: London and MENA-wide drop for Egypt", () => {
    const egyptPlaces: TwoAxisPrefs = {
      workModes: ["hybrid", "onsite"],
      locations: ["egypt", "Cairo"],
      remoteRegions: []
    };
    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "uk",
        location: "London",
        prefs: egyptPlaces
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "mena",
        location: "MENA",
        prefs: egyptPlaces
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "onsite",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: egyptPlaces
      }).action
    ).toBe("pass");
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

  it("remote+hybrid egypt prefs drop remote+latam even when remoteRegions is empty", () => {
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
    ).toBe("drop");
  });

  it("worldwide hiring region still drops a specific place that is not related to locations", () => {
    const emptyRemoteEgypt: TwoAxisPrefs = {
      workModes: ["remote", "hybrid"],
      locations: ["egypt", "Cairo"],
      remoteRegions: []
    };
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: "India",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: "Remote Canada",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: "United States",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: "Remote",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: "Cairo",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: "Global - Remote",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("pass");
  });

  it("empty remoteRegions uses locations: worldwide and MENA keep, US and unknown drop", () => {
    const emptyRemoteEgypt: TwoAxisPrefs = {
      workModes: ["remote", "hybrid"],
      locations: ["egypt", "Cairo"],
      remoteRegions: []
    };

    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "worldwide",
        location: null,
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "mena",
        location: null,
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "us",
        location: "United States",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: null,
        location: "India",
        prefs: emptyRemoteEgypt
      }).action
    ).toBe("drop");
  });

  it("filled remoteRegions is the remote gate, not locations", () => {
    const usRemoteGate: TwoAxisPrefs = {
      workModes: ["remote", "hybrid"],
      locations: ["egypt", "Cairo"],
      remoteRegions: ["us"]
    };
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "us",
        location: "United States",
        prefs: usRemoteGate
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "mena",
        location: null,
        prefs: usRemoteGate
      }).action
    ).toBe("drop");
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

  it("hybrid/onsite does not match a sibling country through emea", () => {
    const remoteAndHybrid = {
      workModes: ["remote", "hybrid"] as Array<"remote" | "hybrid" | "onsite">,
      locations: ["egypt", "Cairo"],
      remoteRegions: [] as string[]
    };
    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "uk",
        location: "London, England, United Kingdom",
        prefs: remoteAndHybrid
      }).action
    ).toBe("drop");
    expect(
      decideTwoAxis({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Cairo",
        prefs: remoteAndHybrid
      }).action
    ).toBe("pass");
    expect(
      decideTwoAxis({
        workMode: "remote",
        hiringRegion: "uk",
        location: "United Kingdom",
        prefs: remoteAndHybrid
      }).action
    ).toBe("drop");
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
