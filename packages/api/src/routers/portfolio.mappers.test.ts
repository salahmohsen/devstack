import { describe, expect, it } from "vitest";

import { type StackOutput } from "@tsu-stack/core";

import {
  capPublicStackIcon,
  PUBLIC_STACK_ICON_MAX_CHARS,
  toPublicCatalogStack,
  toPublicEmbeddedStack
} from "#@/routers/portfolio.mappers";

function stack(overrides: Partial<StackOutput> = {}): StackOutput {
  return {
    id: "s1",
    name: "Emotion",
    description: "CSS-in-JS",
    icon: "<svg></svg>",
    type: "ui",
    healthStatus: { downloads: 1 },
    confidence: "high",
    projectCount: 2,
    sortOrder: 1,
    isFeatured: false,
    portfolioEntryId: null,
    includedInPortfolio: false,
    aliases: ["CSS-in-JS"],
    dependencies: [{ npmPackage: "react", description: null, homepage: null }],
    projects: [{ id: "p1", name: "App", logo: null }],
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("public portfolio stack payload", () => {
  it("drops oversized inline SVG icons", () => {
    const huge = "x".repeat(PUBLIC_STACK_ICON_MAX_CHARS + 1);
    expect(capPublicStackIcon(huge)).toBeNull();
    expect(capPublicStackIcon("<svg></svg>")).toBe("<svg></svg>");
    expect(capPublicStackIcon(null)).toBeNull();
  });

  it("strips nested catalog fields from project-embedded stacks", () => {
    const slim = toPublicEmbeddedStack(stack());
    expect(slim.description).toBeNull();
    expect(slim.healthStatus).toBeNull();
    expect(slim.dependencies).toEqual([]);
    expect(slim.projects).toEqual([]);
    expect(slim.name).toBe("Emotion");
    expect(slim.icon).toBeNull();
  });

  it("keeps catalog description but drops reverse project links", () => {
    const slim = toPublicCatalogStack(stack());
    expect(slim.description).toBe("CSS-in-JS");
    expect(slim.projects).toEqual([]);
    expect(slim.dependencies).toEqual([]);
  });
});
