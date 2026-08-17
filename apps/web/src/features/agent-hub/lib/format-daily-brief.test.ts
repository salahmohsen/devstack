import { describe, expect, it } from "vitest";

import {
  formatDailyBriefMarkdown,
  isPlaceholderDailyBriefMarkdown,
  isTruncatedDailyBriefMarkdown,
  parseDailyBriefFacts,
  resolveDailyBriefMarkdown
} from "./format-daily-brief";

const facts = {
  dateLabel: "Monday, 17 August",
  inbox: [{ title: "Senior Front-End Developer", companyName: "Eventogy", matchScore: 88 }],
  mail: [{ subject: "Thank you for applying", labels: ["application"] }],
  tracked: [{ title: "Engineer", companyName: "Trivelta", stage: "applied" }],
  inboxCount: 1,
  mailCount: 8,
  trackedCount: 13
};

describe("formatDailyBriefMarkdown", () => {
  it("does not rebuild an inventory from facts", () => {
    const md = formatDailyBriefMarkdown(facts);
    expect(md).toMatch(/^# Monday, 17 August/m);
    expect(md).not.toMatch(/## New jobs \(1\)/);
    expect(md).toContain("Here is what landed");
  });

  it("keeps a short nothing-new letter", () => {
    expect(isTruncatedDailyBriefMarkdown("# Monday\n\nNothing new right now.")).toBe(false);
    expect(isTruncatedDailyBriefMarkdown("Monday, 17 August —")).toBe(true);
    expect(isTruncatedDailyBriefMarkdown("**New in")).toBe(true);
    expect(isPlaceholderDailyBriefMarkdown("# Monday, 17 August\n\nHere is what landed.")).toBe(
      true
    );
    expect(
      resolveDailyBriefMarkdown("# Monday, 17 August\n\nHere is what landed.", {
        ...facts,
        markdown: "# Monday\n\nNothing new right now.",
        empty: true
      })
    ).toBe("# Monday\n\nNothing new right now.");
  });

  it("keeps a full model letter and does not replace a cut-off with an inventory", () => {
    const full = [
      "# Monday, 17 August — the quiet kind.",
      "",
      "Mahmoud asked to book Degla Maadi.",
      "",
      "That's the whole plot."
    ].join("\n");
    expect(resolveDailyBriefMarkdown(full, facts)).toBe(full);
    expect(resolveDailyBriefMarkdown("Monday, 17 August —", facts)).not.toMatch(
      /## New jobs \(1\)/
    );
  });

  it("parses tool output including markdown", () => {
    expect(parseDailyBriefFacts(facts)?.inbox[0]?.companyName).toBe("Eventogy");
    expect(parseDailyBriefFacts({ markdown: "# Hi", dateLabel: "Today" })?.markdown).toBe("# Hi");
    expect(parseDailyBriefFacts({})).toBeNull();
  });
});
