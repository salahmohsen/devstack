import { type UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import {
  cancelOutputForHubHitl,
  sealHubApprovalCards,
  sealWaitingHubHitlOnRemount,
  staleWaitingHubConfirmCards,
  toolCallIsOnLatestAssistant,
  waitingHubApprovalCards,
  waitingHubConfirmCards
} from "./cancel-stale-hub-hitl";
import { lastHubHitlKind } from "./hub-tool-names";
import { rememberTriageAction } from "./hub-triage-action-memory";

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

  it("does not treat a recalled cancelled triage as waiting", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      }
    });
    rememberTriageAction("old", "cancel");
    const messages = [message("a1", [waitingTriage])];
    expect(waitingHubConfirmCards(messages)).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("seals every waiting Confirm before first paint (including latest)", () => {
    const waitingJd = {
      type: "tool-proposeApplicationFromJd",
      toolCallId: "jd-latest",
      toolName: "proposeApplicationFromJd",
      state: "input-available",
      input: { title: "Eng", companyName: "Acme", description: "Build", url: null }
    } as never;
    const messages = [message("a1", [waitingTriage]), message("a2", [waitingJd])];
    const sealed = sealWaitingHubHitlOnRemount(messages);
    expect(sealed.cancelledIds).toEqual(["old", "jd-latest"]);
    expect(waitingHubConfirmCards(sealed.messages)).toEqual([]);
    const latestPart = sealed.messages[1]?.parts?.[0] as {
      state?: string;
      output?: { action?: string };
    };
    expect(latestPart.state).toBe("output-available");
    expect(latestPart.output).toEqual({ action: "dismiss" });
  });

  describe("approval cards", () => {
    const persistedApproval = {
      type: "tool-generate-apply-package",
      toolCallId: "gen-1",
      toolName: "generate-apply-package",
      state: "input-available",
      input: { applicationId: "app-1" }
    } as never;
    const liveApproval = {
      type: "tool-send-mail-reply",
      toolCallId: "send-1",
      toolName: "send-mail-reply",
      state: "approval-requested",
      approval: { id: "run-1::send-1" },
      input: {}
    } as never;

    it("finds persisted and live approvals but not finished ones", () => {
      const done = {
        ...(persistedApproval as object),
        toolCallId: "done",
        state: "output-available"
      } as never;
      const messages = [message("a1", [persistedApproval, done]), message("a2", [liveApproval])];
      expect(waitingHubApprovalCards(messages).map((card) => card.toolCallId)).toEqual([
        "gen-1",
        "send-1"
      ]);
    });

    it("seals approvals so a reload cannot lock the composer", () => {
      const messages = [message("a1", [persistedApproval])];
      expect(lastHubHitlKind(messages)).toBe("approval");
      const sealed = sealWaitingHubHitlOnRemount(messages);
      expect(sealed.cancelledIds).toEqual(["gen-1"]);
      expect(lastHubHitlKind(sealed.messages)).toBeNull();
      const part = sealed.messages[0]?.parts[0] as {
        state: string;
        approval: { approved: boolean };
      };
      expect(part.state).toBe("output-denied");
      expect(part.approval.approved).toBe(false);
    });

    it("keeps a live approval id when denying locally", () => {
      const sealed = sealHubApprovalCards([message("a1", [liveApproval])]);
      const part = sealed.messages[0]?.parts[0] as { approval: { id: string } };
      expect(part.approval.id).toBe("run-1::send-1");
      expect(sealHubApprovalCards([message("a1", [waitingMail])]).cancelledIds).toEqual([]);
    });
  });
});
