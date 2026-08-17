import { type UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import { findHubApprovalId, withApprovalRequested } from "./hub-approval-resume";
import { isHubApprovalPending, summarizeHubApproval } from "./hub-approval-summary";
import {
  cancelledTriageCardInputFromParts,
  findOpenEntityFormOutputInMessages,
  findPendingProposeApplicationFromJd,
  hydrateProposeNewJobsTriageInput,
  isExtraWaitingEvidenceCard,
  isLaterEvidenceAfterSameEntityConfirm,
  isLaterHardStopAfterConfirm,
  isLaterTriageAfterConfirm,
  isOpenEntityFormToolName,
  isOpenEntityInspectToolName,
  isOpenSurfaceToolName,
  isProposeNewJobsTriageToolName,
  lastHubHitlKind,
  listNewJobsFromMessages,
  parseOpenEntityFormInput,
  parseOpenEntityInspectInput,
  parseOpenSurfaceHref,
  parseProposeNewJobsTriageInput,
  parseProposeNewJobsTriageOutput,
  shouldRequestEntityFormHost
} from "./hub-tool-names";
import { rememberTriageAction } from "./hub-triage-action-memory";
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

  it.each([
    ["open-entity-form", true],
    ["openEntityForm", true],
    ["open-entity-inspect", false],
    ["open-surface", false]
  ] as const)("openEntityForm %s → %s", (name, expected) => {
    expect(isOpenEntityFormToolName(name)).toBe(expected);
  });

  it.each([
    ["open-entity-inspect", true],
    ["openEntityInspect", true],
    ["open-entity-form", false]
  ] as const)("openEntityInspect %s → %s", (name, expected) => {
    expect(isOpenEntityInspectToolName(name)).toBe(expected);
  });
});

describe("parseOpenEntityInspectInput", () => {
  it("requires kind and a real id", () => {
    expect(parseOpenEntityInspectInput({ kind: "project", id: "p1" })).toEqual({
      kind: "project",
      id: "p1"
    });
    expect(parseOpenEntityInspectInput({ kind: "project" })).toBeNull();
    expect(parseOpenEntityInspectInput({ kind: "project", id: "  " })).toBeNull();
  });
});

describe("parseOpenEntityFormInput", () => {
  it("treats omit / null / blank id as create when plan is present", () => {
    expect(parseOpenEntityFormInput({ kind: "experience", plan: "Add title X" })).toEqual({
      kind: "experience",
      id: null,
      plan: "Add title X"
    });
    expect(parseOpenEntityFormInput({ kind: "project", id: null, plan: "Create Dev-Hub" })).toEqual(
      {
        kind: "project",
        id: null,
        plan: "Create Dev-Hub"
      }
    );
    expect(parseOpenEntityFormInput({ kind: "stack", id: "  ", plan: "Rename React" })).toEqual({
      kind: "stack",
      id: null,
      plan: "Rename React"
    });
  });

  it("keeps a real id for edit", () => {
    expect(
      parseOpenEntityFormInput({ kind: "experience", id: "exp_1", plan: "Retitle to backend" })
    ).toEqual({
      kind: "experience",
      id: "exp_1",
      plan: "Retitle to backend"
    });
  });

  it("rejects missing plan and unknown kinds", () => {
    expect(parseOpenEntityFormInput({ kind: "experience" })).toBeNull();
    expect(parseOpenEntityFormInput({ kind: "experience", plan: "  " })).toBeNull();
    expect(parseOpenEntityFormInput({ kind: "application", plan: "x" })).toBeNull();
    expect(parseOpenEntityFormInput(null)).toBeNull();
  });
});

