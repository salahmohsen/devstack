import { describe, expect, it } from "vitest";

import { preferenceQueryHash } from "#@/job-discovery/query-hash";

describe("preferenceQueryHash", () => {
  it("is stable across key order", async () => {
    const a = await preferenceQueryHash({
      regions: ["eu"],
      seniority: ["senior"],
      openWithinDays: 14
    });
    const b = await preferenceQueryHash({
      openWithinDays: 14,
      seniority: ["senior"],
      regions: ["eu"]
    });
    expect(a).toBe(b);
  });

  it("is stable across array order", async () => {
    const a = await preferenceQueryHash({ seniority: ["senior", "junior"] });
    const b = await preferenceQueryHash({ seniority: ["junior", "senior"] });
    expect(a).toBe(b);
  });

  it("changes when any value changes", async () => {
    const base = await preferenceQueryHash({ regions: ["eu"], seniority: ["senior"] });
    expect(await preferenceQueryHash({ regions: ["uk"], seniority: ["senior"] })).not.toBe(base);
    expect(await preferenceQueryHash({ regions: ["eu"], seniority: ["lead"] })).not.toBe(base);
    expect(
      await preferenceQueryHash({ regions: ["eu"], seniority: ["senior"], visa: true })
    ).not.toBe(base);
  });

  it("canonicalizes: trims strings, drops null/undefined/empty arrays", async () => {
    const raw = await preferenceQueryHash({
      regions: [" eu ", ""],
      seniority: [],
      openWithinDays: null,
      visa: undefined
    });
    expect(raw).toBe(await preferenceQueryHash({ regions: ["eu"] }));
  });

  it("is deterministic across runs and 16 hex chars", async () => {
    const a = await preferenceQueryHash({ regions: ["eu"], categories: ["backend"] });
    const b = await preferenceQueryHash({ regions: ["eu"], categories: ["backend"] });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});
