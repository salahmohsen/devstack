import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import {
  hideHubAssistantTextAfterIndex,
  lastAssistantMessageIsCompleteWithClientResumeTools,
  shouldAutoResumeHubChat
} from "./should-auto-resume-hub-chat";

function assistant(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", role: "assistant", parts } as UIMessage;
}

function user(text: string): UIMessage {
  return { id: "u1", role: "user", parts: [{ type: "text", text }] } as UIMessage;
}

function getSearchBriefComplete(): UIMessage["parts"][number] {
  return {
    type: "tool-get-search-brief",
    toolCallId: "b1",
    toolName: "get-search-brief",
    state: "output-available",
    output: { markdown: "## Target jobs", rebuilt: true }
  } as never;
}

describe("lastAssistantMessageIsCompleteWithClientResumeTools", () => {
  it("returns false for text-only answers (capability questions)", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [assistant([{ type: "text", text: "I can help with stacks and CRM." }])]
      })
    ).toBe(false);
  });

  it("returns false when only server CRM tools completed (no providerExecuted)", () => {
    // Regression: bare lastAssistantMessageIsCompleteWithToolCalls was true here
    // and caused infinite re-submit after every multi-step server tool chain.
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-listOpenApplications",
              toolCallId: "t1",
              toolName: "listOpenApplications",
              state: "output-available",
              output: { applications: [] }
            } as never,
            { type: "text", text: "You have no open applications." }
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns false while propose-from-jd is waiting for the user", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "input-available",
              input: { title: "Eng", companyName: "Acme", description: "…" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after the user saves a JD proposal", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "output-available",
              output: { action: "save", applicationId: "app-1" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after triage confirm — the card already wrote track/dismiss", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-propose-new-jobs-triage",
              toolCallId: "t3",
              toolName: "propose-new-jobs-triage",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
            } as never,
            { type: "step-start" }
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns false once server tools already ran after client confirm", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-propose-new-jobs-triage",
              toolCallId: "t3",
              toolName: "propose-new-jobs-triage",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
            } as never,
            { type: "step-start" },
            {
              type: "tool-trackJob",
              toolCallId: "t4",
              toolName: "trackJob",
              state: "output-available",
              output: { ok: true, applicationId: "a" }
            } as never,
            { type: "text", text: "Tracked 1 job.", state: "done" }
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after confirm even when premature final text followed the card", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-propose-new-jobs-triage",
              toolCallId: "t3",
              toolName: "propose-new-jobs-triage",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: ["b"] }
            } as never,
            { type: "step-start" },
            {
              type: "text",
              text: "No changes made. Awaiting your confirmation.",
              state: "done"
            }
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not re-resume after a failed continuation that already hit tool-step limit", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-propose-new-jobs-triage",
              toolCallId: "t3",
              toolName: "propose-new-jobs-triage",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: ["b"] }
            } as never,
            { type: "step-start" },
            {
              type: "text",
              text: "I couldn’t run the tools because the tool-step limit was reached.",
              state: "done"
            }
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns false for cancel when final text already followed", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            { type: "step-start" },
            {
              type: "tool-propose-new-jobs-triage",
              toolCallId: "t3",
              toolName: "propose-new-jobs-triage",
              state: "output-available",
              output: { action: "cancel", trackIds: [], dismissIds: [] }
            } as never,
            { type: "step-start" },
            { type: "text", text: "Cancelled.", state: "done" }
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after user completes propose-new-jobs-triage", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-new-jobs-triage",
              toolCallId: "t3",
              toolName: "propose-new-jobs-triage",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns true after open-surface client complete", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-open-surface",
              toolCallId: "t4",
              toolName: "open-surface",
              state: "output-available",
              output: { ok: true, href: "/dashboard/tracked-jobs" }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });

  it("does not resume while wrap-up text after find-jobs-now is still streaming", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-find-jobs-now",
              toolCallId: "f1",
              toolName: "find-jobs-now",
              state: "output-available",
              output: { enqueued: true, ingestTriggered: true, seats: 42, reason: "ok" }
            } as never,
            { type: "step-start" },
            {
              type: "text",
              text: "Search is queued · 42 seats.",
              state: "streaming"
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after find-jobs-now already wrote wrap-up text", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-find-jobs-now",
              toolCallId: "f1",
              toolName: "find-jobs-now",
              state: "output-available",
              output: { enqueued: true, ingestTriggered: true, seats: 42, reason: "ok" }
            } as never,
            { type: "step-start" },
            { type: "text", text: "Search is queued · 42 seats." }
          ])
        ]
      })
    ).toBe(false);
  });

  it("returns true after open-entity-form save or cancel", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-open-entity-form",
              toolCallId: "t5",
              toolName: "open-entity-form",
              state: "output-available",
              output: { ok: true, kind: "experience", saved: true, id: "exp_1" }
            } as never
          ])
        ]
      })
    ).toBe(true);
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-openEntityForm",
              toolCallId: "t6",
              toolName: "openEntityForm",
              state: "output-available",
              output: { ok: true, kind: "project", saved: false, cancelled: true }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });

  it("does not resume while an evidence card is pending", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "input-available",
              input: {
                kind: "project",
                patch: { title: "Dev-Hub" },
                currentMarkdown: "",
                proposedMarkdown: "# Project: Dev-Hub"
              }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after a same-entity leftover following a user cancel", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          user("tweak Dev-Hub"),
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "output-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend"
              },
              output: { action: "cancel", kind: "project", id: "prj_1" }
            } as never,
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e2",
              toolName: "propose-evidence-change",
              state: "output-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first"
              },
              output: { action: "cancel", kind: "project", id: "prj_1" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after a same-entity evidence re-propose is auto-cancelled", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          user("tweak Dev-Hub"),
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "output-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend"
              },
              output: { action: "confirm", kind: "project", id: "prj_1" }
            } as never,
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e2",
              toolName: "propose-evidence-change",
              state: "output-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first"
              },
              output: { action: "cancel", kind: "project", id: "prj_1" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("resumes after evidence confirm so the next interview can run", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "output-available",
              output: { action: "confirm", kind: "project", id: "prj_1" }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });

  it("resumes after evidence cancel so the agent can ask about more edits", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-proposeEvidenceChange",
              toolCallId: "e2",
              toolName: "proposeEvidenceChange",
              state: "output-available",
              output: { action: "cancel", kind: "experience", id: "exp_raya" }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });

  it("does not resume while wrap-up text after evidence confirm is still streaming", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "output-available",
              output: { action: "confirm", kind: "project" }
            } as never,
            { type: "step-start" },
            {
              type: "text",
              text: "Next, the RAYA experience.",
              state: "streaming"
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after evidence confirm once interview text already streamed", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "output-available",
              output: { action: "confirm", kind: "project" }
            } as never,
            { type: "step-start" },
            { type: "text", text: "Next, the RAYA experience.", state: "done" }
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume after the user dismisses a JD proposal", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "output-available",
              output: { action: "dismiss" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("ignores providerExecuted client-named tools (server already ran them)", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "t2",
              toolName: "propose-application-from-jd",
              state: "output-available",
              providerExecuted: true,
              output: { action: "dismiss" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not resume save even when premature awaiting text followed", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "old",
              toolName: "propose-application-from-jd",
              state: "output-available",
              output: { action: "save" }
            } as never,
            { type: "step-start" },
            { type: "text", text: "No changes made. Awaiting your confirmation." }
          ])
        ]
      })
    ).toBe(false);
  });

  it("stops after create-application already ran following save", () => {
    expect(
      lastAssistantMessageIsCompleteWithClientResumeTools({
        messages: [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "old",
              toolName: "propose-application-from-jd",
              state: "output-available",
              output: { action: "save" }
            } as never,
            { type: "step-start" },
            {
              type: "tool-create-application",
              toolCallId: "c1",
              toolName: "create-application",
              state: "output-available",
              output: { ok: true, applicationId: "x" }
            } as never,
            { type: "text", text: "Saved.", state: "done" }
          ])
        ]
      })
    ).toBe(false);
  });
});

