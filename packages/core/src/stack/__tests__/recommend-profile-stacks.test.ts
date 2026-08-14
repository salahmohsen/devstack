import { describe, expect, it } from "vitest";

import {
  buildProfilePickPrompt,
  featuredProfileCap,
  mapFeaturedIndices,
  recommendFeaturedStacks,
  resolveFeaturedStackIds,
  sanitizeFeaturedStackIds
} from "#@/stack/recommend-profile-stacks";

const catalog = [
  { id: "ts", name: "TypeScript", type: "language", projectCount: 6 },
  { id: "react", name: "React", type: "framework", projectCount: 5 },
  { id: "pg", name: "PostgreSQL", type: "database", projectCount: 4 },
  { id: "eslint", name: "ESLint", type: "tooling", projectCount: 6 },
  { id: "vitest", name: "Vitest", type: "testing", projectCount: 5 },
  { id: "prettier", name: "Prettier", type: "tooling", projectCount: 6 },
  { id: "next", name: "Next.js", type: "framework", projectCount: 3 },
  { id: "cf", name: "Cloudflare", type: "deployment", projectCount: 3 },
  { id: "husky", name: "Husky", type: "tooling", projectCount: 2 },
  { id: "lodash", name: "lodash", type: "other", projectCount: 1 }
];

const sortOrder = catalog.map((s) => s.id);

describe("featuredProfileCap", () => {
  it("stays tight on a resume-sized row", () => {
    expect(featuredProfileCap(0)).toBe(0);
    expect(featuredProfileCap(3)).toBe(3);
    expect(featuredProfileCap(20)).toBe(6);
    expect(featuredProfileCap(80)).toBe(12);
  });
});

describe("recommendFeaturedStacks", () => {
  it("picks resume staples and skips lint/test noise", () => {
    const picked = recommendFeaturedStacks(catalog, sortOrder);
    expect(picked.has("ts")).toBe(true);
    expect(picked.has("react")).toBe(true);
    expect(picked.has("pg")).toBe(true);
    expect(picked.has("next")).toBe(true);
    expect(picked.has("eslint")).toBe(false);
    expect(picked.has("vitest")).toBe(false);
    expect(picked.has("prettier")).toBe(false);
    expect(picked.has("husky")).toBe(false);
  });

  it("allows a used deployment platform", () => {
    const picked = recommendFeaturedStacks(catalog, sortOrder);
    expect(picked.has("cf")).toBe(true);
  });

  it("keeps an existing featured staple even if sort is noisy", () => {
    const picked = recommendFeaturedStacks(
      catalog.map((s) => {
        return { ...s, isFeatured: s.id === "ts" };
      }),
      ["eslint", "vitest", "ts", "react"]
    );
    expect(picked.has("ts")).toBe(true);
  });

  it("drops unused noise even when already featured", () => {
    const picked = recommendFeaturedStacks(
      [
        { id: "eslint", name: "ESLint", type: "tooling", projectCount: 1, isFeatured: true },
        { id: "ts", name: "TypeScript", type: "language", projectCount: 4 }
      ],
      ["eslint", "ts"]
    );
    expect(picked.has("eslint")).toBe(false);
    expect(picked.has("ts")).toBe(true);
  });
});

describe("buildProfilePickPrompt", () => {
  it("frames a resume Skills row and bans lint/test noise", () => {
    const prompt = buildProfilePickPrompt(
      [
        { id: "ts", name: "TypeScript", type: "language", projectCount: 6, isFeatured: true },
        { id: "eslint", name: "ESLint", type: "tooling", projectCount: 6 }
      ],
      6
    );
    expect(prompt).toContain("hiring manager");
    expect(prompt).toContain("resume Skills");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("ESLint");
    expect(prompt).toMatch(/already_featured/);
    expect(prompt).toContain("Examples of NO: ESLint");
    expect(prompt).toContain("Cap: 6");
  });
});

describe("mapFeaturedIndices / sanitize / resolve", () => {
  it("maps ordinals and skips junk indices", () => {
    expect(mapFeaturedIndices(catalog, [0, 0, -1, 99, 1, 2], 3)).toEqual(["ts", "react", "pg"]);
  });

  it("drops ids that did not survive merges", () => {
    expect(sanitizeFeaturedStackIds(["ts", "gone", "ts", "react"], ["react", "pg"])).toEqual([
      "react"
    ]);
  });

  it("keeps a solid LLM pick as-is", () => {
    const ids = resolveFeaturedStackIds({
      llmIds: ["ts", "react", "pg", "next"],
      stacks: catalog,
      sortOrder
    });
    expect(ids).toEqual(["ts", "react", "pg", "next"]);
  });

  it("drops lint/test noise from an LLM pick", () => {
    const ids = resolveFeaturedStackIds({
      llmIds: ["ts", "eslint", "vitest", "react"],
      stacks: catalog,
      sortOrder
    });
    expect(ids).toContain("ts");
    expect(ids).toContain("react");
    expect(ids).not.toContain("eslint");
    expect(ids).not.toContain("vitest");
  });

  it("fills a too-short LLM pick from the heuristic", () => {
    const ids = resolveFeaturedStackIds({
      llmIds: ["ts"],
      stacks: catalog,
      sortOrder
    });
    expect(ids[0]).toBe("ts");
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids).not.toContain("eslint");
  });
});
