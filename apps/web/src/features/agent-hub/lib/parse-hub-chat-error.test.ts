import { describe, expect, it } from "vitest";

import { parseHubChatError } from "./parse-hub-chat-error";

const OPENCODE_BALANCE = `Hub agent error (500): {"message":"Insufficient balance. Manage your billing here: https://opencode.ai/workspace/wrk_x/billing","name":"AI_APICallError","stack":"AI_APICallError: Insufficient balance\\n    at file:///app/...","url":"https://opencode.ai/zen/go/v1/chat/completions","statusCode":401}`;

describe("parseHubChatError", () => {
  it("classifies OpenCode insufficient balance with billing URL", () => {
    const p = parseHubChatError(OPENCODE_BALANCE);
    expect(p.kind).toBe("insufficient_balance");
    expect(p.variant).toBe("warning");
    expect(p.title).toBe("Provider balance is empty");
    expect(p.billingUrl).toContain("opencode.ai");
    expect(p.billingUrl).toContain("/billing");
    expect(p.showAiSettings).toBe(true);
    expect(p.description).not.toMatch(/file:\/\//);
    expect(p.description).not.toMatch(/AI_APICallError/);
  });

  it("classifies missing BYO key", () => {
    const p = parseHubChatError(
      "Configure an AI provider API key in Settings → AI before using Hub chat (BYO keys)."
    );
    expect(p.kind).toBe("missing_byo");
    expect(p.showAiSettings).toBe(true);
    expect(p.retryable).toBe(false);
  });

  it("keeps stacks only under technicalDetails", () => {
    const p = parseHubChatError(OPENCODE_BALANCE);
    expect(p.technicalDetails).toContain("file:///app");
    expect(p.description.length).toBeLessThan(280);
  });
});
