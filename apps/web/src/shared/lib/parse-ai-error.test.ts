import { describe, expect, it } from "vitest";

import { parseAiError, presentAiError } from "./parse-ai-error";

const OPENCODE_BALANCE = `Hub agent error (500): {"message":"Insufficient balance. Manage your billing here: https://opencode.ai/workspace/wrk_x/billing","name":"AI_APICallError","stack":"AI_APICallError: Insufficient balance\\n    at file:///app/...","url":"https://opencode.ai/zen/go/v1/chat/completions","statusCode":401}`;

const OPENCODE_CHINA_OPT_IN = `{"message":"The latest version of this model is only available hosted in China and requires explicit opt in: https://opencode.ai/workspace/wrk_01KW1NZSR76GWDSCKXRE4YSTCN/go","name":"AI_APICallError","stack":"AI_APICallError: The latest version of this model is only available hosted in China and requires explicit opt in: https://opencode.ai/workspace/wrk_01KW1NZSR76GWDSCKXRE4YSTCN/go\\n    at file:///Users/salah/Developer/personal-hub/node_modules/...","url":"https://opencode.ai/zen/go/v1/chat/completions","statusCode":403,"isRetryable":false}`;

describe("parseAiError", () => {
  it("classifies OpenCode insufficient balance with billing URL", () => {
    const p = parseAiError(OPENCODE_BALANCE);
    expect(p.kind).toBe("insufficient_balance");
    expect(p.variant).toBe("warning");
    expect(p.title).toBe("Provider out of credits");
    expect(p.billingUrl).toContain("opencode.ai");
    expect(p.billingUrl).toContain("/billing");
    expect(p.externalActionLabel).toBe("Open billing");
    expect(p.showAiSettings).toBe(true);
    expect(p.description).not.toMatch(/file:\/\//);
    expect(p.description).not.toMatch(/AI_APICallError/);
  });

  it("classifies OpenCode China opt-in 403 as provider error, not session expired", () => {
    const p = parseAiError(OPENCODE_CHINA_OPT_IN);
    expect(p.kind).toBe("provider_error");
    expect(p.title).toBe("Model needs opt-in");
    expect(p.description).toMatch(/hosted in China|opt in/i);
    expect(p.description).not.toMatch(/Session expired|Sign in again/i);
    // Recovery URL is on the action button, not the body copy
    expect(p.description).not.toMatch(/https?:\/\//);
    expect(p.billingUrl).toContain("opencode.ai/workspace");
    expect(p.billingUrl).toContain("/go");
    expect(p.externalActionLabel).toBe("Open provider");
    expect(p.showAiSettings).toBe(true);
    expect(p.retryable).toBe(true);
    expect(p.technicalDetails).toContain("statusCode");
  });

  it("classifies missing BYO key", () => {
    const p = parseAiError(
      "Configure an AI provider API key in Settings → AI before using Hub chat (BYO keys)."
    );
    expect(p.kind).toBe("missing_byo");
    expect(p.showAiSettings).toBe(true);
    expect(p.retryable).toBe(false);
  });

  it("classifies organize missing-BYO note", () => {
    const p = parseAiError(
      "AI organize suggestions were skipped — configure a provider in Settings → AI."
    );
    expect(p.kind).toBe("missing_byo");
    expect(p.showAiSettings).toBe(true);
  });

  it("treats a dead agent as offline, not a settings problem", () => {
    const p = parseAiError("fetch failed: ECONNREFUSED 127.0.0.1:4111");
    expect(p.kind).toBe("unavailable");
    expect(p.title).toBe("Assistant is offline");
    expect(p.showAiSettings).toBe(false);
    expect(p.retryable).toBe(true);
    expect(p.description).toBe("Try again in a moment.");
  });

  it("classifies real app session failures as unauthorized", () => {
    const p = parseAiError("Unauthorized: session expired");
    expect(p.kind).toBe("unauthorized");
    expect(p.title).toBe("Session expired");
  });

  it("classifies the real expired OpenCode key as a rejected key", () => {
    const p = parseAiError(
      "rewrite-projects (chunk 1/2): This API key has expired. Create a new API key in OpenCode Console and replace it in your client or secret store."
    );
    expect(p.title).toBe("Your AI provider key was rejected");
    expect(p.showAiSettings).toBe(true);
    expect(p.retryable).toBe(true);
  });

  it.each([
    "invalid x-api-key",
    "Incorrect API key provided: sk-abc",
    "The API key was revoked",
    '{"message":"Unauthorized","name":"AI_APICallError","statusCode":401,"url":"https://api.openai.com/v1/chat/completions"}'
  ])("classifies %s as a rejected key", (raw) => {
    expect(parseAiError(raw).title).toBe("Your AI provider key was rejected");
  });

  it("keeps a missing key on the not-set-up message", () => {
    expect(parseAiError("No API key configured").title).toBe("AI provider not set up");
  });

  it("does not call unrelated memory or network text offline", () => {
    expect(parseAiError("Model reply used too much memory of the context").kind).not.toBe(
      "unavailable"
    );
    expect(parseAiError("Social network post is too long").kind).not.toBe("unavailable");
  });

  it("keeps stacks only under technicalDetails", () => {
    const p = parseAiError(OPENCODE_BALANCE);
    expect(p.technicalDetails).toContain("file:///app");
    expect(p.description.length).toBeLessThan(280);
  });
});

describe("presentAiError", () => {
  it("uses hub title for hard unknown", () => {
    const p = presentAiError("weird failure xyz", { feature: "hub", severity: "hard" });
    expect(p.title).toBe("Message not sent");
  });

  it("uses organize partial framing and folds notes into details", () => {
    const p = presentAiError(null, {
      feature: "organize",
      severity: "partial",
      notes: ["AI rename failed for some stacks — results may be incomplete (timeout)."]
    });
    expect(p.variant).toBe("warning");
    expect(p.title).toBe("Suggestions incomplete");
    expect(p.technicalDetails).toMatch(/rename failed/i);
    expect(p.description).not.toMatch(/timeout/);
  });

  it("keeps balance recovery when notes classify as balance", () => {
    const p = presentAiError(null, {
      feature: "organize",
      severity: "partial",
      notes: ["AI enrichments failed (Insufficient balance)"]
    });
    expect(p.kind).toBe("insufficient_balance");
    expect(p.showAiSettings).toBe(true);
  });
});
