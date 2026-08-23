import { describe, expect, it } from "vitest";

import {
  ProposeApplicationFieldChangeInputSchema,
  ProposeBatchGeneratePackagesInputSchema,
  ProposeBatchTrackingChangeInputSchema,
  ProposeDeleteNoteInputSchema,
  ProposeSetOutcomeInputSchema
} from "#@/application/propose-hub-crm";

describe("ProposeApplicationFieldChangeInputSchema", () => {
  it("parses a location patch", () => {
    const parsed = ProposeApplicationFieldChangeInputSchema.safeParse({
      applicationId: "app_1",
      currentMarkdown: "# Acme · SWE\nLocation: Berlin",
      proposedMarkdown: "# Acme · SWE\nLocation: Remote",
      patch: { location: "Remote" }
    });
    expect(parsed.success).toBe(true);
  });

  it("parse-fails when patch has an analysis key", () => {
    const parsed = ProposeApplicationFieldChangeInputSchema.safeParse({
      applicationId: "app_1",
      currentMarkdown: "",
      proposedMarkdown: "# x",
      patch: { analysis: "secret" }
    });
    expect(parsed.success).toBe(false);
  });
});

describe("ProposeSetOutcomeInputSchema", () => {
  it("accepts close labels only", () => {
    expect(
      ProposeSetOutcomeInputSchema.safeParse({
        applicationId: "app_1",
        outcome: "rejected"
      }).success
    ).toBe(true);
    expect(
      ProposeSetOutcomeInputSchema.safeParse({
        applicationId: "app_1",
        outcome: "applied"
      }).success
    ).toBe(false);
  });
});

describe("ProposeDeleteNoteInputSchema", () => {
  it("defaults kind to note", () => {
    const parsed = ProposeDeleteNoteInputSchema.safeParse({
      applicationId: "app_1",
      noteId: "note_1"
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.kind).toBe("note");
  });
});

describe("ProposeBatchTrackingChangeInputSchema", () => {
  it("requires at least one id", () => {
    expect(
      ProposeBatchTrackingChangeInputSchema.safeParse({
        trackingAction: "track",
        ids: []
      }).success
    ).toBe(false);
    expect(
      ProposeBatchTrackingChangeInputSchema.safeParse({
        trackingAction: "restore",
        ids: ["a"]
      }).success
    ).toBe(true);
  });
});

describe("ProposeBatchGeneratePackagesInputSchema", () => {
  it("requires at least one id and accepts labels", () => {
    expect(ProposeBatchGeneratePackagesInputSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      ProposeBatchGeneratePackagesInputSchema.safeParse({
        ids: ["a", "b"],
        labels: [{ id: "a", title: "Eng", companyName: "Acme" }]
      }).success
    ).toBe(true);
  });
});
