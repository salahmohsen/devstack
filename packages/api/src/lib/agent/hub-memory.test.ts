import { describe, expect, it } from "vitest";

import { hubChatThreadId } from "./hub-memory";

describe("hubChatThreadId", () => {
  it("keeps the original id at epoch 0 for existing threads", () => {
    expect(hubChatThreadId("user-1")).toBe("dashboard-home:user-1");
    expect(hubChatThreadId("user-1", 0)).toBe("dashboard-home:user-1");
  });

  it("rotates the id when epoch is bumped for a new chat", () => {
    expect(hubChatThreadId("user-1", 1)).toBe("dashboard-home:user-1:e1");
    expect(hubChatThreadId("user-1", 3)).toBe("dashboard-home:user-1:e3");
  });
});
