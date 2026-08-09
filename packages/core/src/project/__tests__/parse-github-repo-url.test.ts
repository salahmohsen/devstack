import { describe, expect, it } from "vitest";

import { parseGithubRepoUrl } from "#@/project/parse-github-repo-url";

describe("parseGithubRepoUrl", () => {
  it("parses https github.com URLs", () => {
    expect(parseGithubRepoUrl("https://github.com/acme/widget")).toEqual({
      owner: "acme",
      name: "widget"
    });
  });

  it("parses bare owner/repo", () => {
    expect(parseGithubRepoUrl("acme/widget")).toEqual({ owner: "acme", name: "widget" });
  });

  it("strips .git suffix", () => {
    expect(parseGithubRepoUrl("https://github.com/acme/widget.git")).toEqual({
      owner: "acme",
      name: "widget"
    });
  });

  it("rejects non-github hosts", () => {
    expect(parseGithubRepoUrl("https://gitlab.com/acme/widget")).toBeNull();
  });
});
