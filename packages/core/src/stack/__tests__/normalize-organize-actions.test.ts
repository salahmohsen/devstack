import { describe, expect, it } from "vitest";

import { normalizeOrganizeActions } from "#@/stack/normalize-organize-actions";
import { type OrganizeAction } from "#@/stack/organize-stacks.types";

const stacks = [
  { id: "a", name: "framer-motion", projectCount: 1 },
  { id: "b", name: "Framer Motion", projectCount: 3 },
  { id: "c", name: "reactjs", projectCount: 2 },
  { id: "d", name: "React", projectCount: 5 }
];

describe("normalizeOrganizeActions", () => {
  it("converts rename-to-existing-name into a merge", () => {
    const actions: OrganizeAction[] = [
      {
        type: "rename",
        stackId: "a",
        stackName: "framer-motion",
        details: { newName: "Framer Motion" },
        reason: "canonical name"
      }
    ];

    const { actions: out } = normalizeOrganizeActions(actions, stacks);

    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("merge");
    expect(out[0]?.stackId).toBe("a");
    expect(out[0]?.details.mergeIntoId).toBe("b");
  });

  it("drops no-op renames", () => {
    const actions: OrganizeAction[] = [
      {
        type: "rename",
        stackId: "b",
        stackName: "Framer Motion",
        details: { newName: "framer motion" },
        reason: "same name"
      }
    ];

    const { actions: out } = normalizeOrganizeActions(actions, stacks);
    expect(out).toHaveLength(0);
  });

  it("merges competing renames to the same target", () => {
    const actions: OrganizeAction[] = [
      {
        type: "rename",
        stackId: "a",
        stackName: "framer-motion",
        details: { newName: "Motion" },
        reason: "canonical"
      },
      {
        type: "rename",
        stackId: "c",
        stackName: "reactjs",
        details: { newName: "Motion" },
        reason: "also Motion"
      }
    ];

    const { actions: out } = normalizeOrganizeActions(actions, stacks);
    const renames = out.filter((a) => a.type === "rename");
    const merges = out.filter((a) => a.type === "merge");

    expect(renames).toHaveLength(1);
    expect(renames[0]?.stackId).toBe("a");
    expect(merges).toHaveLength(1);
    expect(merges[0]?.stackId).toBe("c");
    expect(merges[0]?.details.mergeIntoId).toBe("a");
  });

  it("drops enrich on merge victims and empty enrichments", () => {
    const actions: OrganizeAction[] = [
      {
        type: "merge",
        stackId: "a",
        stackName: "framer-motion",
        details: { mergeIntoId: "b", mergeIntoName: "Framer Motion" },
        reason: "dup"
      },
      {
        type: "enrich",
        stackId: "a",
        stackName: "framer-motion",
        details: { newIcon: "<svg/>" },
        reason: "icon"
      },
      {
        type: "enrich",
        stackId: "c",
        stackName: "reactjs",
        details: {},
        reason: "empty"
      }
    ];

    const { actions: out } = normalizeOrganizeActions(actions, stacks);
    expect(out.every((a) => a.type === "merge")).toBe(true);
    expect(out).toHaveLength(1);
  });

  it("rewrites sortOrder through survivors", () => {
    const actions: OrganizeAction[] = [
      {
        type: "merge",
        stackId: "a",
        stackName: "framer-motion",
        details: { mergeIntoId: "b", mergeIntoName: "Framer Motion" },
        reason: "dup"
      }
    ];

    const { sortOrder } = normalizeOrganizeActions(actions, stacks, ["a", "b", "c", "a"]);
    expect(sortOrder).toEqual(["b", "c"]);
  });

  it("keeps aliases on a rename", () => {
    const actions: OrganizeAction[] = [
      {
        type: "rename",
        stackId: "c",
        stackName: "reactjs",
        details: { newName: "React.js", aliases: ["reactjs", "React JS"] },
        reason: "canonical"
      }
    ];

    const { actions: out } = normalizeOrganizeActions(actions, stacks);
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("rename");
    expect(out[0]?.details.newName).toBe("React.js");
    expect(out[0]?.details.aliases).toEqual(["reactjs", "React JS"]);
  });

  it("reads in-flight alternativeNames as aliases", () => {
    const actions: OrganizeAction[] = [
      {
        type: "rename",
        stackId: "c",
        stackName: "reactjs",
        details: { newName: "React.js", alternativeNames: ["reactjs"] },
        reason: "canonical"
      }
    ];

    const { actions: out } = normalizeOrganizeActions(actions, stacks);
    expect(out[0]?.details.aliases).toEqual(["reactjs"]);
  });
});
