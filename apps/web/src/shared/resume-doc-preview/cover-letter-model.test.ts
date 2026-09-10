import { describe, expect, it } from "vitest";

import { buildCoverLetterModel } from "./cover-letter-model";

function build(
  overrides: Partial<Parameters<typeof buildCoverLetterModel>[0]> = {}
): ReturnType<typeof buildCoverLetterModel> {
  return buildCoverLetterModel({
    candidateName: "Salah Mohsen",
    contacts: [],
    profileEmail: "",
    companyName: null,
    roleTitle: null,
    body: "",
    ...overrides
  });
}

describe("buildCoverLetterModel — paragraphs", () => {
  it("splits blank-line separated paragraphs", () => {
    const { paragraphs } = build({ body: "First para.\n\nSecond para." });

    expect(paragraphs.map((p) => p.text)).toEqual(["First para.", "Second para."]);
    expect(paragraphs.map((p) => p.id)).toEqual(["p-0", "p-1"]);
  });

  it("collapses stray intra-paragraph newlines to spaces (PDF parity)", () => {
    const { paragraphs } = build({
      body: "Dear team,\nI am excited.\n\nWarm regards,\nSalah"
    });

    expect(paragraphs.map((p) => p.text)).toEqual([
      "Dear team, I am excited.",
      "Warm regards, Salah"
    ]);
  });

  it("single-paragraph body collapses its newlines to one space-joined paragraph", () => {
    const { paragraphs } = build({ body: "One\nlong\nparagraph" });

    expect(paragraphs).toEqual([{ id: "p-0", text: "One long paragraph" }]);
  });

  it("treats whitespace-only lines as blank separators", () => {
    const { paragraphs } = build({ body: "A\n   \nB" });

    expect(paragraphs.map((p) => p.text)).toEqual(["A", "B"]);
  });

  it("normalizes CRLF line endings before splitting", () => {
    const { paragraphs } = build({ body: "A\r\n\r\nB" });

    expect(paragraphs.map((p) => p.text)).toEqual(["A", "B"]);
  });

  it("empty body renders no paragraphs", () => {
    expect(build({ body: "" }).paragraphs).toEqual([]);
    expect(build({ body: "   \n\n  " }).paragraphs).toEqual([]);
  });
});

describe("buildCoverLetterModel — contact line", () => {
  it("unshifts the profile email when contacts lack one; labels joined ' | '", () => {
    const { contactLine } = build({
      contacts: [
        { type: "location", value: "Cairo, Egypt" },
        { type: "github", value: "salah" }
      ],
      profileEmail: "salah@example.com"
    });

    expect(contactLine).toBe("salah@example.com | Cairo, Egypt | github.com/salah");
  });

  it("keeps the contacts' own email (no unshift, no duplicate)", () => {
    const { contactLine } = build({
      contacts: [
        { type: "email", value: "salah@example.com" },
        { type: "github", value: "salah" }
      ],
      profileEmail: "salah@example.com"
    });

    expect(contactLine).toBe("salah@example.com | github.com/salah");
  });

  it("contactLine is null with no contacts and no profile email", () => {
    expect(build({ contacts: [], profileEmail: "" }).contactLine).toBeNull();
  });

  it("dedupes two contacts producing the same label", () => {
    const { contactLine } = build({
      contacts: [
        { type: "github", value: "salah", sortOrder: 0 },
        { type: "github", value: "salah", sortOrder: 1 }
      ],
      profileEmail: ""
    });

    expect(contactLine).toBe("github.com/salah");
  });

  it("honors real sortOrder over array order (DB sortOrder wins)", () => {
    const { contactLine } = build({
      contacts: [
        { type: "github", value: "salah", sortOrder: 2 },
        { type: "location", value: "Cairo, Egypt", sortOrder: 0 },
        { type: "website", value: "salah.dev", sortOrder: 1 }
      ],
      profileEmail: ""
    });

    expect(contactLine).toBe("Cairo, Egypt | salah.dev | github.com/salah");
  });

  it("contactLine is null when only unknown or empty-typed contacts remain", () => {
    expect(
      build({
        contacts: [
          { type: "unknown", value: "nope" },
          { type: "phone", value: "   " }
        ],
        profileEmail: ""
      }).contactLine
    ).toBeNull();
  });
});

describe("buildCoverLetterModel — commit round-trip", () => {
  it("re-joining committed paragraphs re-splits to the identical list", () => {
    const body = "First para.\nStill first.\n\nSecond para.\n\nWarm regards,\nSalah";
    const first = build({ body });
    const round = build({ body: first.paragraphs.map((p) => p.text).join("\n\n") });

    expect(round.paragraphs).toEqual(first.paragraphs);
  });

  it("collapses an intra-paragraph soft break (Enter) to a space on re-split", () => {
    const body = "Dear team,\nI am excited.\n\nSign off here";
    const first = build({ body });
    expect(first.paragraphs.map((p) => p.text)).toEqual([
      "Dear team, I am excited.",
      "Sign off here"
    ]);

    const round = build({ body: first.paragraphs.map((p) => p.text).join("\n\n") });
    expect(round.paragraphs.map((p) => p.text)).toEqual(first.paragraphs.map((p) => p.text));
  });
});

describe("buildCoverLetterModel — header fields", () => {
  it("suppresses whitespace-only company and roleTitle (null)", () => {
    const model = build({ companyName: "   ", roleTitle: "   " });

    expect(model.company).toBeNull();
    expect(model.roleTitle).toBeNull();
  });

  it("keeps trimmed company and roleTitle", () => {
    const model = build({ companyName: " Acme ", roleTitle: " Senior Engineer " });

    expect(model.company).toBe("Acme");
    expect(model.roleTitle).toBe("Senior Engineer");
  });

  it("formats the date like the PDF's formatLetterDate", () => {
    expect(build({ date: new Date(2026, 8, 9) }).dateLine).toBe("September 9, 2026");
  });

  it("name falls back to Candidate when blank", () => {
    expect(build({ candidateName: "   " }).name).toBe("Candidate");
    expect(build({ candidateName: " Salah " }).name).toBe("Salah");
  });
});
