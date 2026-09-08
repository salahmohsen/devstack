import { describe, expect, it } from "vitest";

import { descriptionToBulletsHtml } from "#@/mastra/workflows/resume-import-workflow/description-bullets";

describe("descriptionToBulletsHtml", () => {
  it("splits newline-separated bullets into one <p> per bullet", () => {
    expect(
      descriptionToBulletsHtml("Architected platforms\nImplemented data layers\nOwned standards")
    ).toBe("<p>Architected platforms</p><p>Implemented data layers</p><p>Owned standards</p>");
  });

  it("splits inline bullet glyphs that the model joined into one line", () => {
    expect(descriptionToBulletsHtml("• First bullet • Second bullet")).toBe(
      "<p>First bullet</p><p>Second bullet</p>"
    );
  });

  it("strips leading dash markers per line", () => {
    expect(descriptionToBulletsHtml("- First\n- Second")).toBe("<p>First</p><p>Second</p>");
  });

  it("keeps 'Stack: a · b' intact — middot is not a bullet glyph", () => {
    const out = descriptionToBulletsHtml("Built the app\nStack: React · TanStack Query");
    expect(out).toBe("<p>Built the app</p><p>Stack: React · TanStack Query</p>");
  });

  it("converts <li>/<p> HTML into <p>-per-bullet and escapes entities", () => {
    expect(
      descriptionToBulletsHtml('<ul><li>Shipped &lt;fast&gt;</li><li>Owns "R&amp;D"</li></ul>')
    ).toBe('<p>Shipped &lt;fast&gt;</p><p>Owns "R&amp;D"</p>');
  });

  it("wraps a single-line description as one bullet", () => {
    expect(descriptionToBulletsHtml("One line only")).toBe("<p>One line only</p>");
  });

  it("returns empty for null/empty input", () => {
    expect(descriptionToBulletsHtml(null)).toBe("");
    expect(descriptionToBulletsHtml("   ")).toBe("");
  });
});
