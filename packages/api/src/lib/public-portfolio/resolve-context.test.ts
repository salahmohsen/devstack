import { afterEach, describe, expect, it, vi } from "vitest";

const { findById, findByUsername, findVerifiedByHostname, findBySlug } = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findByUsername: vi.fn(),
    findVerifiedByHostname: vi.fn(),
    findBySlug: vi.fn()
  };
});

vi.mock("@tsu-stack/db", () => {
  return {
    userRepository: {
      findById,
      findByUsername
    },
    userCustomDomainRepository: {
      findVerifiedByHostname
    },
    usernameSlugAliasRepository: {
      findBySlug
    }
  };
});

import { resolvePublicPortfolioContext, resolveUserIdByUsername } from "./resolve-context";

function user(id: string, username: string) {
  return { id, username } as { id: string; username: string };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveUserIdByUsername", () => {
  it("returns null for reserved or invalid slugs without hitting the DB", async () => {
    await expect(resolveUserIdByUsername("dashboard")).resolves.toBeNull();
    await expect(resolveUserIdByUsername("Hello World")).resolves.toBeNull();
    expect(findByUsername).not.toHaveBeenCalled();
    expect(findBySlug).not.toHaveBeenCalled();
  });

  it("resolves live username then alias", async () => {
    findByUsername.mockResolvedValueOnce(user("u1", "alice"));
    await expect(resolveUserIdByUsername("Alice")).resolves.toBe("u1");

    findByUsername.mockResolvedValueOnce(null);
    findBySlug.mockResolvedValueOnce({ userId: "u2", slug: "old-alice" });
    await expect(resolveUserIdByUsername("old-alice")).resolves.toBe("u2");
  });

  it("returns null for unknown slugs", async () => {
    findByUsername.mockResolvedValue(null);
    findBySlug.mockResolvedValue(null);
    await expect(resolveUserIdByUsername("nobody")).resolves.toBeNull();
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
        pathUsername: "bob",
        sessionUserId: "u-session"
      })
    ).resolves.toEqual({
      userId: "u-host",
      username: "alice",
      mode: "custom_domain"
    });

    expect(findByUsername).not.toHaveBeenCalled();
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
    findByUsername.mockResolvedValue(user("u-path", "bob"));
    findById.mockResolvedValue(user("u-path", "bob"));

    await expect(
      resolvePublicPortfolioContext({
        host: "unknown.example.com",
        pathUsername: "bob"
      })
    ).resolves.toEqual({
      userId: "u-path",
      username: "bob",
      mode: "path"
    });
  });

  it("resolves path username when Host does not match", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    findByUsername.mockResolvedValue(user("u1", "alice"));
    findById.mockResolvedValue(user("u1", "alice"));

    await expect(resolvePublicPortfolioContext({ pathUsername: "alice" })).resolves.toEqual({
      userId: "u1",
      username: "alice",
      mode: "path"
    });
  });

  it("resolves path via slug alias", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    findByUsername.mockResolvedValue(null);
    findBySlug.mockResolvedValue({ userId: "u-alias", slug: "old-name" });
    findById.mockResolvedValue(user("u-alias", "new-name"));

    await expect(resolvePublicPortfolioContext({ pathUsername: "old-name" })).resolves.toEqual({
      userId: "u-alias",
      username: "new-name",
      mode: "path"
    });
  });

  it("returns null for reserved path slug without session fallback", async () => {
    await expect(
      resolvePublicPortfolioContext({
        pathUsername: "dashboard",
        sessionUserId: "u-session"
      })
    ).resolves.toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it("security: wrong explicit slug never falls back to session", async () => {
    findByUsername.mockResolvedValue(null);
    findBySlug.mockResolvedValue(null);

    await expect(
      resolvePublicPortfolioContext({
        pathUsername: "nobody",
        sessionUserId: "u-session"
      })
    ).resolves.toBeNull();

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
      username: "alice",
      mode: "path"
    });
  });

  it("returns null when nothing resolves", async () => {
    findVerifiedByHostname.mockResolvedValue(null);
    await expect(resolvePublicPortfolioContext({ host: "x.example.com" })).resolves.toBeNull();
    await expect(resolvePublicPortfolioContext({})).resolves.toBeNull();
  });
});
