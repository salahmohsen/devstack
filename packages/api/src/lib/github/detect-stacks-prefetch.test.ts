import { describe, expect, it } from "vitest";

import { isIgnoredPackageJsonPath, parseGitHubRepo } from "#@/lib/github/detect-stacks-prefetch";

describe("parseGitHubRepo", () => {
  it("parses https github URLs", () => {
    expect(parseGitHubRepo("https://github.com/acme/app")).toBe("acme/app");
    expect(parseGitHubRepo("https://github.com/acme/app.git")).toBe("acme/app");
    expect(parseGitHubRepo("https://www.github.com/acme/app/tree/main")).toBe("acme/app");
    expect(parseGitHubRepo("https://github.com/acme/app?tab=readme")).toBe("acme/app");
  });

  it("parses owner/name slugs", () => {
    expect(parseGitHubRepo("acme/app")).toBe("acme/app");
    expect(parseGitHubRepo("acme/app.git")).toBe("acme/app");
  });

  it("trims whitespace", () => {
    expect(parseGitHubRepo("  https://github.com/acme/app  ")).toBe("acme/app");
  });
});

describe("isIgnoredPackageJsonPath", () => {
  it("ignores node_modules and build outputs", () => {
    expect(isIgnoredPackageJsonPath("node_modules/foo/package.json")).toBe(true);
    expect(isIgnoredPackageJsonPath("apps/web/node_modules/x/package.json")).toBe(true);
    expect(isIgnoredPackageJsonPath("dist/package.json")).toBe(true);
    expect(isIgnoredPackageJsonPath(".next/package.json")).toBe(true);
  });

  it("keeps normal monorepo package paths", () => {
    expect(isIgnoredPackageJsonPath("apps/web/package.json")).toBe(false);
    expect(isIgnoredPackageJsonPath("packages/core/package.json")).toBe(false);
    expect(isIgnoredPackageJsonPath("package.json")).toBe(false);
  });
});
