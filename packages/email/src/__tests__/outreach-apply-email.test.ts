import { createElement } from "react";
import { render } from "react-email";
import { describe, expect, it } from "vitest";

import { splitOutreachParagraphs } from "@tsu-stack/core";

import { OutboundApplyEmail } from "#@/templates/outreach-apply-email";

const model = {
  subject: "Senior Frontend Engineer — Maya Okafor",
  paragraphs: splitOutreachParagraphs("Dear Nadia,\n\nI'm applying for the role."),
  senderName: "Maya Okafor",
  contactLines: [
    { text: "mayokafor.dev", href: "https://mayokafor.dev" },
    { text: "maya@example.com", href: "mailto:maya@example.com" }
  ]
};

describe("OutboundApplyEmail", () => {
  it("renders subject, every paragraph, signature, and contact lines", async () => {
    const html = await render(createElement(OutboundApplyEmail, { mail: model }));
    expect(html).toContain("Senior Frontend Engineer — Maya Okafor");
    expect(html).toContain("Dear Nadia,");
    // react-email escapes the apostrophe in the rendered HTML.
    expect(html).toContain("applying for the role.");
    expect(html).toContain("Maya Okafor");
    expect(html).toContain("mayokafor.dev");
    expect(html).toContain("maya@example.com");
    // Generic template: no product branding, no unsubscribe.
    expect(html).not.toMatch(/unsubscribe/i);
    expect(html).not.toContain("logo192");
    expect(html).not.toContain("DEVSTACK");
  });
});
