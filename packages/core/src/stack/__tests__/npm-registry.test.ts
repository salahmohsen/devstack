import { describe, expect, it } from "vitest";

import { registryPackagePath } from "#@/stack/npm-registry";

describe("registryPackagePath", () => {
  it("encodes scoped packages as path segments (not %2F in a single segment)", () => {
    expect(registryPackagePath("@tanstack/react-query")).toBe("%40tanstack/react-query");
    expect(registryPackagePath("@orpc/server")).toBe("%40orpc/server");
  });

  it("leaves unscoped names as a single segment", () => {
    expect(registryPackagePath("react")).toBe("react");
    expect(registryPackagePath("drizzle-orm")).toBe("drizzle-orm");
  });

  it("encodes special characters in segments", () => {
    expect(registryPackagePath("foo/bar baz")).toBe("foo/bar%20baz");
  });
});
