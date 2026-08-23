import { describe, expect, it } from "vitest";

import {
  createHubInputProcessors,
  HubPostEvidenceConfirmProcessor,
  messagesHaveEvidenceOrHardStopResultThisTurn
} from "./hub-processors";

function assistantWithParts(parts: Record<string, unknown>[]) {
  return {
    role: "assistant" as const,
    content: { parts }
  };
}

const POST_CONFIRM_TOOLS = {
  listNewJobs: {},
  proposeNewJobsTriage: {},
  findJobsNow: {},
  searchEvidence: {},
  getProject: {},
  getExperience: {},
  getStack: {},
  listProjects: {},
  proposeEvidenceChange: {},
  proposeApplicationFieldChange: {},
  openEntityInspect: {},
  getSearchBrief: {}
};

describe("messagesHaveEvidenceOrHardStopResultThisTurn", () => {
  it("is false when neither evidence nor hard-stop has a result this turn", () => {
    expect(
      messagesHaveEvidenceOrHardStopResultThisTurn([
        { role: "user", content: { parts: [{ type: "text", text: "edit Dev-Hub" }] } }
      ] as never)
    ).toBe(false);
  });

  it("is false while propose-evidence-change is still waiting", () => {
    expect(
      messagesHaveEvidenceOrHardStopResultThisTurn([
        { role: "user", content: { parts: [{ type: "text", text: "edit Dev-Hub" }] } },
        assistantWithParts([
          {
            type: "tool-propose-evidence-change",
            toolName: "proposeEvidenceChange",
            state: "input-available"
          }
        ])
      ] as never)
    ).toBe(false);
  });

  it("is true after propose-evidence-change output this turn", () => {
    expect(
      messagesHaveEvidenceOrHardStopResultThisTurn([
        { role: "user", content: { parts: [{ type: "text", text: "edit Dev-Hub" }] } },
        assistantWithParts([
          {
            type: "tool-propose-evidence-change",
            toolName: "propose-evidence-change",
            state: "output-available",
            output: { action: "confirm", kind: "project", id: "p1" }
          }
        ])
      ] as never)
    ).toBe(true);
  });

  it("is true after propose-application-field-change output this turn", () => {
    expect(
      messagesHaveEvidenceOrHardStopResultThisTurn([
        { role: "user", content: { parts: [{ type: "text", text: "change location" }] } },
        assistantWithParts([
          {
            type: "tool-propose-application-field-change",
            toolName: "proposeApplicationFieldChange",
            state: "output-available",
            output: { action: "confirm", applicationId: "app_1" }
          }
        ])
      ] as never)
    ).toBe(true);
  });

  it("is true after proposeHardPreferenceChange output this turn", () => {
    expect(
      messagesHaveEvidenceOrHardStopResultThisTurn([
        { role: "user", content: { parts: [{ type: "text", text: "nothing below senior" }] } },
        assistantWithParts([
          {
            type: "tool-propose-hard-preference-change",
            toolName: "proposeHardPreferenceChange",
            output: { action: "confirm" }
          }
        ])
      ] as never)
    ).toBe(true);
  });

  it("does not treat a prior turn result as this turn", () => {
    expect(
      messagesHaveEvidenceOrHardStopResultThisTurn([
        { role: "user", content: { parts: [{ type: "text", text: "edit Dev-Hub" }] } },
        assistantWithParts([
          {
            type: "tool-propose-evidence-change",
            toolName: "proposeEvidenceChange",
            state: "output-available",
            output: { action: "confirm", kind: "project", id: "p1" }
          }
        ]),
        { role: "user", content: { parts: [{ type: "text", text: "what am I looking for" }] } }
      ] as never)
    ).toBe(false);
  });
});

describe("HubPostEvidenceConfirmProcessor", () => {
  const processor = new HubPostEvidenceConfirmProcessor();

  it("returns filtered activeTools after an evidence confirm this turn", async () => {
    const result = await processor.processInputStep({
      messages: [
        { role: "user", content: { parts: [{ type: "text", text: "edit Dev-Hub" }] } },
        assistantWithParts([
          {
            type: "tool-propose-evidence-change",
            toolName: "proposeEvidenceChange",
            state: "output-available",
            output: { action: "confirm", kind: "project", id: "p1" }
          }
        ])
      ],
      tools: POST_CONFIRM_TOOLS
    } as never);

    expect(result).toEqual({
      activeTools: [
        "searchEvidence",
        "getProject",
        "getExperience",
        "getStack",
        "listProjects",
        "proposeEvidenceChange",
        "proposeApplicationFieldChange",
        "openEntityInspect",
        "getSearchBrief"
      ]
    });
  });

  it("returns filtered activeTools after an application-field confirm this turn", async () => {
    const result = await processor.processInputStep({
      messages: [
        { role: "user", content: { parts: [{ type: "text", text: "set location to remote" }] } },
        assistantWithParts([
          {
            type: "tool-propose-application-field-change",
            toolName: "proposeApplicationFieldChange",
            state: "output-available",
            output: { action: "confirm", applicationId: "app_1" }
          }
        ])
      ],
      tools: POST_CONFIRM_TOOLS
    } as never);

    expect(result).toEqual({
      activeTools: [
        "searchEvidence",
        "getProject",
        "getExperience",
        "getStack",
        "listProjects",
        "proposeEvidenceChange",
        "proposeApplicationFieldChange",
        "openEntityInspect",
        "getSearchBrief"
      ]
    });
  });

  it("returns nothing while a client HITL card is still waiting", async () => {
    const result = await processor.processInputStep({
      messages: [
        { role: "user", content: { parts: [{ type: "text", text: "edit Dev-Hub" }] } },
        assistantWithParts([
          {
            type: "tool-propose-evidence-change",
            toolName: "proposeEvidenceChange",
            state: "input-available"
          }
        ])
      ],
      tools: POST_CONFIRM_TOOLS
    } as never);
    expect(result).toBeUndefined();
  });

  it("registers before ensure-final-response", () => {
    const ids = createHubInputProcessors().map((processor) => processor.id);
    const evidenceIdx = ids.indexOf("hub-post-evidence-confirm");
    const ensureIdx = ids.indexOf("ensure-final-response");
    expect(evidenceIdx).toBeGreaterThan(-1);
    expect(ensureIdx).toBeGreaterThan(evidenceIdx);
  });
});
