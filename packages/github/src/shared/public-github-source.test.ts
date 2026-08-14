import { describe, expect, it, vi } from "vitest";

import {
  invalidatePublicGitHubSourceCache,
  resolveWorkingGitHubAccessToken,
  type WorkingTokenDeps
} from "./public-github-source";

function baseRow(
  overrides: Partial<{
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpiresAt: Date | null;
  }> = {}
) {
  return {
    id: overrides.id ?? "acct-1",
    userId: "user-1",
    accountId: "gh-123",
    accessToken: overrides.accessToken === undefined ? "dead-token" : overrides.accessToken,
    refreshToken: overrides.refreshToken === undefined ? "refresh-1" : overrides.refreshToken,
    accessTokenExpiresAt: overrides.accessTokenExpiresAt ?? null,
    refreshTokenExpiresAt: null,
    scope: "repo",
    updatedAt: new Date("2026-08-14T06:00:00.000Z")
  };
}

describe("resolveWorkingGitHubAccessToken", () => {
  it("returns the token when GET /user succeeds", async () => {
    const deps: WorkingTokenDeps = {
      fetchUserLogin: vi.fn(async (token) => (token === "good" ? "octocat" : null)),
      refreshAccessToken: vi.fn(async () => null),
      getClientCredentials: () => {
        return { clientId: "id", clientSecret: "secret" };
      }
    };

    const result = await resolveWorkingGitHubAccessToken(
      baseRow({ accessToken: "good", refreshToken: null }),
      deps
    );

    expect(result).toEqual({ token: "good", login: "octocat" });
    expect(deps.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("force-refreshes when access token is rejected, then returns the new token", async () => {
    const logins = vi.fn(async (token: string) => {
      if (token === "dead-token") return null;
      if (token === "fresh-token") return "octocat";
      return null;
    });
    const refresh = vi.fn(async () => "fresh-token");

    const deps: WorkingTokenDeps = {
      fetchUserLogin: logins,
      refreshAccessToken: refresh,
      getClientCredentials: () => {
        return { clientId: "id", clientSecret: "secret" };
      }
    };

    const result = await resolveWorkingGitHubAccessToken(baseRow(), deps);

    expect(result).toEqual({ token: "fresh-token", login: "octocat" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(logins).toHaveBeenCalledWith("dead-token");
    expect(logins).toHaveBeenCalledWith("fresh-token");
  });

  it("proactively refreshes when access token is known expired", async () => {
    const refresh = vi.fn(async () => "fresh-token");
    const deps: WorkingTokenDeps = {
      fetchUserLogin: vi.fn(async (token) => (token === "fresh-token" ? "octocat" : null)),
      refreshAccessToken: refresh,
      getClientCredentials: () => {
        return { clientId: "id", clientSecret: "secret" };
      }
    };

    const result = await resolveWorkingGitHubAccessToken(
      baseRow({
        accessToken: "old-token",
        accessTokenExpiresAt: new Date(Date.now() - 60_000)
      }),
      deps
    );

    expect(result).toEqual({ token: "fresh-token", login: "octocat" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("returns invalid when refresh cannot revive a dead token", async () => {
    const deps: WorkingTokenDeps = {
      fetchUserLogin: vi.fn(async () => null),
      refreshAccessToken: vi.fn(async () => "still-dead"),
      getClientCredentials: () => {
        return { clientId: "id", clientSecret: "secret" };
      }
    };

    const result = await resolveWorkingGitHubAccessToken(baseRow(), deps);
    expect(result).toEqual({ token: null, reason: "invalid" });
  });

  it("returns missing when there is no access token and refresh is impossible", async () => {
    const deps: WorkingTokenDeps = {
      fetchUserLogin: vi.fn(async () => null),
      refreshAccessToken: vi.fn(async () => null),
      getClientCredentials: () => {
        return { clientId: undefined, clientSecret: undefined };
      }
    };

    const result = await resolveWorkingGitHubAccessToken(
      baseRow({ accessToken: null, refreshToken: null }),
      deps
    );
    expect(result).toEqual({ token: null, reason: "missing" });
  });

  it("dedupes concurrent refreshes per account id", async () => {
    let resolveRefresh!: (value: string | null) => void;
    const refreshPromise = new Promise<string | null>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi.fn(() => refreshPromise);

    const deps: WorkingTokenDeps = {
      fetchUserLogin: vi.fn(async (token) => (token === "fresh-token" ? "octocat" : null)),
      refreshAccessToken: refresh,
      getClientCredentials: () => {
        return { clientId: "id", clientSecret: "secret" };
      }
    };

    const row = baseRow({ id: "acct-concurrent" });
    const a = resolveWorkingGitHubAccessToken(row, deps);
    const b = resolveWorkingGitHubAccessToken(row, deps);

    // Let dead-token login probes finish and both enter force-refresh.
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    resolveRefresh("fresh-token");

    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual({ token: "fresh-token", login: "octocat" });
    expect(rb).toEqual({ token: "fresh-token", login: "octocat" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("invalidatePublicGitHubSourceCache", () => {
  it("accepts optional userId without throwing", () => {
    expect(() => invalidatePublicGitHubSourceCache("user-x")).not.toThrow();
    expect(() => invalidatePublicGitHubSourceCache()).not.toThrow();
  });
});
