import { describe, expect, it } from "vitest";

import {
  preferenceQueryHash,
  defaultJobPreferenceOutput,
  type JobPreferenceOutput
} from "@tsu-stack/core";

import { buildFreehireQuery } from "#@/lib/job-discovery/freehire/query-builder";

function prefsWith(overrides: Record<string, unknown>): JobPreferenceOutput {
  return { ...defaultJobPreferenceOutput(), ...overrides } as JobPreferenceOutput;
}

describe("buildFreehireQuery", () => {
  it("maps facets to freehire params", async () => {
    const { params, dropped } = await buildFreehireQuery(
      prefsWith({
        roleKeywords: ["go"],
        categories: ["backend"],
        seniority: ["senior"],
        regions: ["eu"],
        workModes: ["remote"],
        openWithinDays: 14,
        salaryMin: 100000,
        salaryCurrency: "USD",
        visaSponsorship: true,
        companyTypes: ["product"],
        collections: ["yc"]
      })
    );
    expect(params.get("q")).toBe("go");
    expect(params.get("category")).toBe("backend");
    expect(params.get("seniority")).toBe("senior");
    expect(params.get("regions")).toBe("eu");
    expect(params.get("work_mode")).toBe("remote");
    expect(params.get("open_within_days")).toBe("14");
    expect(params.get("salary_currency")).toBe("USD");
    expect(params.get("salary_min")).toBe("100000");
    expect(params.get("visa_sponsorship")).toBe("true");
    expect(params.get("company_type")).toBe("product");
    expect(params.get("collections")).toBe("yc");
    expect(params.get("limit")).toBe("100");
    expect(params.get("sort")).toBe("created_at");
    expect(params.get("order")).toBe("desc");
    expect(dropped).toEqual([]);
  });

  it("joins array facets with commas (OR semantics)", async () => {
    const { params } = await buildFreehireQuery(
      prefsWith({
        regions: ["eu", "apac"],
        seniority: ["junior", "senior", "lead"],
        workModes: ["remote", "hybrid"]
      })
    );
    expect(params.get("regions")).toBe("eu,apac");
    expect(params.get("seniority")).toBe("junior,senior,lead");
    expect(params.get("work_mode")).toBe("remote,hybrid");
  });

  it("drops off-whitelist facet values and keeps the valid ones", async () => {
    const { params, filters, dropped } = await buildFreehireQuery(
      prefsWith({ seniority: ["staff", "bogus"], reality: ["fresh", "nope"], regions: ["eu"] })
    );
    expect(params.get("seniority")).toBe("staff");
    expect(params.get("reality")).toBe("fresh");
    expect(filters.seniority).toEqual(["staff"]);
    expect(dropped).toEqual(["seniority:bogus", "reality:nope"]);
  });

  it("omits unset facets entirely — only constants remain", async () => {
    const { params, filters, hash } = await buildFreehireQuery(prefsWith({}));
    expect([...params.keys()].toSorted()).toEqual(["limit", "order", "sort"]);
    expect(filters).toEqual({});
    expect(hash).toBe(await preferenceQueryHash({}));
  });

  it("sends salary only when min and currency are both present", async () => {
    const withMinOnly = await buildFreehireQuery(prefsWith({ salaryMin: 80000 }));
    expect(withMinOnly.params.get("salary_min")).toBeNull();
    expect(withMinOnly.params.get("salary_currency")).toBeNull();

    const both = await buildFreehireQuery(prefsWith({ salaryMin: 80000, salaryCurrency: "EUR" }));
    expect(both.params.get("salary_min")).toBe("80000");
    expect(both.params.get("salary_currency")).toBe("EUR");
  });

  it("drops a salary currency outside the freehire whitelist", async () => {
    const { params, dropped } = await buildFreehireQuery(
      prefsWith({ salaryMin: 80000, salaryCurrency: "JPY" })
    );
    expect(params.get("salary_min")).toBeNull();
    expect(dropped).toEqual(["salaryCurrency:JPY"]);
  });

  it("sends boolean gates only when the pref is exactly true", async () => {
    const none = await buildFreehireQuery(
      prefsWith({ visaSponsorship: null, requiresClearance: false })
    );
    expect(none.params.get("visa_sponsorship")).toBeNull();
    expect(none.params.get("requires_clearance")).toBeNull();

    const both = await buildFreehireQuery(
      prefsWith({ visaSponsorship: true, requiresClearance: true })
    );
    expect(both.params.get("visa_sponsorship")).toBe("true");
    expect(both.params.get("requires_clearance")).toBe("false");
  });

  it("sends every set geography facet (freehire OR-widens places)", async () => {
    const { params } = await buildFreehireQuery(
      prefsWith({ regions: ["eu"], countries: ["de", "nl"], cities: ["berlin"] })
    );
    expect(params.get("regions")).toBe("eu");
    expect(params.get("countries")).toBe("de,nl");
    expect(params.get("cities")).toBe("berlin");
  });

  it("maps experience year bounds and keeps them out when null", async () => {
    const none = await buildFreehireQuery(prefsWith({}));
    expect(none.params.get("experience_years_min")).toBeNull();

    const both = await buildFreehireQuery(
      prefsWith({ experienceYearsMin: 2, experienceYearsMax: 6 })
    );
    expect(both.params.get("experience_years_min")).toBe("2");
    expect(both.params.get("experience_years_max")).toBe("6");
  });

  it("hashes the same filters identically regardless of key/array order", async () => {
    const a = await buildFreehireQuery(
      prefsWith({ regions: ["eu", "apac"], seniority: ["senior"], roleKeywords: ["go"] })
    );
    const b = await buildFreehireQuery(
      prefsWith({ regions: ["apac", "eu"], roleKeywords: ["go"], seniority: ["senior"] })
    );
    const c = await buildFreehireQuery(
      prefsWith({ regions: ["eu", "apac"], seniority: ["lead"], roleKeywords: ["go"] })
    );
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(c.hash);
    expect(a.hash).toHaveLength(16);
  });

  it("returns a hash matching preferenceQueryHash of the filters record", async () => {
    const { filters, hash } = await buildFreehireQuery(
      prefsWith({ regions: ["eu"], openWithinDays: 7 })
    );
    expect(hash).toBe(await preferenceQueryHash(filters));
  });
});