describe("hideHubAssistantTextAfterIndex", () => {
  it("hides text after a waiting open-entity-form card", () => {
    const parts = [
      {
        type: "tool-open-entity-form",
        toolName: "open-entity-form",
        state: "input-available"
      },
      { type: "text", text: "Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("hides text after a waiting triage card", () => {
    const parts = [
      { type: "step-start" },
      {
        type: "tool-proposeNewJobsTriage",
        toolName: "proposeNewJobsTriage",
        state: "input-available"
      },
      { type: "text", text: "Triage proposal ready — awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(1);
  });

  it("hides text after a waiting assistant-ui tool-call card", () => {
    const parts = [
      { type: "tool-call", toolName: "proposeNewJobsTriage", status: { type: "requires-action" } },
      { type: "text", text: "Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("keeps intro text before the card (hide starts at the card)", () => {
    const parts = [
      { type: "text", text: "Checking new jobs." },
      {
        type: "tool-propose-new-jobs-triage",
        toolName: "propose-new-jobs-triage",
        state: "input-available"
      },
      { type: "text", text: "Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(1);
  });

  it("still hides premature wrap-up after confirm until server tools run", () => {
    const parts = [
      {
        type: "tool-propose-new-jobs-triage",
        toolName: "propose-new-jobs-triage",
        state: "output-available",
        output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
      },
      { type: "text", text: "No changes made. Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("shows the real summary after trackJob", () => {
    const parts = [
      {
        type: "tool-propose-new-jobs-triage",
        toolName: "propose-new-jobs-triage",
        state: "output-available",
        output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
      },
      {
        type: "tool-trackJob",
        toolName: "trackJob",
        state: "output-available",
        output: { ok: true }
      },
      { type: "text", text: "Tracked 1 job." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBeNull();
  });

  it("does not hide a normal text-only reply", () => {
    expect(
      hideHubAssistantTextAfterIndex([{ type: "text", text: "I can help with stacks." }])
    ).toBeNull();
  });

  it("hides leftover wrap-up after get-search-brief", () => {
    const parts = [
      {
        type: "tool-get-search-brief",
        toolName: "get-search-brief",
        state: "output-available",
        output: { rebuilt: false, markdown: "## Target jobs" }
      },
      { type: "text", text: "Search brief is current." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("shows a real answer after get-search-brief", () => {
    const parts = [
      {
        type: "tool-get-search-brief",
        toolName: "get-search-brief",
        state: "output-available",
        output: { rebuilt: true, markdown: "## Target jobs" }
      },
      { type: "text", text: "The intro was dropped in the last rewrite of the skills section." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBeNull();
  });

  it("hides wrap-up after find-jobs-now — the tool UI already reports queued", () => {
    const parts = [
      {
        type: "tool-find-jobs-now",
        toolName: "find-jobs-now",
        state: "output-available",
        output: { enqueued: true, seats: 42, reason: "ok" }
      },
      { type: "text", text: "Search is queued · 42 seats." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("hides text after a waiting hard-stop confirm card", () => {
    const parts = [
      {
        type: "tool-propose-hard-preference-change",
        toolName: "propose-hard-preference-change",
        state: "input-available"
      },
      { type: "text", text: "Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("still hides after a completed hard-stop card", () => {
    const parts = [
      {
        type: "tool-propose-hard-preference-change",
        toolName: "propose-hard-preference-change",
        state: "output-available",
        output: { action: "confirm", patch: { salaryMin: 45000 } }
      },
      { type: "text", text: "Hard-stops updated." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("hides text after a waiting evidence card", () => {
    const parts = [
      {
        type: "tool-propose-evidence-change",
        toolName: "propose-evidence-change",
        state: "input-available"
      },
      { type: "text", text: "Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("hides text after a waiting camelCase evidence card", () => {
    const parts = [
      {
        type: "tool-proposeEvidenceChange",
        toolName: "proposeEvidenceChange",
        state: "input-available"
      },
      { type: "text", text: "Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("does not hide later interview prose after evidence confirm", () => {
    const parts = [
      {
        type: "tool-propose-evidence-change",
        toolName: "propose-evidence-change",
        state: "output-available",
        output: { action: "confirm", kind: "project", id: "prj_1" }
      },
      { type: "text", text: "Next, let's talk about the RAYA experience." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBeNull();
  });

  it("does not hide interview text after evidence cancel", () => {
    const parts = [
      {
        type: "tool-propose-evidence-change",
        toolName: "propose-evidence-change",
        state: "output-available",
        output: { action: "cancel", kind: "project" }
      },
      { type: "text", text: "Want more edits on Dev-Hub before we do RAYA?" }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBeNull();
  });

  it("does not hide later prose after evidence confirm even if premature HITL copy appears", () => {
    const parts = [
      {
        type: "tool-propose-evidence-change",
        toolName: "propose-evidence-change",
        state: "output-available",
        output: { action: "confirm", kind: "project" }
      },
      { type: "text", text: "No changes made. Awaiting your confirmation." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBeNull();
  });

  it("hides the Today letter after openDailyBrief", () => {
    const parts = [
      {
        type: "tool-open-daily-brief",
        toolName: "open-daily-brief",
        state: "output-available",
        output: { opened: true, markdown: "# Today\n\nHello" }
      },
      { type: "text", text: "# Today\n\nHello" }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBe(0);
  });

  it("shows inspect / CRM speech after a packed Today letter", () => {
    const parts = [
      {
        type: "tool-open-daily-brief",
        toolName: "open-daily-brief",
        state: "output-available",
        output: { opened: true, markdown: "# Today\n\nHello" }
      },
      {
        type: "tool-open-entity-inspect",
        toolName: "open-entity-inspect",
        state: "output-available",
        output: { ok: true, kind: "experience", opened: true }
      },
      { type: "text", text: "Ment'ech is open on the right. Trivelta is still applied — quiet." }
    ];
    expect(hideHubAssistantTextAfterIndex(parts)).toBeNull();
  });

  it("hides processor feedback that leaked into chat", () => {
    expect(
      hideHubAssistantTextAfterIndex([
        {
          type: "text",
          text: "getDailyBrief already returned facts. Write the Today letter in the current voice from those facts, then call openDailyBrief({ markdown })."
        }
      ])
    ).toBe(-1);
  });
});

describe("shouldAutoResumeHubChat", () => {
  it("resumes after get-search-brief only for section / what-changed questions", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [user("where is the intro?"), assistant([getSearchBriefComplete()])]
      })
    ).toBe(true);
    expect(
      shouldAutoResumeHubChat({
        messages: [
          user("what happened to the who paragraph?"),
          assistant([getSearchBriefComplete()])
        ]
      })
    ).toBe(true);
  });

  it("does not resume after get-search-brief on identity / rules / show-the-brief", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [user("what am I looking for?"), assistant([getSearchBriefComplete()])]
      })
    ).toBe(false);
    expect(
      shouldAutoResumeHubChat({
        messages: [user("show my brief"), assistant([getSearchBriefComplete()])]
      })
    ).toBe(false);
    expect(
      shouldAutoResumeHubChat({
        messages: [user("what are my job rules?"), assistant([getSearchBriefComplete()])]
      })
    ).toBe(false);
    expect(
      shouldAutoResumeHubChat({
        messages: [user("what jobs should I take?"), assistant([getSearchBriefComplete()])]
      })
    ).toBe(false);
  });

  it("does not resume after get-search-brief once an answer streamed", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          user("where is the intro?"),
          assistant([
            getSearchBriefComplete(),
            { type: "step-start" },
            {
              type: "text",
              text: "The intro was removed when the skills section was rewritten.",
              state: "done"
            }
          ])
        ]
      })
    ).toBe(false);
  });

  it("resumes after evidence confirm via sendAutomaticallyWhen helper", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolCallId: "e1",
              toolName: "propose-evidence-change",
              state: "output-available",
              output: { action: "confirm", kind: "project" }
            } as never
          ])
        ]
      })
    ).toBe(true);
  });

  it("does not resume after hard-stop confirm — card already wrote", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          assistant([
            {
              type: "tool-propose-hard-preference-change",
              toolCallId: "h1",
              toolName: "propose-hard-preference-change",
              state: "output-available",
              output: { action: "confirm", patch: { salaryMin: 45000 } }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not auto-resume after a plain capability answer", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [assistant([{ type: "text", text: "I coordinate stacks, mail, and CRM." }])]
      })
    ).toBe(false);
  });

  it("does not auto-resume after server tool multi-step finishes", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          assistant([
            {
              type: "tool-listExperiences",
              toolCallId: "e1",
              state: "output-available",
              output: { items: [] }
            } as never,
            { type: "text", text: "No experiences yet." }
          ])
        ]
      })
    ).toBe(false);
  });

  it("does not auto-resume after a JD package choice", () => {
    expect(
      shouldAutoResumeHubChat({
        messages: [
          assistant([
            {
              type: "tool-proposeApplicationFromJd",
              toolCallId: "p1",
              toolName: "proposeApplicationFromJd",
              state: "output-available",
              output: { action: "package", applicationId: "app-1" }
            } as never
          ])
        ]
      })
    ).toBe(false);
  });
});
