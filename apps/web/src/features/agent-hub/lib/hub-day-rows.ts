import { type UIMessage } from "@ai-sdk/react";

import { formatHubDayLabel, formatHubTimeLabel, messageCreatedAt } from "./hub-ui-message-time";

export type HubDayRow = {
  id: string;
  showDay: boolean;
  dayLabel: string | null;
  timeLabel: string | null;
  role: string;
};

/** Pure grouping for day separators. No TAP / assistant-ui hooks. */
export function buildHubDayRows(hubMessages: UIMessage[], now = new Date()): HubDayRow[] {
  const labeled = hubMessages.map((message) => {
    const createdAt = messageCreatedAt(message);
    return {
      id: message.id,
      createdAt,
      dayLabel: createdAt ? formatHubDayLabel(createdAt, now) : null,
      role: message.role
    };
  });

  return labeled.map((row, index) => {
    const previousDay = labeled
      .slice(0, index)
      .toReversed()
      .find((previous) => previous.dayLabel != null)?.dayLabel;
    return {
      id: row.id,
      showDay: row.dayLabel != null && row.dayLabel !== previousDay,
      dayLabel: row.dayLabel,
      timeLabel: row.createdAt ? formatHubTimeLabel(row.createdAt) : null,
      role: row.role
    };
  });
}