describe("shouldRequestEntityFormHost", () => {
  it("requests only when this call is the latest pending owner", () => {
    expect(
      shouldRequestEntityFormHost({
        completed: false,
        latestPendingId: "tc1",
        toolCallId: "tc1"
      })
    ).toBe(true);
    expect(
      shouldRequestEntityFormHost({
        completed: false,
        latestPendingId: "tc2",
        toolCallId: "tc1"
      })
    ).toBe(false);
    expect(
      shouldRequestEntityFormHost({
        completed: false,
        latestPendingId: null,
        toolCallId: "tc1"
      })
    ).toBe(false);
  });

  it("does not request after this tool already completed", () => {
    expect(
      shouldRequestEntityFormHost({
        completed: true,
        latestPendingId: null,
        toolCallId: "tc1"
      })
    ).toBe(false);
    expect(
      shouldRequestEntityFormHost({
        completed: true,
        latestPendingId: "tc1",
        toolCallId: "tc1"
      })
    ).toBe(false);
  });
});

describe("findOpenEntityFormOutputInMessages", () => {
  it("reads host addToolOutput off the matching part", () => {
    expect(
      findOpenEntityFormOutputInMessages(
        [
          assistant([
            {
              type: "tool-open-entity-form",
              toolCallId: "tc1",
              toolName: "open-entity-form",
              state: "output-available",
              output: { ok: true, kind: "experience", saved: true, id: "exp_1" }
            } as never
          ])
        ],
        "tc1"
      )
    ).toEqual({ ok: true, kind: "experience", saved: true, id: "exp_1" });
  });

  it("ignores other tool calls", () => {
    expect(
      findOpenEntityFormOutputInMessages(
        [
          assistant([
            {
              type: "tool-open-entity-form",
              toolCallId: "other",
              output: { ok: true, kind: "project", saved: false, cancelled: true }
            } as never
          ])
        ],
        "tc1"
      )
    ).toBeNull();
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

describe("hydrateProposeNewJobsTriageInput", () => {
  it("keeps a model-filled split", () => {
    const parsed = {
      track: [{ id: "1", title: "Eng", companyName: "A", matchScore: 80, reason: "fit" }],
      dismiss: [{ id: "2", title: "Ops", companyName: "B", matchScore: null, reason: "no" }]
    };
    expect(
      hydrateProposeNewJobsTriageInput(parsed, [{ id: "9", title: "Other", companyName: "Z" }])
    ).toEqual(parsed);
  });

  it("fills Track from inbox when both arrays are empty", () => {
    const hydrated = hydrateProposeNewJobsTriageInput({ track: [], dismiss: [] }, [
      { id: "a", title: "Eng", companyName: "Acme", matchScore: 70 },
      { id: "b", title: "Ops", companyName: "Beta", matchScore: null }
    ]);
    expect(hydrated.dismiss).toEqual([]);
    expect(hydrated.track.map((row) => row.id)).toEqual(["a", "b"]);
    expect(hydrated.track[0]?.title).toBe("Eng");
  });

  it("caps hydrate at 15", () => {
    const jobs = Array.from({ length: 20 }, (_, i) => {
      return { id: `j${i}`, title: `T${i}`, companyName: "C" };
    });
    expect(hydrateProposeNewJobsTriageInput({ track: [], dismiss: [] }, jobs).track).toHaveLength(
      15
    );
  });
});

describe("listNewJobsFromMessages", () => {
  it("reads the latest listNewJobs jobs", () => {
    expect(
      listNewJobsFromMessages([
        { id: "u1", role: "user", parts: [{ type: "text", text: "show my new jobs" }] },
        assistant([
          {
            type: "tool-listNewJobs",
            toolName: "listNewJobs",
            toolCallId: "l1",
            state: "output-available",
            output: { jobs: [{ id: "old", title: "Old", companyName: "X" }] }
          } as never
        ]),
        { id: "u2", role: "user", parts: [{ type: "text", text: "again" }] },
        assistant([
          {
            type: "tool-list-new-jobs",
            toolName: "list-new-jobs",
            toolCallId: "l2",
            state: "output-available",
            output: { jobs: [{ id: "new", title: "New", companyName: "Y", matchScore: 88 }] }
          } as never
        ])
      ])
    ).toEqual([{ id: "new", title: "New", companyName: "Y", matchScore: 88 }]);
  });
});

describe("cancelledTriageCardInputFromParts", () => {
  const leak =
    "listNewJobs already returned inbox rows. Do NOT call jobPreferenceMatchScorer. Call propose-new-jobs-triage NOW. The triage card is the UI.";

  it("hydrates a cancelled card from listNewJobs when the processor leaked", () => {
    expect(
      cancelledTriageCardInputFromParts([
        {
          type: "tool-list-new-jobs",
          toolName: "list-new-jobs",
          toolCallId: "l1",
          output: {
            jobs: [{ id: "j1", title: "Senior Front-End", companyName: "Eventogy", matchScore: 88 }]
          }
        },
        { type: "text", text: leak }
      ])
    ).toEqual({
      track: [
        {
          id: "j1",
          title: "Senior Front-End",
          companyName: "Eventogy",
          matchScore: 88,
          reason: null
        }
      ],
      dismiss: []
    });
  });

  it("hydrates from listNewJobs even when the processor leak is missing", () => {
    expect(
      cancelledTriageCardInputFromParts([
        {
          type: "tool-list-new-jobs",
          toolName: "list-new-jobs",
          output: { jobs: [{ id: "j1", title: "FE", companyName: "Eventogy", matchScore: 88 }] }
        }
      ])
    ).toEqual({
      track: [
        {
          id: "j1",
          title: "FE",
          companyName: "Eventogy",
          matchScore: 88,
          reason: null
        }
      ],
      dismiss: []
    });
  });

  it("does not invent a card after a spoken pile status", () => {
    expect(
      cancelledTriageCardInputFromParts([
        {
          type: "tool-list-new-jobs",
          toolName: "list-new-jobs",
          output: { jobs: [{ id: "j1", title: "FE", companyName: "Eventogy" }] }
        },
        { type: "text", text: "Pile still just that one. Nothing filed." }
      ])
    ).toBeNull();
  });

  it("uses fallback jobs when listNewJobs output is missing", () => {
    expect(
      cancelledTriageCardInputFromParts(
        [{ type: "text", text: leak }],
        [{ id: "fb1", title: "Fallback", companyName: "Co", matchScore: 70 }]
      )
    ).toEqual({
      track: [
        {
          id: "fb1",
          title: "Fallback",
          companyName: "Co",
          matchScore: 70,
          reason: null
        }
      ],
      dismiss: []
    });
  });

  it("does not invent a card on a Today letter turn", () => {
    expect(
      cancelledTriageCardInputFromParts(
        [
          {
            type: "tool-get-daily-brief",
            toolName: "getDailyBrief",
            state: "output-available",
            output: { markdown: "# Monday\n\nNothing new right now.", mailCount: 40 }
          }
        ],
        [{ id: "fb1", title: "Fallback", companyName: "Co", matchScore: 70 }]
      )
    ).toBeNull();
  });

  it("does not invent a card on a search-brief turn", () => {
    expect(
      cancelledTriageCardInputFromParts(
        [
          {
            type: "tool-get-search-brief",
            toolName: "getSearchBrief",
            state: "input-available"
          }
        ],
        [{ id: "fb1", title: "Fallback", companyName: "Co", matchScore: 70 }]
      )
    ).toBeNull();
  });

  it("does not invent a card from inbox when this turn never listed jobs", () => {
    expect(
      cancelledTriageCardInputFromParts(
        [],
        [{ id: "fb1", title: "Fallback", companyName: "Co", matchScore: 70 }]
      )
    ).toBeNull();
  });

  it("does not invent a card when the triage tool already owns the turn", () => {
    expect(
      cancelledTriageCardInputFromParts([
        {
          type: "tool-list-new-jobs",
          toolName: "list-new-jobs",
          output: { jobs: [{ id: "j1", title: "A", companyName: "B" }] }
        },
        {
          type: "tool-propose-new-jobs-triage",
          toolName: "propose-new-jobs-triage",
          state: "input-available"
        },
        { type: "text", text: leak }
      ])
    ).toBeNull();
  });
});

describe("isLaterTriageAfterConfirm", () => {
  it("is false for the first propose this turn", () => {
    expect(
      isLaterTriageAfterConfirm(
        [
          { id: "u1", role: "user", parts: [{ type: "text", text: "show my new jobs" }] },
          assistant([
            {
              type: "tool-propose-new-jobs-triage",
              toolName: "propose-new-jobs-triage",
              toolCallId: "t1",
              state: "input-available"
            } as never
          ])
        ],
        "t1"
      )
    ).toBe(false);
  });

  it("is true for a second propose after confirm this turn", () => {
    expect(
      isLaterTriageAfterConfirm(
        [
          { id: "u1", role: "user", parts: [{ type: "text", text: "show my new jobs" }] },
          assistant([
            {
              type: "tool-propose-new-jobs-triage",
              toolName: "propose-new-jobs-triage",
              toolCallId: "t1",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
            } as never,
            {
              type: "tool-propose-new-jobs-triage",
              toolName: "propose-new-jobs-triage",
              toolCallId: "t2",
              state: "input-available"
            } as never
          ])
        ],
        "t2"
      )
    ).toBe(true);
  });

  it("resets on a new user turn", () => {
    expect(
      isLaterTriageAfterConfirm(
        [
          { id: "u1", role: "user", parts: [{ type: "text", text: "show my new jobs" }] },
          assistant([
            {
              type: "tool-propose-new-jobs-triage",
              toolName: "propose-new-jobs-triage",
              toolCallId: "t1",
              state: "output-available",
              output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
            } as never
          ]),
          { id: "u2", role: "user", parts: [{ type: "text", text: "show them again" }] },
          assistant([
            {
              type: "tool-propose-new-jobs-triage",
              toolName: "propose-new-jobs-triage",
              toolCallId: "t3",
              state: "input-available"
            } as never
          ])
        ],
        "t3"
      )
    ).toBe(false);
  });
});

describe("isLaterEvidenceAfterSameEntityConfirm", () => {
  const userAsk = {
    id: "u1",
    role: "user" as const,
    parts: [{ type: "text" as const, text: "tweak Dev-Hub then RAYA" }]
  };

  it("is false for the first evidence card this turn", () => {
    expect(
      isLaterEvidenceAfterSameEntityConfirm(
        [
          userAsk,
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e1",
              state: "input-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first"
              }
            } as never
          ])
        ],
        "e1"
      )
    ).toBe(false);
  });

  it("is true for a second propose of the same kind+id after cancel", () => {
    expect(
      isLaterEvidenceAfterSameEntityConfirm(
        [
          userAsk,
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e1",
              state: "output-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first"
              },
              output: { action: "cancel", kind: "project", id: "prj_1" }
            } as never,
            {
              type: "tool-proposeEvidenceChange",
              toolName: "proposeEvidenceChange",
              toolCallId: "e2",
              state: "input-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first platform" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first platform"
              }
            } as never
          ])
        ],
        "e2"
      )
    ).toBe(true);
  });

  it("is true for a second propose of the same kind+id after confirm", () => {
    expect(
      isLaterEvidenceAfterSameEntityConfirm(
        [
          userAsk,
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e1",
              state: "output-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first"
              },
              output: { action: "confirm", kind: "project", id: "prj_1" }
            } as never,
            {
              type: "tool-proposeEvidenceChange",
              toolName: "proposeEvidenceChange",
              toolCallId: "e2",
              state: "input-available",
              input: {
                kind: "project",
                id: "prj_1",
                patch: { summary: "Backend-first platform" },
                currentMarkdown: "# Project: Dev-Hub",
                proposedMarkdown: "# Project: Dev-Hub\nBackend-first platform"
              }
            } as never
          ])
        ],
        "e2"
      )
    ).toBe(true);
  });

  it("is false for a later card on a different entity (next interview)", () => {
    expect(
      isLaterEvidenceAfterSameEntityConfirm(
        [
          userAsk,
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e1",
              state: "output-available",
              output: { action: "confirm", kind: "project", id: "prj_1" }
            } as never,
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e2",
              state: "input-available",
              input: {
                kind: "experience",
                id: "exp_raya",
                patch: { title: "Frontend" },
                currentMarkdown: "# Experience: RAYA",
                proposedMarkdown: "# Experience: Senior Frontend @ RAYA"
              }
            } as never
          ])
        ],
        "e2"
      )
    ).toBe(false);
  });
});

