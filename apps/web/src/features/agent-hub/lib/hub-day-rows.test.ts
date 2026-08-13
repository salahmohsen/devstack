import { type UIMessage } from "@ai-sdk/react";
import { describe, expect, it } from "vitest";

import { buildHubDayRows } from "./hub-day-rows";

function msg(id: string, createdAt: string, role: "user" | "assistant" = "user"): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text: id }],
    metadata: { createdAt }
  } as UIMessage;
}

describe("buildHubDayRows", () => {
  it("inserts a day rule when the calendar day changes", () => {
    const now = new Date("2026-08-13T18:00:00");
    const rows = buildHubDayRows(
      [
        msg("a", "2026-08-11T10:00:00"),
        msg("b", "2026-08-11T11:00:00"),
        msg("c", "2026-08-13T09:00:00")
      ],
      now
    );
    expect(rows.map((r) => r.showDay)).toEqual([true, false, true]);
    expect(rows[0]?.dayLabel).toBe("Tuesday, Aug 11");
    expect(rows[2]?.dayLabel).toBe("Today");
  });
});
