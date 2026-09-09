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

  it("passes invalid recipient through as NO_RECIPIENT", () => {
    expect(
      resolveOutreachSendValues({ ...base, recruiterEmail: null, overrides: { to: null } })
    ).toEqual({
      error: "NO_RECIPIENT"
    });
  });
});
