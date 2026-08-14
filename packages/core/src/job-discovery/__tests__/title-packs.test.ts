import { describe, expect, it } from "vitest";

import {
  applyTitlePack,
  effectiveRoleKeywords,
  hasValidDiscoveryTitle,
  ingestQueryKey
} from "#@/job-discovery/title-packs";

describe("applyTitlePack", () => {
  it("replaces previous pack seeds and keeps extras", () => {
    const current = ["frontend", "react", "graphql"];
    expect(
      applyTitlePack({
        nextTitleId: "backend",
        previousTitleId: "frontend",
        currentKeywords: current
      })
    ).toEqual(expect.arrayContaining(["backend", "graphql"]));
    expect(
      applyTitlePack({
        nextTitleId: "backend",
        previousTitleId: "frontend",
        currentKeywords: current
      })
    ).not.toEqual(expect.arrayContaining(["frontend"]));
  });
});

describe("effectiveRoleKeywords", () => {
  it("unions pack seeds with stored extras", () => {
    const keywords = effectiveRoleKeywords({
      titleId: "frontend",
      roleKeywords: ["graphql"]
    });
    expect(keywords).toEqual(expect.arrayContaining(["frontend", "react", "graphql"]));
  });

  it("returns only role keywords for custom titles", () => {
    expect(
      effectiveRoleKeywords({
        titleId: "custom",
        roleKeywords: ["sre", "kubernetes"]
      })
    ).toEqual(["sre", "kubernetes"]);
  });
});

describe("hasValidDiscoveryTitle", () => {
  it("accepts a pack even if extras are empty", () => {
    expect(
      hasValidDiscoveryTitle({ titleId: "frontend", customTitle: null, roleKeywords: [] })
    ).toBe(true);
  });
  it("rejects custom with fewer than 2 keywords", () => {
    expect(
      hasValidDiscoveryTitle({
        titleId: "custom",
        customTitle: "Frontend",
        roleKeywords: ["react"]
      })
    ).toBe(false);
  });
  it("accepts custom with title + ≥2 keywords", () => {
    expect(
      hasValidDiscoveryTitle({
        titleId: "custom",
        customTitle: "Platform",
        roleKeywords: ["sre", "kubernetes"]
      })
    ).toBe(true);
  });
  it("rejects unset title", () => {
    expect(
      hasValidDiscoveryTitle({ titleId: null, customTitle: null, roleKeywords: ["react"] })
    ).toBe(false);
  });
});

describe("ingestQueryKey", () => {
  it("is stable for the same pack", () => {
    expect(
      ingestQueryKey({ titleId: "frontend", customTitle: null, roleKeywords: ["graphql"] })
    ).toBe("pack:frontend");
  });
  it("sorts custom keywords case-insensitively", () => {
    expect(
      ingestQueryKey({
        titleId: "custom",
        customTitle: "X",
        roleKeywords: ["Kubernetes", "sre"]
      })
    ).toBe("custom:kubernetes|sre");
  });
  it("returns null when invalid", () => {
    expect(ingestQueryKey({ titleId: null, customTitle: null, roleKeywords: [] })).toBeNull();
  });
});
