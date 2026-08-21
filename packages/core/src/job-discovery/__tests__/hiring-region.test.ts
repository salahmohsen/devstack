import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  HIRING_REGION_SYNONYM_TO_SLUG,
  hiringRegionsOverlap,
  normalizeHiringRegion,
  resolveRemoteListingSlug
} from "#@/job-discovery/hiring-region";

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

  it("listing-only expand: a place does not match a sibling country via emea", () => {
    expect(hiringRegionsOverlap(["egypt"], "uk", "London", { expand: "listing" })).toBe(false);
    expect(
      hiringRegionsOverlap(["cairo"], "uk", "London, England, United Kingdom", {
        expand: "listing"
      })
    ).toBe(false);
    expect(hiringRegionsOverlap(["uk"], "uk", "London", { expand: "listing" })).toBe(true);
    expect(hiringRegionsOverlap(["mena"], "egypt", "Cairo", { expand: "listing" })).toBe(true);
  });

  it("both-expand still lets remote egypt overlap listing emea", () => {
    expect(hiringRegionsOverlap(["egypt"], "emea", null)).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "emea", null, { expand: "both" })).toBe(true);
  });

  it("maps extra country names used on remote listings", () => {
    expect(normalizeHiringRegion("India")).toBe("india");
    expect(normalizeHiringRegion("Remote Canada")).toBe("canada");
    expect(normalizeHiringRegion("Poland")).toBe("poland");
    expect(normalizeHiringRegion("Ireland")).toBe("ireland");
    expect(normalizeHiringRegion("Australia")).toBe("apac");
  });
});

describe("resolveRemoteListingSlug", () => {
  it("treats Global-Remote as worldwide and Remote-US as us", () => {
    expect(resolveRemoteListingSlug("worldwide", "Global - Remote")).toEqual({
      slug: "worldwide",
      specificUnknown: false
    });
    expect(resolveRemoteListingSlug("worldwide", "Remote - US")).toEqual({
      slug: "us",
      specificUnknown: false
    });
    expect(resolveRemoteListingSlug(null, "Remote Canada")).toEqual({
      slug: "canada",
      specificUnknown: false
    });
    expect(resolveRemoteListingSlug("worldwide", "India")).toEqual({
      slug: "india",
      specificUnknown: false
    });
  });
});

describe("hiringRegionsOverlap leftover", () => {
  it("lineage expand: egypt matches MENA/EMEA, not US or UK siblings", () => {
    expect(hiringRegionsOverlap(["egypt"], "mena", null, { expand: "lineage" })).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "emea", null, { expand: "lineage" })).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "egypt", "Cairo", { expand: "lineage" })).toBe(true);
    expect(hiringRegionsOverlap(["mena"], "egypt", "Cairo", { expand: "lineage" })).toBe(true);
    expect(hiringRegionsOverlap(["egypt"], "us", "United States", { expand: "lineage" })).toBe(
      false
    );
    expect(hiringRegionsOverlap(["egypt"], "uk", "London", { expand: "lineage" })).toBe(false);
    expect(hiringRegionsOverlap(["egypt"], "latam", "LatAm", { expand: "lineage" })).toBe(false);
  });
});

describe("remoteRegions SQL backfill map", () => {
  it("only maps known synonym keys", () => {
    const sql = readFileSync(
      join(
        import.meta.dirname,
        "../../../../db/migrations/20260816120000_job_preference_level_remote_brief/migration.sql"
      ),
      "utf8"
    );
    const values = sql.match(/WITH map\(raw, slug\) AS \(\s*VALUES([\s\S]*?)\n\),/)?.[1] ?? "";
    const keys = [...values.matchAll(/\('((?:\\'|[^'])*)'/g)].map((match) => match[1]);
    const known = new Set([
      ...Object.keys(HIRING_REGION_SYNONYM_TO_SLUG),
      ...Object.values(HIRING_REGION_SYNONYM_TO_SLUG)
    ]);
    const unknown = keys.filter((key) => !known.has(key));
    expect(unknown).toEqual([]);
  });
});
