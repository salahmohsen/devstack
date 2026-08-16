import { afterEach, describe, expect, it } from "vitest";

import {
  clearEntityFormRequest,
  dismissEntityFormCalls,
  getEntityFormHostState,
  isEntityFormCallDismissed,
  requestEntityForm,
  resetEntityFormHostForTests
} from "./entity-form-host-store";

describe("entity form host dismiss", () => {
  afterEach(() => {
    resetEntityFormHostForTests();
  });

  it("does not remount a call the user already dismissed", () => {
    requestEntityForm({
      requestId: "tc1",
      kind: "experience",
      id: "missing",
      toolCallId: "tc1",
      toolName: "open-entity-form"
    });
    expect(getEntityFormHostState().request?.toolCallId).toBe("tc1");

    dismissEntityFormCalls(["tc1", "tc0"]);
    expect(getEntityFormHostState().request).toBeNull();
    expect(isEntityFormCallDismissed("tc1")).toBe(true);
    expect(isEntityFormCallDismissed("tc0")).toBe(true);

    requestEntityForm({
      requestId: "tc1",
      kind: "experience",
      id: "missing",
      toolCallId: "tc1",
      toolName: "open-entity-form"
    });
    expect(getEntityFormHostState().request).toBeNull();
  });

  it("still opens a later tool call after dismiss", () => {
    dismissEntityFormCalls(["tc1"]);
    requestEntityForm({
      requestId: "tc2",
      kind: "project",
      id: "proj_1",
      toolCallId: "tc2",
      toolName: "open-entity-form"
    });
    expect(getEntityFormHostState().request?.toolCallId).toBe("tc2");
    clearEntityFormRequest("tc2");
    expect(getEntityFormHostState().request).toBeNull();
  });
});
