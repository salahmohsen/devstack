import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tsu-stack/db", () => {
  return {
    userCustomDomainRepository: {
      findVerifiedByHostname: vi.fn()
    }
  };
});

import { userCustomDomainRepository } from "@tsu-stack/db";

import {
  buildStaticAllowedOrigins,
  invalidateAllowedOriginCache,
  resolveAllowedBrowserOrigin
} from "./allowed-browser-origin";

afterEach(() => {
  invalidateAllowedOriginCache();
  vi.clearAllMocks();
});

describe("buildStaticAllowedOrigins", () => {
  it("includes the VITE_WEB_URL origin", () => {
    const set = buildStaticAllowedOrigins("https://app.example.com");
    expect(set.has("https://app.example.com")).toBe(true);
  });

  it("adds loopback peers when primary is localhost", () => {
    const set = buildStaticAllowedOrigins("http://localhost:3000");
    expect(set.has("http://localhost:3000")).toBe(true);
    expect(set.has("http://127.0.0.1:3000")).toBe(true);
  });

  it("returns empty set for invalid webUrl", () => {
    expect(buildStaticAllowedOrigins("not-a-url").size).toBe(0);
  });
});

describe("resolveAllowedBrowserOrigin", () => {
  it("denies empty origin", async () => {
    expect(await resolveAllowedBrowserOrigin("")).toBeNull();
  });

  it("allows verified custom domain origin", async () => {
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockResolvedValue({
      id: "1",
      userId: "u",
      hostname: "portfolio.example.com",
      status: "verified",
      verificationToken: "t",
      verifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as never);

    await expect(resolveAllowedBrowserOrigin("https://portfolio.example.com")).resolves.toBe(
      "https://portfolio.example.com"
    );
  });

  it("denies when repository throws (fail-closed)", async () => {
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockRejectedValue(
      new Error("db down")
    );
    await expect(resolveAllowedBrowserOrigin("https://other.example.com")).resolves.toBeNull();
  });

  it("clear-all invalidation drops cached deny", async () => {
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockResolvedValue(null);
    await resolveAllowedBrowserOrigin("https://soon.example.com");
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockResolvedValue({
      hostname: "soon.example.com",
      status: "verified"
    } as never);
    // still cached deny until invalidate
    await expect(resolveAllowedBrowserOrigin("https://soon.example.com")).resolves.toBeNull();
    invalidateAllowedOriginCache();
    await expect(resolveAllowedBrowserOrigin("https://soon.example.com")).resolves.toBe(
      "https://soon.example.com"
    );
  });
});