describe("isExtraWaitingEvidenceCard", () => {
  it("keeps the first waiting card and marks later siblings extra", () => {
    const thread = [
      {
        id: "u1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "add my stacks" }]
      },
      assistant([
        {
          type: "tool-propose-evidence-change",
          toolName: "propose-evidence-change",
          toolCallId: "s1",
          state: "input-available",
          input: {
            kind: "stack",
            patch: { name: "React" },
            currentMarkdown: "",
            proposedMarkdown: "# Stack: React"
          }
        } as never,
        {
          type: "tool-propose-evidence-change",
          toolName: "propose-evidence-change",
          toolCallId: "s2",
          state: "input-available",
          input: {
            kind: "stack",
            patch: { name: "Node" },
            currentMarkdown: "",
            proposedMarkdown: "# Stack: Node"
          }
        } as never
      ])
    ];
    expect(isExtraWaitingEvidenceCard(thread, "s1")).toBe(false);
    expect(isExtraWaitingEvidenceCard(thread, "s2")).toBe(true);
  });

  it("does not treat a later next-entity card as extra after confirm", () => {
    expect(
      isExtraWaitingEvidenceCard(
        [
          { id: "u1", role: "user" as const, parts: [{ type: "text" as const, text: "both" }] },
          assistant([
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e1",
              state: "output-available",
              output: { action: "confirm", kind: "project", id: "prj_1" }
            } as never,
            {
              type: "tool-propose-evidence-change",
              toolName: "propose-evidence-change",
              toolCallId: "e2",
              state: "input-available",
              input: {
                kind: "experience",
                id: "exp_raya",
                patch: { title: "Frontend" },
                currentMarkdown: "# Experience: RAYA",
                proposedMarkdown: "# Experience: Senior Frontend @ RAYA"
              }
            } as never
          ])
        ],
        "e2"
      )
    ).toBe(false);
  });
});

