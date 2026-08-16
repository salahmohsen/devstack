import { type UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import { findHubApprovalId, withApprovalRequested } from "./hub-approval-resume";
import { isHubApprovalPending, summarizeHubApproval } from "./hub-approval-summary";
import {
  findPendingProposeApplicationFromJd,
  isOpenSurfaceToolName,
  isProposeNewJobsTriageToolName,
  lastHubHitlKind,
  parseOpenSurfaceHref,
  parseProposeNewJobsTriageInput,
  parseProposeNewJobsTriageOutput
} from "./hub-tool-names";
import { rememberJdCardAction } from "./jd-card-action-memory";
import { shouldAutoResumeHubChat } from "./should-auto-resume-hub-chat";

function assistant(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", role: "assistant", parts } as UIMessage;
}

describe("triage + openSurface name matchers", () => {
  it.each([
    ["propose-new-jobs-triage", true],
    ["proposeNewJobsTriage", true],
    ["propose-application-from-jd", false]
  ] as const)("triage %s → %s", (name, expected) => {
    expect(isProposeNewJobsTriageToolName(name)).toBe(expected);
  });

  it.each([
    ["open-surface", true],
    ["openSurface", true],
    ["list-new-jobs", false]
  ] as const)("openSurface %s → %s", (name, expected) => {
    expect(isOpenSurfaceToolName(name)).toBe(expected);
  });
});

describe("parseProposeNewJobsTriageInput — multi-variable", () => {
  it("handles garbage", () => {
    expect(parseProposeNewJobsTriageInput(null)).toEqual({ track: [], dismiss: [] });
    expect(parseProposeNewJobsTriageInput("x")).toEqual({ track: [], dismiss: [] });
  });

  it("parses mixed valid/invalid rows", () => {
    const parsed = parseProposeNewJobsTriageInput({
      track: [
        { id: "1", title: "Eng", companyName: "A", matchScore: 80, reason: "fit" },
        { id: "", title: "Bad" },
        null,
        { id: "2", title: "Ops", companyName: "B" }
      ],
      dismiss: [{ id: "9", title: "X", companyName: "Y", matchScore: null }]
    });
    expect(parsed.track.map((r) => r.id)).toEqual(["1", "2"]);
    expect(parsed.dismiss).toHaveLength(1);
    expect(parsed.track[0]?.reason).toBe("fit");
  });

  it("stress: 20 track + 20 dismiss rows", () => {
    const track = Array.from({ length: 20 }, (_, i) => {
      return {
        id: `t${i}`,
        title: `T${i}`,
        companyName: `C${i}`,
        matchScore: i * 5,
        reason: `r${i}`
      };
    });
    const dismiss = Array.from({ length: 20 }, (_, i) => {
      return {
        id: `d${i}`,
        title: `D${i}`,
        companyName: `E${i}`
      };
    });
    const parsed = parseProposeNewJobsTriageInput({ track, dismiss });
    expect(parsed.track).toHaveLength(20);
    expect(parsed.dismiss).toHaveLength(20);
  });
});

describe("parseProposeNewJobsTriageOutput", () => {
  it("accepts confirm/cancel shapes", () => {
    expect(
      parseProposeNewJobsTriageOutput({
        action: "confirm",
        trackIds: ["a"],
        dismissIds: ["b"]
      })
    ).toEqual({ action: "confirm", trackIds: ["a"], dismissIds: ["b"] });
    expect(parseProposeNewJobsTriageOutput({ action: "cancel" })).toEqual({
      action: "cancel",
      trackIds: [],
      dismissIds: []
    });
    expect(parseProposeNewJobsTriageOutput({ action: "nope" })).toBeNull();
  });
});

describe("parseOpenSurfaceHref", () => {
  it("validates presence", () => {
    expect(parseOpenSurfaceHref(null)).toBeNull();
    expect(parseOpenSurfaceHref({})).toBeNull();
    expect(parseOpenSurfaceHref({ href: "  " })).toBeNull();
    expect(parseOpenSurfaceHref({ href: "/dashboard/tracked-jobs" })).toBe(
      "/dashboard/tracked-jobs"
    );
  });
});

describe("lastHubHitlKind + auto-resume — multi tool matrix", () => {
  const cases: Array<{
    name: string;
    toolName: string;
    state: string;
    expected: "client" | "approval" | null;
    resumeAfterOutput: boolean;
  }> = [
    {
      name: "triage waiting",
      toolName: "propose-new-jobs-triage",
      state: "input-available",
      expected: "client",
      resumeAfterOutput: true
    },
    {
      name: "openSurface waiting is not a user choice",
      toolName: "open-surface",
      state: "input-available",
      expected: null,
      resumeAfterOutput: true
    },
    {
      name: "hard-stop confirm waiting locks composer",
      toolName: "propose-hard-preference-change",
      state: "input-available",
      expected: "client",
      resumeAfterOutput: true
    },
    {
      name: "find-jobs-now waiting is not a user choice",
      toolName: "find-jobs-now",
      state: "input-available",
      expected: null,
      resumeAfterOutput: true
    },
    {
      name: "get-search-brief waiting is not a user choice",
      toolName: "get-search-brief",
      state: "input-available",
      expected: null,
      resumeAfterOutput: true
    },
    {
      name: "open-entity-form waiting locks composer",
      toolName: "open-entity-form",
      state: "input-available",
      expected: "client",
      resumeAfterOutput: true
    },
    {
      name: "accept package approval",
      toolName: "accept-apply-package",
      state: "approval-requested",
      expected: "approval",
      resumeAfterOutput: false
    },
    {
      name: "send outreach approval",
      toolName: "sendApplyOutreach",
      state: "approval-requested",
      expected: "approval",
      resumeAfterOutput: false
    },
    {
      name: "server list tool not hitl",
      toolName: "listNewJobs",
      state: "input-available",
      expected: null,
      resumeAfterOutput: false
    }
  ];

  it.each(cases)("$name", ({ toolName, state, expected, resumeAfterOutput }) => {
    const waiting = assistant([
      {
        type: `tool-${toolName}`,
        toolCallId: "c1",
        toolName,
        state,
        input: toolName.includes("open")
          ? { href: "/dashboard/tracked-jobs" }
          : { track: [], dismiss: [] }
      } as never
    ]);
    expect(lastHubHitlKind([waiting])).toBe(expected);

    const done = assistant([
      {
        type: `tool-${toolName}`,
        toolCallId: "c1",
        toolName,
        state: "output-available",
        output: toolName.includes("open")
          ? { ok: true, href: "/dashboard/tracked-jobs" }
          : { action: "confirm", trackIds: ["x"], dismissIds: [] }
      } as never
    ]);
    expect(shouldAutoResumeHubChat({ messages: [done] })).toBe(resumeAfterOutput);
  });

  it("does not lock the composer on a JD receipt still marked waiting", () => {
    const receipt = assistant([
      {
        type: "tool-propose-application-from-jd",
        toolCallId: "jd1",
        toolName: "propose-application-from-jd",
        state: "input-available",
        input: {
          title: "Senior Front-End Engineer",
          companyName: "Exequt",
          description: "Build UIs",
          url: "https://www.careers-page.com/exequt/job/3W3V947V"
        },
        output: { action: "package", applicationId: "app_1" }
      } as never
    ]);
    expect(lastHubHitlKind([receipt])).toBeNull();
  });

  it("does not lock when a newer JD card superseded this waiting one", () => {
    const thread = [
      assistant([
        {
          type: "tool-propose-application-from-jd",
          toolCallId: "old",
          toolName: "propose-application-from-jd",
          state: "input-available",
          input: {
            title: "Senior Frontend Engineer",
            companyName: "Zeal",
            description: "About Zeal",
            url: "https://zeal.breezy.hr/p/5ef2a1d2ba3a"
          }
        } as never,
        {
          type: "tool-propose-application-from-jd",
          toolCallId: "new",
          toolName: "propose-application-from-jd",
          state: "input-available",
          input: {
            title: "Senior Front-End Engineer",
            companyName: "Exequt",
            description: "Build UIs",
            url: "https://www.careers-page.com/exequt/job/3W3V947V"
          }
        } as never
      ])
    ];
    expect(lastHubHitlKind(thread)).toBe("client");
    expect(findPendingProposeApplicationFromJd(thread)?.toolCallId).toBe("new");
  });

  it("does not lock when the waiting JD card already has a recalled receipt", () => {
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
    rememberJdCardAction("jd-recalled", "package");
    const waiting = assistant([
      {
        type: "tool-propose-application-from-jd",
        toolCallId: "jd-recalled",
        toolName: "propose-application-from-jd",
        state: "input-available",
        input: {
          title: "Senior Front-End Engineer",
          companyName: "Exequt",
          description: "Build UIs",
          url: "https://www.careers-page.com/exequt/job/3W3V947V"
        }
      } as never
    ]);
    expect(lastHubHitlKind([waiting])).toBeNull();
    expect(findPendingProposeApplicationFromJd([waiting])).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("summarizeHubApproval", () => {
  it("generateApplyPackage includes applicationId and no raw JSON", () => {
    const summary = summarizeHubApproval("generateApplyPackage", { applicationId: "app_1" });
    expect(summary.kind).toBe("approval");
    expect(summary.body).toContain("app_1");
    expect(summary.body).not.toContain("{");
  });

  it("send-apply-outreach is confirm with Send primary", () => {
    const summary = summarizeHubApproval("send-apply-outreach", {});
    expect(summary.kind).toBe("confirm");
    expect(summary.primaryLabel).toBe("Send");
  });

  it("send-mail-reply uses subject and omits bodyText", () => {
    const summary = summarizeHubApproval("send-mail-reply", {
      subject: "Thanks",
      bodyText: "SECRET"
    });
    expect(summary.body).toContain("Thanks");
    expect(summary.body).not.toContain("SECRET");
  });

  it("create-application includes title and company", () => {
    const summary = summarizeHubApproval("create-application", {
      title: "Engineer",
      companyName: "Acme"
    });
    expect(summary.body).toContain("Engineer");
    expect(summary.body).toContain("Acme");
  });

  it("unknown tool uses fallback title without JSON", () => {
    const summary = summarizeHubApproval("some-unknown-tool", { foo: "bar" });
    expect(summary.title).toBe("Approval required");
    expect(summary.body).not.toContain("{");
    expect(summary.body).not.toContain("foo");
  });
});

describe("isHubApprovalPending", () => {
  it("is true when approval exists and is undecided", () => {
    expect(isHubApprovalPending({ approval: {}, status: { type: "running" } })).toBe(true);
  });

  it("is true for requires-action even without approval object", () => {
    expect(isHubApprovalPending({ status: { type: "requires-action" } })).toBe(true);
  });

  it("is true when Mastra omits approval and the part has no result yet", () => {
    expect(isHubApprovalPending({ status: { type: "running" }, result: undefined })).toBe(true);
    expect(isHubApprovalPending({})).toBe(true);
  });

  it("is false after the user decides", () => {
    expect(
      isHubApprovalPending({ approval: { approved: true }, status: { type: "running" } })
    ).toBe(false);
    expect(isHubApprovalPending({ approval: { resolution: "done" } })).toBe(false);
  });

  it("is false when the tool already has a result or finished", () => {
    expect(isHubApprovalPending({ result: { ok: true }, status: { type: "running" } })).toBe(false);
    expect(isHubApprovalPending({ status: { type: "complete" } })).toBe(false);
    expect(isHubApprovalPending({ status: { type: "incomplete" } })).toBe(false);
  });
});

describe("findHubApprovalId + withApprovalRequested", () => {
  it("reads approval.id off the tool part", () => {
    const messages = [
      assistant([
        {
          type: "tool-generateApplyPackage",
          toolCallId: "tc1",
          toolName: "generateApplyPackage",
          state: "approval-requested",
          approval: { id: "run::tc1" }
        } as never
      ])
    ];
    expect(findHubApprovalId(messages, "tc1")).toBe("run::tc1");
  });

  it("builds runId::toolCallId from data-tool-call-approval", () => {
    const messages = [
      assistant([
        {
          type: "data-tool-call-approval",
          data: { state: "data-tool-call-approval", runId: "run-9", toolCallId: "tc9" }
        } as never
      ])
    ];
    expect(findHubApprovalId(messages, "tc9")).toBe("run-9::tc9");
  });

  it("lifts input-available to approval-requested so addToolApprovalResponse matches", () => {
    const messages = [
      assistant([
        {
          type: "tool-generateApplyPackage",
          toolCallId: "tc1",
          toolName: "generateApplyPackage",
          state: "input-available",
          input: { applicationId: "app_1" }
        } as never
      ])
    ];
    const next = withApprovalRequested(messages, "tc1", "run::tc1");
    const part = next[0]?.parts[0] as { state?: string; approval?: { id?: string } };
    expect(part.state).toBe("approval-requested");
    expect(part.approval?.id).toBe("run::tc1");
  });
});
