import { describe, expect, it } from "vitest";

import { extractAvatarClientKey, extractAvatarObjectKey } from "#@/profile/avatar";
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

describe("extractAvatarObjectKey / extractAvatarClientKey", () => {
  const full = "user123/avatars/abc-def.jpg";

  it("parses full key and MinIO/media URLs", () => {
    expect(extractAvatarObjectKey(full)).toBe(full);
    expect(
      extractAvatarObjectKey("http://127.0.0.1:9002/personal-hub/user123/avatars/abc-def.jpg")
    ).toBe(full);
    expect(
      extractAvatarObjectKey("http://localhost:3000/api/media/user123/avatars/abc-def.jpg")
    ).toBe(full);
  });

  it("returns client-relative key for files-sdk delete", () => {
    expect(extractAvatarClientKey(full)).toBe("avatars/abc-def.jpg");
    expect(
      extractAvatarClientKey("http://127.0.0.1:9002/personal-hub/user123/avatars/abc-def.jpg")
    ).toBe("avatars/abc-def.jpg");
  });
});
