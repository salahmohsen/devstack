import { describe, expect, it } from "vitest";

import { extractMastraWorkflowStreamError } from "#@/application/mastra-workflow-stream-error";

describe("extractMastraWorkflowStreamError", () => {
  it("reads workflow-step-error payload.message", () => {
    expect(
      extractMastraWorkflowStreamError({
        type: "workflow-step-error",
        payload: {
          stepName: "rewrite-experiences",
          error: { message: "Invalid JSON response" }
        }
      })
    ).toMatch(/Invalid JSON/);
  });

  it("reads workflow-failed string error", () => {
    expect(
      extractMastraWorkflowStreamError({
        type: "workflow-failed",
        payload: { error: "missing rewrite for experience e2" }
      })
    ).toMatch(/missing rewrite/);
  });

  it("returns null for success step without error", () => {
    expect(
      extractMastraWorkflowStreamError({
        type: "workflow-step-result",
        payload: { status: "success", output: {} }
      })
    ).toBeNull();
  });
});
