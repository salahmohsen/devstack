function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Timestamp for day separators. Prefers `metadata.createdAt` (ISO from
 * `listHubMessages`) then a top-level `createdAt`.
 */
export function messageCreatedAt(message: {
  metadata?: unknown;
  createdAt?: unknown;
}): Date | null {
  if (isRecord(message.metadata)) {
    const fromMetadata = parseDate(message.metadata.createdAt);
    if (fromMetadata) return fromMetadata;
  }
  return parseDate(message.createdAt);
}

/** "Today" | "Yesterday" | weekday + date (`Tuesday, Aug 11`). */
export function formatHubDayLabel(d: Date, now: Date = new Date()): string {
  const day = startOfLocalDay(d).getTime();
  const today = startOfLocalDay(now).getTime();
  if (day === today) return "Today";

  const yesterday = startOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  ).getTime();
  if (day === yesterday) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" })
  });
}

/** Local 24-hour `HH:mm`. */
export function formatHubTimeLabel(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
