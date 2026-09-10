import { describe, expect, it } from "vitest";

import { resolveOutreachSendValues } from "#@/lib/application/outreach-send-plan";

const base = {
  recruiterEmail: "stored@company.com",
  outreachSubject: "Stored subject",
  outreachBody: "Stored body"
};

describe("resolveOutreachSendValues", () => {
  it("uses stored rows without overrides", () => {
    expect(resolveOutreachSendValues(base)).toEqual({
      to: "stored@company.com",
      subject: "Stored subject",
      body: "Stored body",
      attachments: { resume: true, cover: true }
    });
  });

  it("overrides win over stored rows", () => {
    expect(
      resolveOutreachSendValues({
        ...base,
        overrides: { to: "new@company.com", subject: "New", body: "New body" }
      })
    ).toEqual({
      to: "new@company.com",
      subject: "New",
      body: "New body",
      attachments: { resume: true, cover: true }
    });
  });

  it("rejects all-off attachment selection", () => {
    expect(
      resolveOutreachSendValues({
        ...base,
        overrides: { attachments: { resume: false, cover: false } }
      })
    ).toEqual({ error: "NO_ATTACHMENTS" });
  });

  it("rejects empty subject/body as NO_MESSAGE", () => {
    expect(
      resolveOutreachSendValues({
        recruiterEmail: "a@b.com",
        outreachSubject: null,
        outreachBody: null
      })
    ).toEqual({
      error: "NO_MESSAGE"
    });
  });

  it("falls back to stored recipient when override to is empty string", () => {
    // API schema maps "" → null before the resolver; resolver-level "" takes
    // the same fallback path.
    expect(resolveOutreachSendValues({ ...base, overrides: { to: "" } })).toEqual({
      to: "stored@company.com",
      subject: "Stored subject",
      body: "Stored body",
      attachments: { resume: true, cover: true }
    });
  });

  it("falls back to stored recipient when override to is whitespace-only", () => {
    expect(resolveOutreachSendValues({ ...base, overrides: { to: "   " } })).toEqual({
      to: "stored@company.com",
      subject: "Stored subject",
      body: "Stored body",
      attachments: { resume: true, cover: true }
    });
  });

  it("treats whitespace-only subject override as NO_MESSAGE", () => {
    expect(resolveOutreachSendValues({ ...base, overrides: { subject: "   " } })).toEqual({
      error: "NO_MESSAGE"
    });
  });

  it("partial override takes subject from override and body from stored row", () => {
    expect(resolveOutreachSendValues({ ...base, overrides: { subject: "New subject" } })).toEqual({
      to: "stored@company.com",
      subject: "New subject",
      body: "Stored body",
      attachments: { resume: true, cover: true }
    });
  });

  it("keeps partial attachment selection", () => {
    expect(
      resolveOutreachSendValues({
        ...base,
        overrides: { attachments: { resume: false, cover: true } }
      })
    ).toEqual({
      to: "stored@company.com",
      subject: "Stored subject",
      body: "Stored body",
      attachments: { resume: false, cover: true }
    });
  });

  it("passes invalid recipient through as NO_RECIPIENT", () => {
    expect(
      resolveOutreachSendValues({ ...base, recruiterEmail: null, overrides: { to: null } })
    ).toEqual({
      error: "NO_RECIPIENT"
    });
  });
});
