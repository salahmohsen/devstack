import { describe, expect, it, vi } from "vitest";

import { stopHubChatAndWaitIdle } from "./stop-hub-chat-and-wait-idle";

describe("stopHubChatAndWaitIdle", () => {
  it("does not stop an idle chat", async () => {
    const stop = vi.fn();
    expect(await stopHubChatAndWaitIdle({ status: "ready", stop })).toBe(true);
    expect(stop).not.toHaveBeenCalled();
  });

  it("stops a streaming chat and resolves once it settles", async () => {
    const chat = { status: "streaming", stop: vi.fn(async () => {}) };
    setTimeout(() => {
      chat.status = "ready";
    }, 60);
    expect(await stopHubChatAndWaitIdle(chat, { pollMs: 5 })).toBe(true);
    expect(chat.stop).toHaveBeenCalledOnce();
  });

  it("reports false when the chat never settles", async () => {
    const chat = { status: "submitted", stop: vi.fn() };
    expect(await stopHubChatAndWaitIdle(chat, { timeoutMs: 40, pollMs: 5 })).toBe(false);
  });
});
