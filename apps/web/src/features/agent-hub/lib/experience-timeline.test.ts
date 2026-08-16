import { describe, expect, it } from "vitest";

import { experiencesToTimelineEvents, type HubExperienceRow } from "./experience-timeline";

function row(partial: Partial<HubExperienceRow> & Pick<HubExperienceRow, "id">): HubExperienceRow {
  return {
    title: partial.title ?? partial.id,
    organization: partial.organization ?? "Org",
    fromDate: partial.fromDate ?? null,
    toDate: partial.toDate ?? null,
    isPresent: partial.isPresent ?? false,
    summary: partial.summary ?? null,
    ...partial
  };
}

describe("experiencesToTimelineEvents", () => {
  it("orders current role first, then later dates", () => {
    const events = experiencesToTimelineEvents([
      row({ id: "old", fromDate: "2023-01-01", toDate: "2024-01-01", title: "Old" }),
      row({ id: "now", fromDate: "2025-01-01", isPresent: true, title: "Now" }),
      row({ id: "mid", fromDate: "2024-02-01", toDate: "2025-01-01", title: "Mid" })
    ]);
    expect(events.map((event) => event.id)).toEqual(["now", "mid", "old"]);
    expect(events[0]?.time).toBe("Now");
  });

  it("keeps HTML summary off the meta line", () => {
    const [event] = experiencesToTimelineEvents([
      row({
        id: "html",
        organization: "Ment'ech",
        projectCount: 3,
        summary: "<p>Architected scalable Next.js platforms.</p>"
      })
    ]);
    expect(event?.detail).toBe("Ment'ech · 3 projects");
    expect(event?.summaryHtml).toBe("<p>Architected scalable Next.js platforms.</p>");
  });
});
