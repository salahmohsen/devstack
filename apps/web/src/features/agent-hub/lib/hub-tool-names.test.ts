import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import {
  findPendingProposeApplicationFromJd,
  hubToolNameFromPart,
  isGenerateApplyPackageToolName,
  isHubToolUiPart,
  isProposeApplicationFromJdToolName,
  parseProposeApplicationFromJdInput,
  parseProposeApplicationFromJdOutputAction
} from "./hub-tool-names";

function assistant(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", role: "assistant", parts } as UIMessage;
}

describe("hubToolNameFromPart", () => {
  it("prefers an explicit toolName", () => {
    expect(
      hubToolNameFromPart({
        type: "tool-propose-application-from-jd",
        toolName: "proposeApplicationFromJd"
      })
    ).toBe("proposeApplicationFromJd");
  });

  it("strips the tool- prefix (keeps inner hyphens)", () => {
    expect(hubToolNameFromPart({ type: "tool-propose-application-from-jd" })).toBe(
      "propose-application-from-jd"
    );
    expect(hubToolNameFromPart({ type: "tool-proposeApplicationFromJd" })).toBe(
      "proposeApplicationFromJd"
    );
  });

  it("returns a fallback for dynamic-tool without toolName", () => {
    expect(hubToolNameFromPart({ type: "dynamic-tool" })).toBe("tool");
  });
});

describe("isProposeApplicationFromJdToolName / isGenerateApplyPackageToolName", () => {
  it.each([
    ["propose-application-from-jd", true],
    ["proposeApplicationFromJd", true],
    ["generate-apply-package", false],
    ["tool", false]
  ] as const)("propose name %s → %s", (name, expected) => {
    expect(isProposeApplicationFromJdToolName(name)).toBe(expected);
  });

  it.each([
    ["generate-apply-package", true],
    ["generateApplyPackage", true],
    ["propose-application-from-jd", false]
  ] as const)("package name %s → %s", (name, expected) => {
    expect(isGenerateApplyPackageToolName(name)).toBe(expected);
  });
});

describe("isHubToolUiPart", () => {
  it("matches static and dynamic tool parts only", () => {
    expect(isHubToolUiPart({ type: "tool-x" })).toBe(true);
    expect(isHubToolUiPart({ type: "dynamic-tool" })).toBe(true);
    expect(isHubToolUiPart({ type: "text" })).toBe(false);
    expect(isHubToolUiPart({ type: "step-start" })).toBe(false);
  });
});

describe("parseProposeApplicationFromJdInput", () => {
  it("returns empty required fields for non-objects", () => {
    expect(parseProposeApplicationFromJdInput(null)).toEqual({
      title: "",
      companyName: "",
      description: ""
    });
    expect(parseProposeApplicationFromJdInput("x")).toEqual({
      title: "",
      companyName: "",
      description: ""
    });
  });

  it("keeps strings and numeric matchScore, nulls the rest", () => {
    expect(
      parseProposeApplicationFromJdInput({
        title: "Eng",
        companyName: "Acme",
        description: "Build things",
        url: "https://jobs.example/1",
        matchScore: 82,
        notes: 12
      })
    ).toEqual({
      title: "Eng",
      companyName: "Acme",
      description: "Build things",
      url: "https://jobs.example/1",
      applyUrl: null,
      location: null,
      matchScore: 82,
      notes: null
    });
  });
});

describe("parseProposeApplicationFromJdOutputAction", () => {
  it.each(["package", "save", "dismiss"] as const)("accepts %s", (action) => {
    expect(parseProposeApplicationFromJdOutputAction({ action })).toBe(action);
  });

  it("rejects unknown shapes", () => {
    expect(parseProposeApplicationFromJdOutputAction({ action: "apply" })).toBeNull();
    expect(parseProposeApplicationFromJdOutputAction(null)).toBeNull();
    expect(parseProposeApplicationFromJdOutputAction("save")).toBeNull();
  });
});

describe("findPendingProposeApplicationFromJd", () => {
  it("returns the latest pending kebab or camel propose part", () => {
    expect(
      findPendingProposeApplicationFromJd([
        assistant([
          {
            type: "tool-proposeApplicationFromJd",
            toolCallId: "old",
            toolName: "proposeApplicationFromJd",
            state: "output-available",
            output: { action: "save" }
          } as never,
          {
            type: "tool-propose-application-from-jd",
            toolCallId: "new",
            state: "input-available",
            input: { title: "Eng", companyName: "Acme", description: "…" }
          } as never
        ])
      ])
    ).toEqual({
      toolCallId: "new",
      toolName: "propose-application-from-jd",
      input: {
        title: "Eng",
        companyName: "Acme",
        description: "…",
        url: null,
        applyUrl: null,
        location: null,
        matchScore: null,
        notes: null
      }
    });
  });

  it("treats call/partial-call as still waiting", () => {
    expect(
      findPendingProposeApplicationFromJd([
        assistant([
          {
            type: "tool-propose-application-from-jd",
            toolCallId: "live",
            toolName: "propose-application-from-jd",
            state: "call",
            input: { title: "Eng", companyName: "Acme", description: "d" }
          } as never
        ])
      ])?.toolCallId
    ).toBe("live");
  });

  it("skips completed propose parts", () => {
    expect(
      findPendingProposeApplicationFromJd([
        assistant([
          {
            type: "tool-propose-application-from-jd",
            toolCallId: "done",
            state: "output-available",
            output: { action: "dismiss" }
          } as never
        ])
      ])
    ).toBeNull();
  });
});
