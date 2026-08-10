import { describe, expect, it } from "vitest";

import {
  createRepoNotFoundError,
  isPrivateOnPublicSurface,
  rejectPrivateEntityOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName
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
