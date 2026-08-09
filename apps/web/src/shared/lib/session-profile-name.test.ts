import { describe, expect, it } from "vitest";

import { sessionProfileNameFromUser } from "./session-profile-name";

describe("sessionProfileNameFromUser", () => {
  it("reads a non-empty profileName", () => {
    expect(sessionProfileNameFromUser({ profileName: "salah" })).toBe("salah");
  });

  it("trims whitespace", () => {
    expect(sessionProfileNameFromUser({ profileName: "  me  " })).toBe("me");
  });

  it("returns null for missing or empty values", () => {
    expect(sessionProfileNameFromUser(null)).toBeNull();
    expect(sessionProfileNameFromUser({})).toBeNull();
    expect(sessionProfileNameFromUser({ profileName: "" })).toBeNull();
    expect(sessionProfileNameFromUser({ profileName: "   " })).toBeNull();
    expect(sessionProfileNameFromUser({ profileName: 1 })).toBeNull();
  });
});
