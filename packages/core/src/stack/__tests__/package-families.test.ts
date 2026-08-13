import { describe, expect, it } from "vitest";

import {
  SAME_PROJECT_PACKAGE_FAMILIES,
  SCOPE_MERGE_ALLOWLIST,
  findPackageFamily
} from "#@/stack/package-families";

describe("package-families", () => {
  it("allows single-member families for display-name / confidence curation", () => {
    // Multi-member families drive merges; singles still provide curated labels.
    const singles = SAME_PROJECT_PACKAGE_FAMILIES.filter((f) => f.length === 0);
    expect(singles).toEqual([]);
  });

  it("assigns each package to at most one family", () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const family of SAME_PROJECT_PACKAGE_FAMILIES) {
      const primary = family[0]!;
      for (const pkg of family) {
        const key = pkg.toLowerCase();
        if (seen.has(key)) dups.push(`${pkg} in ${seen.get(key)} and ${primary}`);
        else seen.set(key, primary);
      }
    }
    expect(dups).toEqual([]);
  });

  it("findPackageFamily is case-insensitive and returns primary first", () => {
    expect(findPackageFamily("React-Dom")?.[0]).toBe("react");
    expect(findPackageFamily("@TANSTACK/REACT-QUERY")?.[0]).toBe("@tanstack/react-query");
    expect(findPackageFamily("totally-unknown-pkg-xyz")).toBeNull();
  });

  it("does not blanket-allow multi-product orgs on the scope list", () => {
    expect(SCOPE_MERGE_ALLOWLIST.has("@tanstack")).toBe(false);
    expect(SCOPE_MERGE_ALLOWLIST.has("@types")).toBe(false);
    expect(SCOPE_MERGE_ALLOWLIST.has("@aws-sdk")).toBe(false);
    // Avoid merging unrelated icon sets under @iconify-json/*
    expect(SCOPE_MERGE_ALLOWLIST.has("@iconify-json")).toBe(false);
  });

  it("includes mono-product scopes used heavily in this monorepo", () => {
    for (const scope of ["@orpc", "@mastra", "@tiptap", "@radix-ui", "@heroui"]) {
      expect(SCOPE_MERGE_ALLOWLIST.has(scope)).toBe(true);
    }
  });

  it("keeps TanStack products in separate families", () => {
    expect(findPackageFamily("@tanstack/react-query")?.[0]).toBe("@tanstack/react-query");
    expect(findPackageFamily("@tanstack/react-form")?.[0]).toBe("@tanstack/react-form");
    expect(findPackageFamily("@tanstack/react-start")?.[0]).toBe("@tanstack/react-start");
    expect(findPackageFamily("@tanstack/react-query")?.[0]).not.toBe(
      findPackageFamily("@tanstack/react-form")?.[0]
    );
  });

  it("maps family packages to distinct curated display names", async () => {
    const { getPackageFamilyDisplayName, getPackageFamilyType } =
      await import("#@/stack/package-families");
    expect(getPackageFamilyDisplayName("@tanstack/react-query")).toBe("TanStack Query");
    expect(getPackageFamilyDisplayName("@tanstack/react-form-start")).toBe("TanStack Form");
    expect(getPackageFamilyDisplayName("@tanstack/react-start")).toBe("TanStack Start");
    expect(getPackageFamilyDisplayName("@tiptap/extension-link")).toBe("TipTap");
    expect(getPackageFamilyType("@tanstack/react-query")).toBe("framework");
    expect(getPackageFamilyType("@tiptap/react")).toBe("ui");
  });

  it("refuses reserved brand names for unrelated packages", async () => {
    const { resolveSafeDisplayName, humanizeNpmPackageName } =
      await import("#@/stack/package-families");
    expect(resolveSafeDisplayName("@zappicon/react", "React")).not.toBe("React");
    expect(resolveSafeDisplayName("@zappicon/react", "React")).toBe(
      humanizeNpmPackageName("@zappicon/react")
    );
    expect(resolveSafeDisplayName("react", "React")).toBe("React");
    expect(resolveSafeDisplayName("@tanstack/react-query", "TanStack")).toBe("TanStack Query");
    expect(humanizeNpmPackageName("@zappicon/react")).toBe("Zappicon");
  });
});
