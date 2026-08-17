import { describe, expect, it } from "vitest";

import {
  formatDailyBriefMarkdown,
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
  it("builds headed sections from facts", () => {
    const md = formatDailyBriefMarkdown(facts);
    expect(md).toMatch(/^# Monday, 17 August/m);
    expect(md).toMatch(/## New jobs \(1\)/);
    expect(md).toContain("**Eventogy** — Senior Front-End Developer · 88%");
    expect(md).toMatch(/## Mail \(8\)/);
    expect(md).toContain("Thank you for applying · application");
    expect(md).toMatch(/## Tracked \(13\)/);
    expect(md).toContain("**Trivelta** — Engineer · applied");
  });

  it("treats a cut-off opener as truncated", () => {
    expect(isTruncatedDailyBriefMarkdown("Monday, 17 August — the")).toBe(true);
    expect(isTruncatedDailyBriefMarkdown("**New in")).toBe(true);
  });

  it("keeps a full model letter and replaces a stub with facts", () => {
    const full = [
      "# Monday, 17 August — the quiet kind.",
      "",
      "## New jobs",
      "- Eventogy, 88%.",
      "",
      "That's the whole plot."
    ].join("\n");
    expect(resolveDailyBriefMarkdown(full, facts)).toBe(full);
    expect(resolveDailyBriefMarkdown("Monday, 17 August — the", facts)).toMatch(
      /## New jobs \(1\)/
    );
  });

  it("parses tool output", () => {
    expect(parseDailyBriefFacts(facts)?.inbox[0]?.companyName).toBe("Eventogy");
    expect(parseDailyBriefFacts({})).toBeNull();
  });
});
