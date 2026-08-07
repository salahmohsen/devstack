import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "#@/common/sanitize-html";

describe("sanitizeHtml", () => {
  it("strips script tags and keeps text", () => {
    expect(sanitizeHtml(`<p>Hi</p><script>alert(1)</script>`)).toBe("<p>Hi</p>");
  });

  it("removes event handlers", () => {
    expect(sanitizeHtml(`<p onclick="alert(1)">x</p>`)).toBe("<p>x</p>");
  });

  it("neutralizes javascript: hrefs", () => {
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).toBe(
      `<a href="#" rel="noopener noreferrer">x</a>`
    );
  });

  it("keeps safe http links", () => {
    expect(sanitizeHtml(`<a href="https://example.com">x</a>`)).toBe(
      `<a href="https://example.com" rel="noopener noreferrer">x</a>`
    );
  });

  it("allows list markup used in portfolio bodies", () => {
    const input = `<ul><li>One</li><li><strong>Two</strong></li></ul>`;
    expect(sanitizeHtml(input)).toBe(`<ul><li>One</li><li><strong>Two</strong></li></ul>`);
  });

  it("returns empty string for non-strings", () => {
    expect(sanitizeHtml("")).toBe("");
    // @ts-expect-error intentional
    expect(sanitizeHtml(null)).toBe("");
  });
});
