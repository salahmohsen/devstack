import { describe, expect, it } from "vitest";

import { classifyHubHistoryError } from "./classify-hub-history-error";

describe("classifyHubHistoryError", () => {
  it("treats 401, 403 and UNAUTHORIZED codes as an expired session", () => {
    expect(classifyHubHistoryError({ status: 401 })).toBe("auth");
    expect(classifyHubHistoryError({ status: 403 })).toBe("auth");
    expect(classifyHubHistoryError({ code: "UNAUTHORIZED" })).toBe("auth");
    expect(classifyHubHistoryError(new Error("Unauthorized"))).toBe("auth");
  });

  it("treats everything else as transient", () => {
    expect(classifyHubHistoryError(new TypeError("fetch failed"))).toBe("transient");
    expect(classifyHubHistoryError({ status: 502 })).toBe("transient");
    expect(classifyHubHistoryError(null)).toBe("transient");
  });
});
