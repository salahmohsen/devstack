import { describe, expect, it } from "vitest";

import { createPublicSurface } from "./public-surface";
import {
  activeScopeFromPathname,
  pathUsernameFromPathname,
  resolvePublicScopeNav
} from "./resolve-public-scope-nav";

describe("pathUsernameFromPathname", () => {
  it("reads path tenant", () => {
    expect(pathUsernameFromPathname("/salahmohsen")).toBe("salahmohsen");
    expect(pathUsernameFromPathname("/salahmohsen/repos")).toBe("salahmohsen");
    expect(pathUsernameFromPathname("/salahmohsen/repos/dev-hub")).toBe("salahmohsen");
  });

  it("ignores custom-domain style repos and reserved", () => {
    expect(pathUsernameFromPathname("/repos")).toBeNull();
    expect(pathUsernameFromPathname("/repos/dev-hub")).toBeNull();
    expect(pathUsernameFromPathname("/dashboard")).toBeNull();
    expect(pathUsernameFromPathname("/sign-in")).toBeNull();
    expect(pathUsernameFromPathname("/sign-up")).toBeNull();
    expect(pathUsernameFromPathname("/")).toBeNull();
  });
});

describe("activeScopeFromPathname", () => {
  const pathSurface = createPublicSurface({
    tenantUsername: "salahmohsen",
    mode: "path"
  });
  const customSurface = createPublicSurface({
    tenantUsername: "salahmohsen",
    mode: "custom_domain"
  });

  it("marks profile vs repos on path mode", () => {
    expect(activeScopeFromPathname("/salahmohsen", pathSurface)).toBe("profile");
    expect(activeScopeFromPathname("/salahmohsen/repos", pathSurface)).toBe("repos");
    expect(activeScopeFromPathname("/salahmohsen/repos/x/tree/main", pathSurface)).toBe("repos");
  });

  it("marks profile vs repos on custom domain", () => {
    expect(activeScopeFromPathname("/", customSurface)).toBe("profile");
    expect(activeScopeFromPathname("/repos", customSurface)).toBe("repos");
    expect(activeScopeFromPathname("/repos/dev-hub", customSurface)).toBe("repos");
  });
});

describe("resolvePublicScopeNav", () => {
  it("hides guest community root", () => {
    expect(
      resolvePublicScopeNav({
        pathname: "/",
        hostname: "app.example.com",
        // Force primary-host mode so VITE_WEB_URL in the test env cannot mark Host custom.
        isCustomDomain: false,
        sessionUsername: null
      }).show
    ).toBe(false);
  });

  it("shows signed-in community root with own surface, no active, dashboard chip", () => {
    const r = resolvePublicScopeNav({
      pathname: "/",
      hostname: "app.example.com",
      isCustomDomain: false,
      sessionUsername: "me"
    });
    expect(r.show).toBe(true);
    expect(r.surface?.tenantUsername).toBe("me");
    expect(r.surface?.mode).toBe("path");
    expect(r.active).toBeNull();
    expect(r.showDashboard).toBe(true);
  });

  it("shows dashboard when signed in with dashboard active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/dashboard/settings",
      hostname: "app.example.com",
      isCustomDomain: false,
      sessionUsername: "me",
      pathUsername: null
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("dashboard");
    expect(r.showDashboard).toBe(true);
    expect(r.surface?.tenantUsername).toBe("me");
  });

  it("hides dashboard chrome when not signed in", () => {
    expect(
      resolvePublicScopeNav({
        pathname: "/dashboard",
        hostname: "app.example.com",
        isCustomDomain: false,
        sessionUsername: null
      }).show
    ).toBe(false);
  });

  it("shows path portfolio with profile active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/salahmohsen",
      hostname: "app.example.com",
      isCustomDomain: false,
      pathUsername: "salahmohsen"
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("profile");
    expect(r.surface?.username).toBe("salahmohsen");
    expect(r.showDashboard).toBe(false);
  });

  it("shows dashboard chip on path portfolio when signed in", () => {
    const r = resolvePublicScopeNav({
      pathname: "/salahmohsen",
      hostname: "app.example.com",
      isCustomDomain: false,
      pathUsername: "salahmohsen",
      sessionUsername: "me"
    });
    expect(r.show).toBe(true);
    expect(r.showDashboard).toBe(true);
    expect(r.active).toBe("profile");
  });

  it("shows custom domain repos without path slug", () => {
    const r = resolvePublicScopeNav({
      pathname: "/repos/dev-hub",
      hostname: "salahmohsen.com",
      customDomainUsername: "salahmohsen",
      isCustomDomain: true
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("repos");
    expect(r.surface?.mode).toBe("custom_domain");
    expect(r.surface?.username).toBeNull();
  });

  it("shows custom domain home with profile active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/",
      hostname: "salahmohsen.com",
      customDomainUsername: "salahmohsen",
      isCustomDomain: true,
      sessionUsername: "other-user"
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("profile");
    expect(r.surface?.tenantUsername).toBe("salahmohsen");
    expect(r.surface?.mode).toBe("custom_domain");
  });

  it("hides custom domain until Host tenant is resolved (no session fallback)", () => {
    const r = resolvePublicScopeNav({
      pathname: "/",
      hostname: "salahmohsen.com",
      customDomainUsername: null,
      isCustomDomain: true,
      sessionUsername: "me"
    });
    expect(r.show).toBe(false);
    expect(r.surface).toBeNull();
  });

  it("hides sign-in", () => {
    expect(
      resolvePublicScopeNav({
        pathname: "/sign-in",
        hostname: "app.example.com",
        isCustomDomain: false,
        sessionUsername: "me"
      }).show
    ).toBe(false);
  });

  it("hides sign-up", () => {
    expect(
      resolvePublicScopeNav({
        pathname: "/sign-up",
        hostname: "app.example.com",
        isCustomDomain: false,
        sessionUsername: "me"
      }).show
    ).toBe(false);
  });

  it("shows path repos tree with repos active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/salahmohsen/repos/dev-hub/tree/main",
      hostname: "app.example.com",
      isCustomDomain: false,
      pathUsername: "salahmohsen"
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("repos");
  });
});
