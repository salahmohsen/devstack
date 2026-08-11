import { describe, expect, it } from "vitest";

import { repoBranchNavLocation } from "./repo-paths";

describe("repoBranchNavLocation", () => {
  it("opens overview for default branch without path (path mode)", () => {
    expect(repoBranchNavLocation("salah", "dev-hub", "main", { defaultBranch: "main" })).toEqual({
      to: "/$username/repos/$repo",
      params: { username: "salah", repo: "dev-hub" }
    });
  });

  it("opens tree for non-default branch without path", () => {
    expect(repoBranchNavLocation("salah", "dev-hub", "rewrite", { defaultBranch: "main" })).toEqual(
      {
        to: "/$username/repos/$repo/tree/$",
        params: { username: "salah", repo: "dev-hub", _splat: "rewrite" }
      }
    );
  });

  it("preserves blob path when switching branch on custom domain", () => {
    expect(
      repoBranchNavLocation(null, "dev-hub", "rewrite", {
        path: "src/index.ts",
        view: "blob",
        defaultBranch: "main"
      })
    ).toEqual({
      to: "/repos/$repo/blob/$",
      params: { repo: "dev-hub", _splat: "rewrite/src/index.ts" }
    });
  });
});
