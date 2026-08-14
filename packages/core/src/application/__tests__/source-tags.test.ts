import { describe, expect, it } from "vitest";

import {
  APPLICATION_SOURCE_TAG_LABELS,
  buildApplicationSourceTags,
  formatApplicationActivitySummary
} from "#@/application/utils";

describe("buildApplicationSourceTags", () => {
  it("tags discovery + inferred platform", () => {
    expect(
      buildApplicationSourceTags({ channel: "discovery", platform: "company_website" })
    ).toEqual(["discovery", "company_website"]);
  });
});

describe("APPLICATION_SOURCE_TAG_LABELS", () => {
  it("labels discovery", () => {
    expect(APPLICATION_SOURCE_TAG_LABELS.discovery).toBe("Discovery");
  });
});

describe("formatApplicationActivitySummary", () => {
  it("summarizes discovery channel", () => {
    expect(
      formatApplicationActivitySummary({
        kind: "discovered",
        metadata: { via: "discovery" }
      })
    ).toBe("Discovered from job search");
  });
});
