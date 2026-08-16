import { type ToolCallMessagePartProps } from "@assistant-ui/react";

/**
 * Extract/fetch stays out of the tool slot. The hub working strip owns the
 * single "Reading listing…" shimmer so this renderer must stay empty.
 */
export function JobListingPreludeStatus(_props: ToolCallMessagePartProps) {
  return null;
}
