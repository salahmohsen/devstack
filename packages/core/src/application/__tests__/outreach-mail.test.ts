import { describe, expect, it } from "vitest";

import { buildOutreachMailModel, splitOutreachParagraphs } from "#@/application/outreach-mail";

describe("splitOutreachParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(
      splitOutreachParagraphs("Dear Nadia,\n\nI'm applying for the role.\n\nI'd welcome a call.")
    ).toEqual(["Dear Nadia,", "I'm applying for the role.", "I'd welcome a call."]);
  });

  it("keeps single newlines inside one paragraph", () => {
    expect(splitOutreachParagraphs("Line one\nline two")).toEqual(["Line one\nline two"]);
  });

  it("returns empty for empty body", () => {
    expect(splitOutreachParagraphs("   ")).toEqual([]);
  });
});

describe("buildOutreachMailModel", () => {
  it("maps subject, paragraphs, signature, and contact lines", () => {
    const model = buildOutreachMailModel({
      subject: "Senior Frontend Engineer — Maya Okafor",
      bodyText: "Dear Nadia,\n\nI'm applying for the role.",
      senderName: "Maya Okafor",
      contacts: [
        { type: "website", value: "https://mayokafor.dev" },
        { type: "github", value: "mayokafor" },
        { type: "email", value: "maya@example.com" }
      ]
    });
    expect(model.subject).toBe("Senior Frontend Engineer — Maya Okafor");
    expect(model.paragraphs).toEqual(["Dear Nadia,", "I'm applying for the role."]);
    expect(model.senderName).toBe("Maya Okafor");
    // displayContact formatting, opted-in only, order preserved.
    expect(model.contactLines).toEqual([
      { text: "mayokafor.dev", href: "https://mayokafor.dev" },
      { text: "github.com/mayokafor", href: null },
      { text: "maya@example.com", href: "mailto:maya@example.com" }
    ]);
  });

  it("drops empty values and empty names", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "  ",
      contacts: [{ type: "github", value: "" }]
    });
    expect(model.senderName).toBe("");
    expect(model.contactLines).toEqual([]);
  });
});
