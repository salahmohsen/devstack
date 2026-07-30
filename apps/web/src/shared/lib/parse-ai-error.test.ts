import { describe, expect, it } from "vitest";

import { parseAiError, presentAiError } from "./parse-ai-error";

const OPENCODE_BALANCE = `Hub agent error (500): {"message":"Insufficient balance. Manage your billing here: https://opencode.ai/workspace/wrk_x/billing","name":"AI_APICallError","stack":"AI_APICallError: Insufficient balance\\n    at file:///app/...","url":"https://opencode.ai/zen/go/v1/chat/completions","statusCode":401}`;

describe("parseAiError", () => {
  it("classifies OpenCode insufficient balance with billing URL", () => {
    const p = parseAiError(OPENCODE_BALANCE);
    expect(p.kind).toBe("insufficient_balance");
    expect(p.variant).toBe("warning");
    expect(p.title).toBe("Provider out of credits");
    expect(p.billingUrl).toContain("opencode.ai");
    expect(p.billingUrl).toContain("/billing");
    expect(p.showAiSettings).toBe(true);
    expect(p.description).not.toMatch(/file:\/\//);
    expect(p.description).not.toMatch(/AI_APICallError/);
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
