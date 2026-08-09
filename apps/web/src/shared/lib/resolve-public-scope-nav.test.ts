import { describe, expect, it } from "vitest";

import { createPublicSurface } from "./public-surface";
import {
  activeScopeFromPathname,
  pathProfileNameFromPathname,
  resolvePublicScopeNav
} from "./resolve-public-scope-nav";

describe("pathProfileNameFromPathname", () => {
  it("reads path tenant", () => {
    expect(pathProfileNameFromPathname("/salahmohsen")).toBe("salahmohsen");
    expect(pathProfileNameFromPathname("/salahmohsen/repos")).toBe("salahmohsen");
    expect(pathProfileNameFromPathname("/salahmohsen/repos/dev-hub")).toBe("salahmohsen");
  });

  it("ignores custom-domain style repos and reserved", () => {
    expect(pathProfileNameFromPathname("/repos")).toBeNull();
    expect(pathProfileNameFromPathname("/repos/dev-hub")).toBeNull();
    expect(pathProfileNameFromPathname("/dashboard")).toBeNull();
    expect(pathProfileNameFromPathname("/")).toBeNull();
  });
});

describe("activeScopeFromPathname", () => {
  const pathSurface = createPublicSurface({
    tenantProfileName: "salahmohsen",
    mode: "path"
  });
  const customSurface = createPublicSurface({
    tenantProfileName: "salahmohsen",
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
        sessionProfileName: null
      }).show
    ).toBe(false);
  });

  it("shows signed-in community root with own surface, no active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/",
      hostname: "app.example.com",
      isCustomDomain: false,
      sessionProfileName: "me"
    });
    expect(r.show).toBe(true);
    expect(r.surface?.tenantProfileName).toBe("me");
    expect(r.surface?.mode).toBe("path");
    expect(r.active).toBeNull();
  });

  it("hides dashboard", () => {
    expect(
      resolvePublicScopeNav({
        pathname: "/dashboard/settings",
        hostname: "app.example.com",
        isCustomDomain: false,
        sessionProfileName: "me",
        pathProfileName: null
      }).show
    ).toBe(false);
  });

  it("shows path portfolio with profile active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/salahmohsen",
      hostname: "app.example.com",
      isCustomDomain: false,
      pathProfileName: "salahmohsen"
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("profile");
    expect(r.surface?.profileName).toBe("salahmohsen");
  });

  it("shows custom domain repos without path slug", () => {
    const r = resolvePublicScopeNav({
      pathname: "/repos/dev-hub",
      hostname: "salahmohsen.com",
      customDomainProfileName: "salahmohsen",
      isCustomDomain: true
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("repos");
    expect(r.surface?.mode).toBe("custom_domain");
    expect(r.surface?.profileName).toBeNull();
  });

  it("shows custom domain home with profile active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/",
      hostname: "salahmohsen.com",
      customDomainProfileName: "salahmohsen",
      isCustomDomain: true,
      sessionProfileName: "other-user"
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("profile");
    expect(r.surface?.tenantProfileName).toBe("salahmohsen");
    expect(r.surface?.mode).toBe("custom_domain");
  });

  it("hides custom domain until Host tenant is resolved (no session fallback)", () => {
    const r = resolvePublicScopeNav({
      pathname: "/",
      hostname: "salahmohsen.com",
      customDomainProfileName: null,
      isCustomDomain: true,
      sessionProfileName: "me"
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
        sessionProfileName: "me"
      }).show
    ).toBe(false);
  });

  it("shows path repos tree with repos active", () => {
    const r = resolvePublicScopeNav({
      pathname: "/salahmohsen/repos/dev-hub/tree/main",
      hostname: "app.example.com",
      isCustomDomain: false,
      pathProfileName: "salahmohsen"
    });
    expect(r.show).toBe(true);
    expect(r.active).toBe("repos");
  });
});