describe("isLaterHardStopAfterConfirm", () => {
  it("is true for a second hard-stop after confirm this turn", () => {
    expect(
      isLaterHardStopAfterConfirm(
        [
          { id: "u1", role: "user", parts: [{ type: "text", text: "make it 45000 EGP" }] },
          assistant([
            {
              type: "tool-propose-hard-preference-change",
              toolName: "propose-hard-preference-change",
              toolCallId: "h1",
              state: "output-available",
              output: { action: "confirm", patch: { salaryMin: 45000 } }
            } as never,
            {
              type: "tool-propose-hard-preference-change",
              toolName: "propose-hard-preference-change",
              toolCallId: "h2",
              state: "input-available"
            } as never
          ])
        ],
        "h2"
      )
    ).toBe(true);
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
      resumeAfterOutput: false
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
      resumeAfterOutput: false
    },
    {
      name: "find-jobs-now waiting is not a user choice",
      toolName: "find-jobs-now",
      state: "input-available",
      expected: null,
      resumeAfterOutput: false
    },
    {
      name: "get-search-brief waiting is not a user choice",
      toolName: "get-search-brief",
      state: "input-available",
      expected: null,
      // No user text → identity/preview only; section questions resume in dedicated tests
      resumeAfterOutput: false
    },
    {
      name: "evidence change waiting locks composer",
      toolName: "propose-evidence-change",
      state: "input-available",
      expected: "client",
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
      name: "open-entity-inspect waiting is not a user choice",
      toolName: "open-entity-inspect",
      state: "input-available",
      expected: null,
      resumeAfterOutput: false
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
      name: "mail CRM confirm waiting locks composer",
      toolName: "propose-mail-crm-change",
      state: "input-available",
      expected: "client",
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
        input: toolName.includes("entity-form")
          ? { kind: "experience", plan: "Retitle to backend engineer" }
          : toolName.includes("inspect")
            ? { kind: "project", id: "p1" }
            : toolName.includes("open")
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
        output: toolName.includes("entity-form")
          ? { ok: true, kind: "experience", saved: true, id: "exp_1" }
          : toolName.includes("open")
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

  it("does not lock a same-entity evidence re-propose after confirm", () => {
    const thread = [
      {
        id: "u1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "tweak Dev-Hub" }]
      },
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
          type: "tool-proposeEvidenceChange",
          toolCallId: "e2",
          toolName: "proposeEvidenceChange",
          state: "input-available",
          input: {
            kind: "project",
            id: "prj_1",
            patch: { summary: "Backend-first" },
            currentMarkdown: "# Project: Dev-Hub",
            proposedMarkdown: "# Project: Dev-Hub\nBackend-first"
          }
        } as never
      ])
    ];
    expect(lastHubHitlKind(thread)).toBeNull();
  });

  it("locks a second evidence card after confirm this turn (next entity)", () => {
    const thread = [
      {
        id: "u1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "edit Dev-Hub and RAYA" }]
      },
      assistant([
        {
          type: "tool-propose-evidence-change",
          toolCallId: "e1",
          toolName: "propose-evidence-change",
          state: "output-available",
          output: { action: "confirm", kind: "project", id: "prj_1" }
        } as never,
        {
          type: "tool-proposeEvidenceChange",
          toolCallId: "e2",
          toolName: "proposeEvidenceChange",
          state: "input-available",
          input: {
            kind: "experience",
            id: "exp_raya",
            patch: { title: "Frontend" },
            currentMarkdown: "# Experience: RAYA",
            proposedMarkdown: "# Experience: Senior Frontend @ RAYA"
          }
        } as never
      ])
    ];
    expect(lastHubHitlKind(thread)).toBe("client");
  });

  it("does not lock a later triage propose after confirm this turn", () => {
    const thread = [
      {
        id: "u1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "show my new jobs" }]
      },
      assistant([
        {
          type: "tool-propose-new-jobs-triage",
          toolCallId: "t1",
          toolName: "propose-new-jobs-triage",
          state: "output-available",
          output: { action: "confirm", trackIds: ["a"], dismissIds: [] }
        } as never,
        {
          type: "tool-propose-new-jobs-triage",
          toolCallId: "t2",
          toolName: "propose-new-jobs-triage",
          state: "input-available",
          input: { track: [], dismiss: [] }
        } as never
      ])
    ];
    expect(lastHubHitlKind(thread)).toBeNull();
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

  it("does not lock when the waiting triage card already has a recalled cancel", () => {
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
    rememberTriageAction("triage-recalled", "cancel");
    const waiting = assistant([
      {
        type: "tool-propose-new-jobs-triage",
        toolCallId: "triage-recalled",
        toolName: "propose-new-jobs-triage",
        state: "input-available",
        input: {
          track: [{ id: "j1", title: "FE", companyName: "Eventogy", matchScore: 88 }],
          dismiss: []
        }
      } as never
    ]);
    expect(lastHubHitlKind([waiting])).toBeNull();
    vi.unstubAllGlobals();
  });

  it("does not lock on an unparseable hard-stop while args are still streaming", () => {
    expect(
      lastHubHitlKind([
        assistant([
          {
            type: "tool-propose-hard-preference-change",
            toolCallId: "h1",
            toolName: "propose-hard-preference-change",
            state: "input-streaming",
            input: {}
          } as never
        ])
      ])
    ).toBeNull();
  });

  it("locks an unparseable finished hard-stop so Cancel can unstick the composer", () => {
    expect(
      lastHubHitlKind([
        assistant([
          {
            type: "tool-propose-hard-preference-change",
            toolCallId: "h1",
            toolName: "propose-hard-preference-change",
            state: "input-available",
            input: {}
          } as never
        ])
      ])
    ).toBe("client");
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
