import { describe, expect, it } from "vitest";

import { extractInviteCodeFromSources, readStringField } from "./invite-code";
import {
  INVITE_COOKIE_NAME,
  buildInviteCookieValue,
  readInviteCodeFromCookieHeader,
  serializeInviteClearCookie,
  serializeInviteSetCookie
} from "./invite-cookie";

describe("readStringField", () => {
  it("returns trimmed non-empty strings only", () => {
    expect(readStringField({ inviteCode: "  abc  " }, "inviteCode")).toBe("abc");
    expect(readStringField({ inviteCode: "" }, "inviteCode")).toBeNull();
    expect(readStringField({ inviteCode: 1 }, "inviteCode")).toBeNull();
    expect(readStringField(null, "inviteCode")).toBeNull();
  });
});

describe("invite cookie helpers", () => {
  it("round-trips code through Set-Cookie serialization and Cookie header parse", () => {
    const setCookie = serializeInviteSetCookie("  invite-xyz  ", { secure: false });
    expect(setCookie).toContain(`${INVITE_COOKIE_NAME}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain("Secure");

    const header = `${INVITE_COOKIE_NAME}=${encodeURIComponent(buildInviteCookieValue("  invite-xyz  "))}; other=1`;
    expect(readInviteCodeFromCookieHeader(header)).toBe("invite-xyz");
  });

  it("clear cookie expires the invite cookie", () => {
    const clear = serializeInviteClearCookie({ secure: false });
    expect(clear).toContain(`${INVITE_COOKIE_NAME}=`);
    expect(clear).toContain("Max-Age=0");
  });

  it("returns null for missing or empty cookie headers", () => {
    expect(readInviteCodeFromCookieHeader(null)).toBeNull();
    expect(readInviteCodeFromCookieHeader("")).toBeNull();
    expect(readInviteCodeFromCookieHeader("session=abc")).toBeNull();
  });
});

describe("extractInviteCodeFromSources", () => {
  it("prefers body inviteCode over cookie and OAuth state", () => {
    expect(
      extractInviteCodeFromSources({
        body: { inviteCode: "from-body" },
        getCookie: () => "from-cookie",
        cookieHeader: `${INVITE_COOKIE_NAME}=from-header`,
        oauthStateInviteCode: "from-oauth"
      })
    ).toBe("from-body");
  });

  it("uses getCookie when body is missing", () => {
    expect(
      extractInviteCodeFromSources({
        body: {},
        getCookie: (name) => (name === INVITE_COOKIE_NAME ? " cookie-code " : null),
        oauthStateInviteCode: "from-oauth"
      })
    ).toBe("cookie-code");
  });

  it("falls back to Cookie header when getCookie is absent", () => {
    expect(
      extractInviteCodeFromSources({
        cookieHeader: `a=1; ${INVITE_COOKIE_NAME}=header-code; b=2`,
        oauthStateInviteCode: "from-oauth"
      })
    ).toBe("header-code");
  });

  it("uses OAuth state last", () => {
    expect(
      extractInviteCodeFromSources({
        body: null,
        oauthStateInviteCode: "  oauth-code  "
      })
    ).toBe("oauth-code");
  });

  it("fails closed when all sources are missing", () => {
    expect(extractInviteCodeFromSources({})).toBeNull();
    expect(
      extractInviteCodeFromSources({
        body: { inviteCode: "   " },
        getCookie: () => "  ",
        cookieHeader: null,
        oauthStateInviteCode: ""
      })
    ).toBeNull();
  });
});
