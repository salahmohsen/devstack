import { describe, expect, it } from "vitest";

import { preferCatalogSkills } from "@tsu-stack/db";

import { listingContentHash } from "#@/lib/job-discovery/content-hash";
import { statedCatalogPatch, statedPersistContentHash } from "#@/lib/job-discovery/hydrate";
import { toUpsertInput } from "#@/lib/job-discovery/ingest";

const emptyCatalog = {
  workMode: null,
  hiringRegion: null,
  employmentType: null,
  location: null,
  skills: [] as string[]
};

describe("statedCatalogPatch", () => {
  it("writes stated extract fields when catalog values are null", () => {
    expect(
      statedCatalogPatch(emptyCatalog, {
        workMode: "remote",
        workModeStated: true,
        hiringRegion: "latam",
        employmentType: "full_time",
        location: "LatAm",
        skills: ["Go"]
      })
    ).toEqual({
      workMode: "remote",
      hiringRegion: "latam",
      employmentType: "full_time",
      location: "LatAm",
      skills: ["Go"]
    });
  });

  it("never overwrites a non-null ATS workMode with a dictionary guess", () => {
    const patch = statedCatalogPatch(
      {
        workMode: "remote",
        hiringRegion: null,
        employmentType: null,
        location: "LatAm",
        skills: []
      },
      {
        workMode: "hybrid",
        workModeStated: false,
        hiringRegion: "latam",
        employmentType: "full_time",
        location: "Remote — LatAm"
      }
    );

    expect(patch.workMode).toBeUndefined();
    expect(patch.hiringRegion).toBe("latam");
    expect(patch.employmentType).toBe("full_time");
    expect(patch.location).toBeUndefined();
  });

  it("does not persist an unstated workMode guess onto an empty catalog", () => {
    const patch = statedCatalogPatch(emptyCatalog, {
      workMode: "remote",
      workModeStated: false
    });
    expect(patch.workMode).toBeUndefined();
  });
});

const unstatedAdapterListing = {
  adapterId: "freehire" as const,
  externalId: "staff-engineer-acme-latam",
  listingUrl: "https://jobs.ashbyhq.com/acme/staff-engineer-latam",
  title: "Staff Engineer",
  companyName: "Acme",
  location: null,
  workMode: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  skills: [] as string[],
  description: "Build APIs in Go.",
  postedAt: null,
  sourcePlatform: "ashby"
};

describe("hydrate fills survive re-ingest", () => {
  it("does not include company slug, years, or logo in the catalog hash", () => {
    const withCompany = {
      ...unstatedAdapterListing,
      companySlug: "acme",
      experienceYearsMin: 5,
      companyLogoUrl: "https://example.com/logo.png"
    };
    expect(listingContentHash(withCompany)).toBe(listingContentHash(unstatedAdapterListing));
    const input = toUpsertInput(withCompany);
    expect(input.experienceYearsMin).toBe(5);
    expect(input.companyLogoUrl).toBe("https://example.com/logo.png");
  });

  it("does not clobber a stated JSON-LD fill on a second upsert of the same adapter payload", () => {
    const adapterHash = listingContentHash(unstatedAdapterListing);
    const first = toUpsertInput(unstatedAdapterListing);
    expect(first).not.toHaveProperty("workMode");
    expect(first).not.toHaveProperty("location");
    expect(first.skills).toEqual([]);
    expect(first.contentHash).toBe(adapterHash);

    const workplace = statedCatalogPatch(emptyCatalog, {
      workMode: "remote",
      workModeStated: true,
      location: "LatAm",
      skills: ["Go"]
    });
    expect(workplace.workMode).toBe("remote");
    expect(workplace.location).toBe("LatAm");
    expect(workplace.skills).toEqual(["Go"]);

    expect(
      statedPersistContentHash(
        {
          adapterId: unstatedAdapterListing.adapterId,
          externalId: unstatedAdapterListing.externalId,
          listingUrl: unstatedAdapterListing.listingUrl,
          title: unstatedAdapterListing.title,
          companyName: unstatedAdapterListing.companyName,
          location: null,
          workMode: null,
          skills: [],
          description: unstatedAdapterListing.description
        },
        unstatedAdapterListing.description
      )
    ).toBeUndefined();

    const second = toUpsertInput(unstatedAdapterListing);
    expect(second.contentHash).toBe(adapterHash);
    expect(second).not.toHaveProperty("workMode");
    expect(second).not.toHaveProperty("location");
    expect(preferCatalogSkills(second.skills, ["Go"])).toEqual(["Go"]);
  });
});
