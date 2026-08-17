import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import {
  cancelOutputForHubHitl,
  staleWaitingHubConfirmCards,
  toolCallIsOnLatestAssistant,
  waitingHubConfirmCards
} from "./cancel-stale-hub-hitl";

function message(id: string, parts: UIMessage["parts"]): UIMessage {
  return { id, role: "assistant", parts } as UIMessage;
}

const waitingTriage = {
  type: "tool-propose-new-jobs-triage",
  toolCallId: "old",
  toolName: "propose-new-jobs-triage",
  state: "input-available",
  input: { track: [], dismiss: [] }
} as never;

const waitingMail = {
  type: "tool-propose-mail-crm-change",
  toolCallId: "latest",
  toolName: "propose-mail-crm-change",
  state: "input-available",
  input: {
    companyName: "Trivelta",
    title: "Engineer",
    mailId: "m1",
    intent: "track_applied"
  }
} as never;

describe("cancel stale hub HITL", () => {
  it("keeps the latest waiting Confirm and marks older ones stale", () => {
    const messages = [message("a1", [waitingTriage]), message("a2", [waitingMail])];
    expect(waitingHubConfirmCards(messages).map((row) => row.toolCallId)).toEqual([
      "old",
      "latest"
    ]);
    expect(staleWaitingHubConfirmCards(messages).map((row) => row.toolCallId)).toEqual(["old"]);
  });

  it("returns a cancel payload for mail CRM cards", () => {
    expect(cancelOutputForHubHitl("propose-mail-crm-change")).toEqual({ action: "cancel" });
    expect(cancelOutputForHubHitl("propose-new-jobs-triage")).toEqual({
      action: "cancel",
      trackIds: [],
      dismissIds: []
    });
  });

  it("cancels a leftover inspect remount and leaves the latest message's call", () => {
    const waitingInspect = {
      type: "tool-open-entity-inspect",
      toolCallId: "old-inspect",
      toolName: "open-entity-inspect",
      state: "input-available",
      input: { kind: "application", id: "app-1" }
    } as never;
    const messages = [message("a1", [waitingInspect]), message("a2", [waitingMail])];
    expect(staleWaitingHubConfirmCards(messages).map((row) => row.toolCallId)).toEqual([
      "old-inspect"
    ]);
    expect(cancelOutputForHubHitl("open-entity-inspect")).toEqual({
      ok: true,
      kind: "project",
      opened: false
    });
    expect(toolCallIsOnLatestAssistant(messages, "old-inspect")).toBe(false);
    expect(toolCallIsOnLatestAssistant(messages, "latest")).toBe(true);
  });
});
