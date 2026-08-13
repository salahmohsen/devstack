import { describe, expect, it } from "vitest";

import { formatHubDayLabel, formatHubTimeLabel, messageCreatedAt } from "./hub-ui-message-time";

describe("messageCreatedAt", () => {
  it("reads ISO metadata.createdAt from listHubMessages", () => {
    expect(
      messageCreatedAt({
        metadata: { createdAt: "2026-08-13T12:00:00.000Z" }
      })
    ).toEqual(new Date("2026-08-13T12:00:00.000Z"));
  });

  it("falls back to top-level createdAt", () => {
    expect(messageCreatedAt({ createdAt: "2026-08-11T08:30:00.000Z" })).toEqual(
      new Date("2026-08-11T08:30:00.000Z")
    );
  });

  it("prefers metadata.createdAt over top-level createdAt", () => {
    expect(
      messageCreatedAt({
        createdAt: "2026-08-13T12:00:00.000Z",
        metadata: { createdAt: "2026-01-01T00:00:00.000Z" }
      })
    ).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("returns null when the date is missing or invalid", () => {
    expect(messageCreatedAt({})).toBeNull();
    expect(messageCreatedAt({ metadata: { createdAt: "not-a-date" } })).toBeNull();
    expect(messageCreatedAt({ createdAt: "" })).toBeNull();
    expect(messageCreatedAt({ metadata: "nope" })).toBeNull();
  });
});

describe("formatHubDayLabel", () => {
  const now = new Date(2026, 7, 13, 15, 30, 0);

  it("labels the local calendar day as Today across the day boundary", () => {
    expect(formatHubDayLabel(new Date(2026, 7, 13, 0, 0, 0), now)).toBe("Today");
    expect(formatHubDayLabel(new Date(2026, 7, 13, 23, 59, 59), now)).toBe("Today");
  });

  it("labels the previous local calendar day as Yesterday", () => {
    expect(formatHubDayLabel(new Date(2026, 7, 12, 0, 0, 0), now)).toBe("Yesterday");
    expect(formatHubDayLabel(new Date(2026, 7, 12, 23, 59, 59), now)).toBe("Yesterday");
  });

  it("uses weekday + date for older days in the same year", () => {
    expect(formatHubDayLabel(new Date(2026, 7, 11, 12, 0, 0), now)).toBe("Tuesday, Aug 11");
  });

  it("includes the year when the day is not this year", () => {
    expect(formatHubDayLabel(new Date(2025, 7, 11, 12, 0, 0), now)).toBe("Monday, Aug 11, 2025");
  });
});

describe("formatHubTimeLabel", () => {
  it("formats local 24-hour HH:mm", () => {
    expect(formatHubTimeLabel(new Date(2026, 7, 13, 9, 5, 0))).toBe("09:05");
    expect(formatHubTimeLabel(new Date(2026, 7, 13, 21, 0, 0))).toBe("21:00");
  });
});
