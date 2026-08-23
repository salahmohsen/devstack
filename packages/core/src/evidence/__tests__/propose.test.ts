import { describe, expect, it } from "vitest";

import {
  ProposeEvidenceChangeInputSchema,
  ProposeEvidenceChangeOutputSchema
} from "#@/evidence/propose";

const createInput = {
  kind: "project",
  patch: { title: "Dev-Hub" },
  currentMarkdown: "",
  proposedMarkdown: "# Project: Dev-Hub"
};

describe("ProposeEvidenceChangeInputSchema", () => {
  it("parses a create input without id", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse(createInput);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.id).toBeUndefined();
  });

  it("parses an edit input with id", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse({
      ...createInput,
      kind: "experience",
      id: "exp_1"
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.id).toBe("exp_1");
  });

  it("rejects an invalid kind", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse({
      ...createInput,
      kind: "resume"
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty proposedMarkdown", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse({
      ...createInput,
      proposedMarkdown: ""
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults op to update and patch to {}", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse(createInput);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.op).toBe("update");
  });

  it("parses a delete input with id", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse({
      kind: "project",
      op: "delete",
      id: "prj_1",
      currentMarkdown: "# Project: Dev-Hub",
      proposedMarkdown: "# Project: Dev-Hub\n\n(This row will be deleted.)"
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.op).toBe("delete");
    expect(parsed.data?.id).toBe("prj_1");
    expect(parsed.data?.patch).toEqual({});
  });

  it("rejects delete without id", () => {
    const parsed = ProposeEvidenceChangeInputSchema.safeParse({
      kind: "stack",
      op: "delete",
      currentMarkdown: "",
      proposedMarkdown: "# Stack: React\n\n(This row will be deleted.)"
    });
    expect(parsed.success).toBe(false);
  });

  it.each(["analysis", "analysisMarkdown", "projectAnalysis"] as const)(
    "parse-fails when patch has %s",
    (key) => {
      const parsed = ProposeEvidenceChangeInputSchema.safeParse({
        ...createInput,
        patch: { title: "Dev-Hub", [key]: "new facts" }
      });
      expect(parsed.success).toBe(false);
      expect(
        parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))
      ).toContain(`patch.${key}`);
    }
  );
});

describe("ProposeEvidenceChangeOutputSchema", () => {
  it("parses confirm and cancel with kind and optional id", () => {
    expect(
      ProposeEvidenceChangeOutputSchema.safeParse({ action: "confirm", kind: "project" }).success
    ).toBe(true);
    expect(
      ProposeEvidenceChangeOutputSchema.safeParse({
        action: "cancel",
        kind: "stack",
        id: "stk_1"
      }).success
    ).toBe(true);
  });

  it("rejects an invalid action", () => {
    expect(
      ProposeEvidenceChangeOutputSchema.safeParse({ action: "maybe", kind: "project" }).success
    ).toBe(false);
  });
});
