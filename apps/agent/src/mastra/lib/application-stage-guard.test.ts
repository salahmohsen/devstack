import { describe, expect, it } from "vitest";

import { assertStageAllowedForHubTool } from "./application-stage-guard";

describe("assertStageAllowedForHubTool", () => {
  it("rejects applied", () => {
    expect(assertStageAllowedForHubTool("applied")).toEqual({
      ok: false,
      code: "APPLIED_VIA_SEND_ONLY"
    });
  });

  it("allows screening", () => {
    expect(assertStageAllowedForHubTool("screening")).toEqual({
      ok: true,
      stage: "screening"
    });
  });

  it("allows saved interview offer", () => {
    expect(assertStageAllowedForHubTool("saved")).toEqual({ ok: true, stage: "saved" });
    expect(assertStageAllowedForHubTool("interview")).toEqual({
      ok: true,
      stage: "interview"
    });
    expect(assertStageAllowedForHubTool("offer")).toEqual({ ok: true, stage: "offer" });
  });

  it("rejects unknown stages", () => {
    expect(assertStageAllowedForHubTool("rejected")).toEqual({
      ok: false,
      code: "INVALID_STAGE"
    });
  });
});
