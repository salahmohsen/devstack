import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { summarizeHubApproval } from "./hub-approval-summary";
import {
  isOpenSurfaceToolName,
  isProposeNewJobsTriageToolName,
  lastHubHitlKind,
  parseOpenSurfaceHref,
  parseProposeNewJobsTriageInput,
  parseProposeNewJobsTriageOutput
} from "./hub-tool-names";
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
      name: "openSurface waiting",
      toolName: "open-surface",
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
