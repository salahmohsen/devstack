import { describe, expect, it, vi } from "vitest";

import {
  assertRepoVisibleOnPublicSurface,
  createRepoNotFoundError,
  isGitHubAuthError,
  isPrivateOnPublicSurface,
  rejectPrivateEntityOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName,
  withPublicGithubClient
} from "./public-repo-access";

describe("repoCacheResource", () => {
  it("suffixes public and private distinctly", () => {
    expect(repoCacheResource("repo.overview.v3", "public")).toBe("repo.overview.v3.public");
    expect(repoCacheResource("repo.overview.v3", "private")).toBe("repo.overview.v3.private");
    expect(repoCacheResource("repo.overview.v3", "public")).not.toBe(
      repoCacheResource("repo.overview.v3", "private")
    );
  });
});

describe("isPrivateOnPublicSurface", () => {
  it("only rejects private on the public surface", () => {
    expect(isPrivateOnPublicSurface("public", true)).toBe(true);
    expect(isPrivateOnPublicSurface("public", false)).toBe(false);
    expect(isPrivateOnPublicSurface("public", null)).toBe(false);
    expect(isPrivateOnPublicSurface("private", true)).toBe(false);
    expect(isPrivateOnPublicSurface("private", false)).toBe(false);
  });
});

describe("rejectPrivateEntityOnPublicSurface", () => {
  it("throws 404-style error for private on public surface", () => {
    expect(() => rejectPrivateEntityOnPublicSurface("public", true, "o", "r")).toThrow(
      /not found/i
    );
    expect(createRepoNotFoundError("o", "r").status).toBe(404);
  });

  it("allows private on private surface and public repos on public surface", () => {
    expect(() => rejectPrivateEntityOnPublicSurface("private", true, "o", "r")).not.toThrow();
    expect(() => rejectPrivateEntityOnPublicSurface("public", false, "o", "r")).not.toThrow();
  });
});

describe("createRepoNotFoundError", () => {
  it("sets status 404", () => {
    const error = createRepoNotFoundError("acme", "widgets");
    expect(error.status).toBe(404);
    expect(error.message).toContain("acme/widgets");
  });
});

describe("resolveRepoOwnerName", () => {
  it("parses owner/name slugs and falls back to source owner", () => {
    expect(resolveRepoOwnerName("salahmohsen/cilas", "other")).toEqual({
      owner: "salahmohsen",
      name: "cilas"
    });
    expect(resolveRepoOwnerName("cilas", "salahmohsen")).toEqual({
      owner: "salahmohsen",
      name: "cilas"
    });
  });
});

describe("isGitHubAuthError", () => {
  it("detects HTTP 401/403 and credential messages", () => {
    expect(isGitHubAuthError(Object.assign(new Error("x"), { status: 401 }))).toBe(true);
    expect(isGitHubAuthError(Object.assign(new Error("x"), { status: 403 }))).toBe(true);
    expect(isGitHubAuthError(new Error("Bad credentials"))).toBe(true);
    expect(isGitHubAuthError(Object.assign(new Error("x"), { status: 500 }))).toBe(false);
  });
});

describe("withPublicGithubClient", () => {
  it("returns the first successful run without retry", async () => {
    const run = vi.fn(async () => "ok");
    await expect(withPublicGithubClient({} as never, "public", run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not retry on private surface auth errors", async () => {
    const authError = Object.assign(new Error("Bad credentials"), { status: 401 });
    const run = vi.fn(async () => {
      throw authError;
    });
    await expect(withPublicGithubClient({} as never, "private", run)).rejects.toBe(authError);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries once with anonymous client on public surface auth error", async () => {
    const authError = Object.assign(new Error("Bad credentials"), { status: 401 });
    let calls = 0;
    const run = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw authError;
      return "public-ok";
    });
    await expect(withPublicGithubClient({} as never, "public", run)).resolves.toBe("public-ok");
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("assertRepoVisibleOnPublicSurface", () => {
  it("no-ops on the private surface (never calls repos.get)", async () => {
    const get = vi.fn();
    const octokit = { rest: { repos: { get } } } as never;
    await expect(
      assertRepoVisibleOnPublicSurface(octokit, "o", "r", "private")
    ).resolves.toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it("allows public repos on the public surface", async () => {
    const get = vi.fn(async () => {
      return { data: { private: false } };
    });
    const octokit = { rest: { repos: { get } } } as never;
    await expect(
      assertRepoVisibleOnPublicSurface(octokit, "o", "r", "public")
    ).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledWith({ owner: "o", repo: "r" });
  });

  it("throws 404-style error when the repo is private on the public surface", async () => {
    const get = vi.fn(async () => {
      return { data: { private: true } };
    });
    const octokit = { rest: { repos: { get } } } as never;
    await expect(
      assertRepoVisibleOnPublicSurface(octokit, "o", "secret", "public")
    ).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/secret/i) });
  });
});
