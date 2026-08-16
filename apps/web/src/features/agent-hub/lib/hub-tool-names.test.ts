import { type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import {
  findPendingProposeApplicationFromJd,
  hubToolNameFromPart,
  isGenerateApplyPackageToolName,
  isHubToolUiPart,
  isProposeApplicationFromJdToolName,
  jdListingKey,
  listingHasResolvedJdProposal,
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

  it("reads required and preferred skill names", () => {
    expect(
      parseProposeApplicationFromJdInput({
        title: "Eng",
        companyName: "Acme",
        description: "Build",
        requiredSkills: ["React", { name: "TypeScript" }, "react", ""],
        preferredSkills: ["Vitest"]
      }).requiredSkills
    ).toEqual(["React", "TypeScript"]);
  });

  it("coerces string matchScore into 0–100", () => {
    expect(parseProposeApplicationFromJdInput({ matchScore: "87.4" }).matchScore).toBe(87);
    expect(parseProposeApplicationFromJdInput({ matchScore: "n/a" }).matchScore).toBeNull();
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
      salaryRange: null,
      applyMethod: null,
      workMode: null,
      employmentType: null,
      department: null,
      datePosted: null,
      experience: null,
      source: null,
      matchScore: 82,
      notes: null,
      requiredSkills: [],
      preferredSkills: []
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
        salaryRange: null,
        applyMethod: null,
        workMode: null,
        employmentType: null,
        department: null,
        datePosted: null,
        experience: null,
        source: null,
        matchScore: null,
        notes: null,
        requiredSkills: [],
        preferredSkills: []
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

describe("jdListingKey", () => {
  it("treats LinkedIn comm and guest view URLs as the same listing", () => {
    expect(jdListingKey({ url: "https://www.linkedin.com/comm/jobs/view/4452452790" })).toBe(
      "linkedin:4452452790"
    );
    expect(jdListingKey({ url: "https://www.linkedin.com/jobs/view/4452452790/" })).toBe(
      "linkedin:4452452790"
    );
  });
});

describe("listingHasResolvedJdProposal", () => {
  it("finds a save on the same listing from another tool call", () => {
    expect(
      listingHasResolvedJdProposal(
        [
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "saved",
              toolName: "propose-application-from-jd",
              state: "output-available",
              input: { url: "https://www.linkedin.com/jobs/view/4452452790" },
              output: { action: "save", applicationId: "a1" }
            } as never,
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "again",
              toolName: "propose-application-from-jd",
              state: "input-available",
              input: { url: "https://www.linkedin.com/comm/jobs/view/4452452790" }
            } as never
          ])
        ],
        "linkedin:4452452790",
        "again"
      )
    ).toBe(true);
  });

  it("does not treat a prior-turn dismiss as resolved after a new paste", () => {
    expect(
      listingHasResolvedJdProposal(
        [
          {
            id: "u1",
            role: "user",
            parts: [{ type: "text", text: "https://www.linkedin.com/jobs/view/4440801290/" }]
          },
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "old",
              toolName: "propose-application-from-jd",
              state: "output-available",
              input: { url: "https://www.linkedin.com/jobs/view/4440801290/" },
              output: { action: "dismiss" }
            } as never
          ]),
          {
            id: "u2",
            role: "user",
            parts: [{ type: "text", text: "https://www.linkedin.com/jobs/view/4440801290/" }]
          },
          assistant([
            {
              type: "tool-propose-application-from-jd",
              toolCallId: "fresh",
              toolName: "propose-application-from-jd",
              state: "input-available",
              input: { url: "https://www.linkedin.com/jobs/view/4440801290/" }
            } as never
          ])
        ],
        "linkedin:4440801290",
        "fresh"
      )
    ).toBe(false);
  });
});
