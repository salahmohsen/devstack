import { describe, expect, it } from "vitest";

import {
  APPLICATION_SOURCE_TAG_LABELS,
  applicationSourceChipLabels,
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

describe("applicationSourceChipLabels", () => {
  it("shows Mail instead of Discovery for harvest rows", () => {
    expect(
      applicationSourceChipLabels({
        sourceTags: ["mail", "linkedin"],
        sourceLabel: null
      })
    ).toEqual(["Mail", "LinkedIn"]);
  });

  it("shows the adapter name instead of Discovery", () => {
    expect(
      applicationSourceChipLabels({
        sourceTags: ["discovery", "other"],
        sourceLabel: "Himalayas"
      })
    ).toEqual(["Himalayas"]);
  });

  it("falls back to platform when discovery has no adapter name", () => {
    expect(
      applicationSourceChipLabels({
        sourceTags: ["discovery", "linkedin"],
        sourceLabel: null
      })
    ).toEqual(["LinkedIn"]);
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
