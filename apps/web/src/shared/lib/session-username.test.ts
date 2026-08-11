import { describe, expect, it } from "vitest";

import { sessionUsernameFromUser } from "./session-username";

describe("sessionUsernameFromUser", () => {
  it("reads a non-empty username", () => {
    expect(sessionUsernameFromUser({ username: "salah" })).toBe("salah");
  });

  it("trims whitespace", () => {
    expect(sessionUsernameFromUser({ username: "  me  " })).toBe("me");
  });

  it("returns null for missing or empty values", () => {
    expect(sessionUsernameFromUser(null)).toBeNull();
    expect(sessionUsernameFromUser({})).toBeNull();
    expect(sessionUsernameFromUser({ username: "" })).toBeNull();
    expect(sessionUsernameFromUser({ username: "   " })).toBeNull();
    expect(sessionUsernameFromUser({ username: 1 })).toBeNull();
  });
});
