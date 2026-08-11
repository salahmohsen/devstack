import { afterEach, describe, expect, it, vi } from "vitest";

const { findById, findByProfileName, findVerifiedByHostname, findBySlug } = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findByProfileName: vi.fn(),
    findVerifiedByHostname: vi.fn(),
    findBySlug: vi.fn()
  };
});

vi.mock("@tsu-stack/db", () => {
  return {
    userRepository: {
      findById,
      findByProfileName
    },
    userCustomDomainRepository: {
      findVerifiedByHostname
    },
    profileSlugAliasRepository: {
      findBySlug
    }
  };
});

import { resolvePublicPortfolioContext, resolveUserIdByProfileName } from "./resolve-context";

function user(id: string, profileName: string) {
  return { id, profileName } as { id: string; profileName: string };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveUserIdByProfileName", () => {
  it("returns null for reserved or invalid slugs without hitting the DB", async () => {
    await expect(resolveUserIdByProfileName("dashboard")).resolves.toBeNull();
    await expect(resolveUserIdByProfileName("Hello World")).resolves.toBeNull();
    expect(findByProfileName).not.toHaveBeenCalled();
    expect(findBySlug).not.toHaveBeenCalled();
  });

  it("resolves live profileName then alias", async () => {
    findByProfileName.mockResolvedValueOnce(user("u1", "alice"));
    await expect(resolveUserIdByProfileName("Alice")).resolves.toBe("u1");

    findByProfileName.mockResolvedValueOnce(null);
    findBySlug.mockResolvedValueOnce({ userId: "u2", slug: "old-alice" });
    await expect(resolveUserIdByProfileName("old-alice")).resolves.toBe("u2");
  });

  it("returns null for unknown slugs", async () => {
    findByProfileName.mockResolvedValue(null);
    findBySlug.mockResolvedValue(null);
    await expect(resolveUserIdByProfileName("nobody")).resolves.toBeNull();
  });
});

describe("resolvePublicPortfolioContext", () => {
  it("verified custom-domain Host wins (mode custom_domain)", async () => {
    findVerifiedByHostname.mockResolvedValue({
      userId: "u-host",
      hostname: "portfolio.example.com",
      status: "verified"
    });
    findById.mockResolvedValue(user("u-host", "alice"));

    await expect(
      resolvePublicPortfolioContext({
        host: "portfolio.example.com",
        pathProfileName: "bob",
        sessionUserId: "u-session"
      })
    ).resolves.toEqual({
      userId: "u-host",
      profileName: "alice",
      mode: "custom_domain"
    });

    // Host path short-circuits before path/session identity lookups for user bob.
    expect(findByProfileName).not.toHaveBeenCalled();
  });

  it("normalizes Host (port / case) before domain lookup", async () => {
    findVerifiedByHostname.mockResolvedValue({
      userId: "u-host",
      hostname: "portfolio.example.com",
      status: "verified"
    });
    findById.mockResolvedValue(user("u-host", "alice"));

    await resolvePublicPortfolioContext({ host: "Portfolio.Example.Com:443" });
    expect(findVerifiedByHostname).toHaveBeenCalledWith("portfolio.example.com");
  });

  it("ignores unverified / unknown Host and falls through to path", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    findByProfileName.mockResolvedValue(user("u-path", "bob"));
    findById.mockResolvedValue(user("u-path", "bob"));

    await expect(
      resolvePublicPortfolioContext({
        host: "unknown.example.com",
        pathProfileName: "bob"
      })
    ).resolves.toEqual({
      userId: "u-path",
      profileName: "bob",
      mode: "path"
    });
  });

  it("resolves path profileName when Host does not match", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    findByProfileName.mockResolvedValue(user("u1", "alice"));
    findById.mockResolvedValue(user("u1", "alice"));

    await expect(resolvePublicPortfolioContext({ pathProfileName: "alice" })).resolves.toEqual({
      userId: "u1",
      profileName: "alice",
      mode: "path"
    });
  });

  it("resolves path via slug alias", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    findByProfileName.mockResolvedValue(null);
    findBySlug.mockResolvedValue({ userId: "u-alias", slug: "old-name" });
    findById.mockResolvedValue(user("u-alias", "new-name"));

    await expect(resolvePublicPortfolioContext({ pathProfileName: "old-name" })).resolves.toEqual({
      userId: "u-alias",
      profileName: "new-name",
      mode: "path"
    });
  });

  it("returns null for reserved path slug without session fallback", async () => {
    await expect(
      resolvePublicPortfolioContext({
        pathProfileName: "dashboard",
        sessionUserId: "u-session"
      })
    ).resolves.toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it("security: wrong explicit slug never falls back to session", async () => {
    findByProfileName.mockResolvedValue(null);
    findBySlug.mockResolvedValue(null);

    await expect(
      resolvePublicPortfolioContext({
        pathProfileName: "nobody",
        sessionUserId: "u-session"
      })
    ).resolves.toBeNull();

    // Must not load session user when an explicit slug failed.
    expect(findById).not.toHaveBeenCalled();
  });

  it("session fallback only when Host and path do not match", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    findById.mockResolvedValue(user("u-session", "alice"));

    await expect(
      resolvePublicPortfolioContext({
        host: "app.example.com",
        sessionUserId: "u-session"
      })
    ).resolves.toEqual({
      userId: "u-session",
      profileName: "alice",
      mode: "path"
    });
  });

  it("returns null when nothing resolves", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    await expect(resolvePublicPortfolioContext({ host: "x.example.com" })).resolves.toBeNull();
    await expect(resolvePublicPortfolioContext({})).resolves.toBeNull();
  });
});
