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

  it("normalizes CRLF before splitting", () => {
    expect(splitOutreachParagraphs("A\r\n\r\nB")).toEqual(["A", "B"]);
  });

  it("treats whitespace-only blank lines as separators", () => {
    expect(splitOutreachParagraphs("A\n  \nB")).toEqual(["A", "B"]);
  });

  it("keeps single CRLF newlines inside one paragraph", () => {
    expect(splitOutreachParagraphs("Line one\r\nline two")).toEqual(["Line one\nline two"]);
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
    expect(model.contactLines).toEqual([
      { text: "mayokafor.dev", href: "https://mayokafor.dev" },
      { text: "github.com/mayokafor", href: "https://github.com/mayokafor" },
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

  it("compares types case-insensitively", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [{ type: "GITHUB", value: "mayokafor" }]
    });
    expect(model.contactLines).toEqual([
      { text: "github.com/mayokafor", href: "https://github.com/mayokafor" }
    ]);
  });

  it("falls back to stripUrl for x values pointing at twitter.com", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [{ type: "x", value: "twitter.com/foo" }]
    });
    expect(model.contactLines).toEqual([
      { text: "twitter.com/foo", href: "https://twitter.com/foo" }
    ]);
  });

  it("links scheme-less social URLs", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "github", value: "github.com/foo" },
        { type: "linkedin", value: "linkedin.com/in/foo" },
        { type: "x", value: "x.com/foo" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "github.com/foo", href: "https://github.com/foo" },
      { text: "linkedin.com/in/foo", href: "https://linkedin.com/in/foo" },
      { text: "x.com/foo", href: "https://x.com/foo" }
    ]);
  });

  it("keeps phone href verbatim with punctuation", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [{ type: "phone", value: "+1 (555) 123-4567" }]
    });
    expect(model.contactLines).toEqual([
      { text: "+1 (555) 123-4567", href: "tel:+1 (555) 123-4567" }
    ]);
  });

  it("strips tel:/mailto: prefixes before re-prefixing hrefs", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "phone", value: "tel:+15551234567" },
        { type: "email", value: "mailto:maya@example.com" },
        { type: "email", value: "nope" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "tel:+15551234567", href: "tel:+15551234567" },
      { text: "mailto:maya@example.com", href: "mailto:maya@example.com" },
      { text: "nope", href: null }
    ]);
  });

  it("trims subject and handles null senderName", () => {
    const model = buildOutreachMailModel({
      subject: "  S  ",
      bodyText: "Body",
      senderName: null,
      contacts: []
    });
    expect(model.subject).toBe("S");
    expect(model.senderName).toBe("");
  });

  it("links youtube, instagram, and telegram handles per pdf semantics", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "youtube", value: "@mayoka" },
        { type: "instagram", value: "@mayoka" },
        { type: "telegram", value: "@mayoka" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "@mayoka", href: "https://www.youtube.com/@mayoka" },
      { text: "@mayoka", href: "https://www.instagram.com/mayoka" },
      { text: "@mayoka", href: "https://t.me/mayoka" }
    ]);
  });

  it("links bluesky handles through bsky.app/profile", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [{ type: "bluesky", value: "mayoka.bsky.social" }]
    });
    expect(model.contactLines).toEqual([
      { text: "mayoka.bsky.social", href: "https://bsky.app/profile/mayoka.bsky.social" }
    ]);
  });

  it("maps mastodon user@host to https://host/@user and keeps bare handles unlinked", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "mastodon", value: "@user@host.com" },
        { type: "mastodon", value: "user@host.com" },
        { type: "mastodon", value: "mastodon.social" },
        { type: "mastodon", value: "handle" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "@user@host.com", href: "https://host.com/@user" },
      { text: "user@host.com", href: "https://host.com/@user" },
      { text: "mastodon.social", href: "https://mastodon.social" },
      { text: "handle", href: null }
    ]);
  });

  it("keeps dedicated-domain social URLs on their hosts", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "youtube", value: "youtube.com/@mayoka" },
        { type: "youtube", value: "youtu.be/abc123" },
        { type: "instagram", value: "instagram.com/mayoka" },
        { type: "telegram", value: "t.me/mayoka" },
        { type: "bluesky", value: "bsky.app/profile/mayoka.bsky.social" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "youtube.com/@mayoka", href: "https://youtube.com/@mayoka" },
      { text: "youtu.be/abc123", href: "https://youtu.be/abc123" },
      { text: "instagram.com/mayoka", href: "https://instagram.com/mayoka" },
      { text: "t.me/mayoka", href: "https://t.me/mayoka" },
      {
        text: "bsky.app/profile/mayoka.bsky.social",
        href: "https://bsky.app/profile/mayoka.bsky.social"
      }
    ]);
  });

  it("returns null href for location and prefixes protocol-relative URLs", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "location", value: "Berlin, DE" },
        { type: "website", value: "//mayokafor.dev" },
        { type: "x", value: "//x.com/mayoka" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "Berlin, DE", href: null },
      { text: "//mayokafor.dev", href: "https://mayokafor.dev" },
      { text: "//x.com/mayoka", href: "https://x.com/mayoka" }
    ]);
  });

  it("prefixes https for scheme-less websites and falls back to stripUrl for unknown types", () => {
    const model = buildOutreachMailModel({
      subject: "S",
      bodyText: "Body",
      senderName: "M",
      contacts: [
        { type: "website", value: "mayokafor.dev" },
        { type: "website", value: "localhost" },
        { type: "mystery", value: "example.com/xyz" },
        { type: "", value: "example.com/y" }
      ]
    });
    expect(model.contactLines).toEqual([
      { text: "mayokafor.dev", href: "https://mayokafor.dev" },
      { text: "localhost", href: null },
      { text: "example.com/xyz", href: "https://example.com/xyz" },
      { text: "example.com/y", href: "https://example.com/y" }
    ]);
  });
});
