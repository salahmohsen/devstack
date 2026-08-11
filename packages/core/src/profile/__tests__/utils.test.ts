import { describe, expect, it } from "vitest";

import { isReservedUsernamePath, parseUsername } from "#@/profile/utils";

describe("parseUsername", () => {
  it("accepts salah", () => {
    expect(parseUsername("Salah").success).toBe(true);
    expect(parseUsername("Salah").data).toBe("salah");
  });

  it("rejects dashboard", () => {
    expect(parseUsername("dashboard").success).toBe(false);
  });

  it("rejects bad chars", () => {
    expect(parseUsername("Hello World").success).toBe(false);
  });

  it("rejects browser service-worker probes and file-like segments", () => {
    expect(parseUsername("firebase-messaging-sw.js").success).toBe(false);
    expect(parseUsername("favicon.ico").success).toBe(false);
    expect(parseUsername(".well-known").success).toBe(false);
  });
});

describe("isReservedUsernamePath", () => {
  it("flags api", () => {
    expect(isReservedUsernamePath("api")).toBe(true);
  });
});
