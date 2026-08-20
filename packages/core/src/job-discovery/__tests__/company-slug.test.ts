import { describe, expect, it } from "vitest";

import { companySlugFromName } from "#@/job-discovery/company-slug";

describe("companySlugFromName", () => {
  it("slugifies a plain name", () => {
    expect(companySlugFromName("Stripe")).toBe("stripe");
  });

  it("strips common legal suffixes", () => {
    expect(companySlugFromName("Stripe, Inc.")).toBe("stripe");
    expect(companySlugFromName("Acme LLC")).toBe("acme");
    expect(companySlugFromName("Globex Ltd")).toBe("globex");
  });

  it("hyphenates spaces", () => {
    expect(companySlugFromName("Valar Atomics")).toBe("valar-atomics");
  });

  it("returns empty for blank", () => {
    expect(companySlugFromName("   ")).toBe("");
  });
});
