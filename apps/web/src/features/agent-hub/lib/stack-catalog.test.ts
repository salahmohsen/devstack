import { describe, expect, it } from "vitest";

import { groupHubStacksByType, parseListStacksResult } from "./stack-catalog";

describe("parseListStacksResult", () => {
  it("reads listStacks output and drops empty names", () => {
    expect(
      parseListStacksResult({
        stacks: [
          {
            id: "s1",
            name: "React",
            type: "framework",
            projectCount: 3,
            featured: true,
            inPortfolio: true
          },
          {
            id: "s2",
            name: "  ",
            type: "tooling",
            projectCount: 1,
            featured: false,
            inPortfolio: false
          },
          {
            id: "s3",
            name: "Vite",
            type: "tooling",
            projectCount: 2,
            featured: false,
            inPortfolio: true
          }
        ]
      })
    ).toEqual([
      {
        id: "s1",
        name: "React",
        type: "framework",
        projectCount: 3,
        featured: true,
        inPortfolio: true
      },
      {
        id: "s3",
        name: "Vite",
        type: "tooling",
        projectCount: 2,
        featured: false,
        inPortfolio: true
      }
    ]);
  });

  it("returns empty for missing stacks", () => {
    expect(parseListStacksResult(null)).toEqual([]);
    expect(parseListStacksResult({})).toEqual([]);
  });
});

describe("groupHubStacksByType", () => {
  it("groups by type and keeps featured first inside a type", () => {
    const groups = groupHubStacksByType([
      {
        id: "s2",
        name: "Vite",
        type: "tooling",
        projectCount: 2,
        featured: false,
        inPortfolio: true
      },
      {
        id: "s1",
        name: "React",
        type: "framework",
        projectCount: 3,
        featured: true,
        inPortfolio: true
      },
      {
        id: "s3",
        name: "Next.js",
        type: "framework",
        projectCount: 2,
        featured: false,
        inPortfolio: true
      }
    ]);
    expect(groups.map((g) => g.type)).toEqual(["Framework", "Tooling"]);
    expect(groups[0]!.stacks.map((s) => s.name)).toEqual(["React", "Next.js"]);
  });
});
