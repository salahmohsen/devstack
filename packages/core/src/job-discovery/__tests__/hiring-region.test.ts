import { describe, expect, it } from "vitest";

import { hiringRegionsOverlap, normalizeHiringRegion } from "#@/job-discovery/hiring-region";

describe("normalizeHiringRegion", () => {
  it("maps LatAm to latam", () => {
    expect(normalizeHiringRegion("LatAm")).toBe("latam");
  });

  it("maps synonym table entries", () => {
    expect(normalizeHiringRegion("latin america")).toBe("latam");
    expect(normalizeHiringRegion("lat-am")).toBe("latam");
    expect(normalizeHiringRegion("worldwide")).toBe("worldwide");
    expect(normalizeHiringRegion("anywhere")).toBe("worldwide");
    expect(normalizeHiringRegion("global")).toBe("worldwide");
    expect(normalizeHiringRegion("remote worldwide")).toBe("worldwide");
    expect(normalizeHiringRegion("middle east")).toBe("mena");
    expect(normalizeHiringRegion("gcc")).toBe("mena");
    expect(normalizeHiringRegion("egypt")).toBe("egypt");
    expect(normalizeHiringRegion("EG")).toBe("egypt");
    expect(normalizeHiringRegion("cairo")).toBe("egypt");
    expect(normalizeHiringRegion("saudi")).toBe("saudi_arabia");
    expect(normalizeHiringRegion("ksa")).toBe("saudi_arabia");
    expect(normalizeHiringRegion("riyadh")).toBe("saudi_arabia");
    expect(normalizeHiringRegion("emea")).toBe("emea");
    expect(normalizeHiringRegion("europe")).toBe("eu");
    expect(normalizeHiringRegion("remote — eu")).toBe("eu");
    expect(normalizeHiringRegion("united states")).toBe("us");
    expect(normalizeHiringRegion("usa")).toBe("us");
    expect(normalizeHiringRegion("us only")).toBe("us");
    expect(normalizeHiringRegion("remote us")).toBe("us");
  });

  it("returns null for null/empty/unknown", () => {
    expect(normalizeHiringRegion(null)).toBe(null);
    expect(normalizeHiringRegion("")).toBe(null);
    expect(normalizeHiringRegion("   ")).toBe(null);
    expect(normalizeHiringRegion("not-a-real-region-xyz")).toBe(null);
  });
});

describe("hiringRegionsOverlap", () => {
  it("maps LatAm to latam and does not overlap egypt", () => {
    expect(normalizeHiringRegion("LatAm")).toBe("latam");
    expect(hiringRegionsOverlap(["egypt"], "latam", "LatAm")).toBe(false);
    expect(hiringRegionsOverlap(["egypt"], "mena", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "worldwide", null)).toBe(true);
  });

  it("egypt overlaps mena/emea/worldwide but not latam or us", () => {
    expect(hiringRegionsOverlap(["egypt"], "egypt", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "mena", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "emea", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "worldwide", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "latam", null)).toBe(false);
    expect(hiringRegionsOverlap(["egypt"], "us", null)).toBe(false);
  });

  it("cairo user token overlaps egypt/mena via synonyms", () => {
    expect(hiringRegionsOverlap(["cairo"], "egypt", null)).toBe(true);
    expect(hiringRegionsOverlap(["cairo"], "mena", null)).toBe(true);
  });

  it("mena user overlaps egypt listing (shared ancestor)", () => {
    expect(hiringRegionsOverlap(["mena"], "egypt", null)).toBe(true);
    expect(hiringRegionsOverlap(["mena"], "saudi_arabia", null)).toBe(true);
  });

  it("uses listing location when hiringRegion is null", () => {
    expect(hiringRegionsOverlap(["egypt"], null, "LatAm")).toBe(false);
    expect(hiringRegionsOverlap(["egypt"], null, "cairo")).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], null, "MENA")).toBe(true);
  });

  it("worldwide listing overlaps everyone; no region and no location does not", () => {
    expect(hiringRegionsOverlap(["us"], "worldwide", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], null, null)).toBe(false);
    expect(hiringRegionsOverlap([], "mena", null)).toBe(false);
  });

  it("user worldwide does not overlap unless allowUserWorldwide", () => {
    expect(hiringRegionsOverlap(["worldwide"], "latam", null)).toBe(false);
    expect(hiringRegionsOverlap(["anywhere"], "us", null)).toBe(false);
    expect(hiringRegionsOverlap(["worldwide"], "latam", null, { allowUserWorldwide: true })).toBe(
      true
    );
  });
});
