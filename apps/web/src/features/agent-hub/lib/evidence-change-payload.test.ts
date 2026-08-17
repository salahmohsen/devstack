import { describe, expect, it } from "vitest";

import { evidenceGoalsReady } from "@tsu-stack/core";

import {
  buildEvidenceWrite,
  mergeEvidenceRecord,
  sanitizeExperienceDate
} from "./evidence-change-payload";

describe("mergeEvidenceRecord", () => {
  it("does not treat a title-only edit patch as ready", () => {
    const current = { title: "Dev-Hub", summary: "ops", year: 2026 };
    const patch = { title: "Dev-Hub 2" };
    expect(evidenceGoalsReady("project", patch)).toBe(false);
    expect(evidenceGoalsReady("project", mergeEvidenceRecord(current, patch))).toBe(true);
  });

  it("uses the patch alone on create when there is no current row", () => {
    const patch = { title: "Dev-Hub", summary: "ops", year: 2026 };
    expect(evidenceGoalsReady("project", mergeEvidenceRecord(null, patch))).toBe(true);
  });
});

describe("sanitizeExperienceDate", () => {
  it("keeps YYYY-MM-DD and null, drops invalid LLM dates", () => {
    expect(sanitizeExperienceDate("2024-06-01")).toBe("2024-06-01");
    expect(sanitizeExperienceDate(null)).toBeNull();
    expect(sanitizeExperienceDate(undefined)).toBeUndefined();
    expect(sanitizeExperienceDate("")).toBeUndefined();
    expect(sanitizeExperienceDate("June 2024")).toBeUndefined();
    expect(sanitizeExperienceDate("2024-06")).toBeUndefined();
    expect(sanitizeExperienceDate("2024/06/01")).toBeUndefined();
  });
});

describe("buildEvidenceWrite", () => {
  it("creates a project with a required empty description when missing", () => {
    const write = buildEvidenceWrite({
      kind: "project",
      record: { title: "Dev-Hub", year: "2026", summary: "ops" },
      patch: { title: "Dev-Hub", year: "2026", summary: "ops" }
    });
    expect(write).toEqual({
      mode: "create",
      kind: "project",
      input: expect.objectContaining({
        title: "Dev-Hub",
        year: 2026,
        summary: "ops",
        description: ""
      })
    });
  });

  it("updates a project with { id, data } and only the patch fields", () => {
    const write = buildEvidenceWrite({
      kind: "project",
      id: "prj_1",
      record: { title: "Dev-Hub 2", summary: "ops", year: 2026, description: "long" },
      patch: { title: "Dev-Hub 2" }
    });
    expect(write).toEqual({
      mode: "update",
      kind: "project",
      id: "prj_1",
      data: { title: "Dev-Hub 2" }
    });
  });

  it("creates a flat experience and drops invalid dates", () => {
    const write = buildEvidenceWrite({
      kind: "experience",
      record: {
        title: "FE",
        organization: "RAYA",
        description: "Shipped hub",
        fromDate: "June 2024",
        toDate: "2024-06-01"
      },
      patch: {
        title: "FE",
        organization: "RAYA",
        description: "Shipped hub",
        fromDate: "June 2024",
        toDate: "2024-06-01"
      }
    });
    expect(write).toMatchObject({
      mode: "create",
      kind: "experience",
      input: {
        title: "FE",
        organization: "RAYA",
        description: "Shipped hub",
        fromDate: null,
        toDate: "2024-06-01"
      }
    });
  });

  it("updates experience with merged description and preserves current dates", () => {
    const currentRow = {
      title: "FE",
      organization: "RAYA",
      description: "Shipped hub",
      fromDate: "2022-01-01",
      toDate: "2024-06-01"
    };
    const patch = { title: "Senior FE", fromDate: "last year" };
    const write = buildEvidenceWrite({
      kind: "experience",
      id: "exp_1",
      record: mergeEvidenceRecord(currentRow, patch),
      patch,
      currentRow
    });
    expect(write).toEqual({
      mode: "update",
      kind: "experience",
      id: "exp_1",
      data: {
        title: "Senior FE",
        description: "Shipped hub",
        fromDate: "2022-01-01",
        toDate: "2024-06-01"
      }
    });
  });

  it("creates a stack from name and optional flags", () => {
    const write = buildEvidenceWrite({
      kind: "stack",
      record: { name: "React", type: "framework", isFeatured: true },
      patch: { name: "React", type: "framework", isFeatured: true }
    });
    expect(write).toEqual({
      mode: "create",
      kind: "stack",
      input: {
        name: "React",
        type: "framework",
        isFeatured: true
      }
    });
  });

  it("returns null when create project is missing required columns", () => {
    expect(
      buildEvidenceWrite({
        kind: "project",
        record: { summary: "ops" },
        patch: { summary: "ops" }
      })
    ).toBeNull();
  });
});
