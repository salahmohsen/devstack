import { describe, expect, it } from "vitest";

import { isReservedProfilePath, parseProfileName } from "#@/profile/utils";

describe("parseProfileName", () => {
  it("accepts salah", () => {
    expect(parseProfileName("Salah").success).toBe(true);
    expect(parseProfileName("Salah").data).toBe("salah");
  });

  it("rejects dashboard", () => {
    expect(parseProfileName("dashboard").success).toBe(false);
  });

  it("rejects bad chars", () => {
    expect(parseProfileName("Hello World").success).toBe(false);
  });

  it("rejects browser service-worker probes and file-like segments", () => {
    expect(parseProfileName("firebase-messaging-sw.js").success).toBe(false);
    expect(parseProfileName("favicon.ico").success).toBe(false);
    expect(parseProfileName(".well-known").success).toBe(false);
  });
});

describe("isReservedProfilePath", () => {
  it("flags api", () => {
    expect(isReservedProfilePath("api")).toBe(true);
  });
});
