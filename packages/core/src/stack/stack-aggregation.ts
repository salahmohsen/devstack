import { type StackOutput } from "#@/stack/types";

export type StackTypeSummary = Record<string, number>;

/**
 * Aggregate stacks by their type field.
 * Returns a record mapping type name → count of stacks of that type.
 * Stacks with null type are grouped under "other".
 */
export function aggregateStacksByType(stacks: StackOutput[]): StackTypeSummary {
  const summary: StackTypeSummary = {};
  for (const stack of stacks) {
    const type = stack.type ?? "other";
    summary[type] = (summary[type] ?? 0) + 1;
  }
  return summary;
}

/**
 * Get the primary (most common) stack type from a list of stacks.
 * Returns null if the list is empty.
 */
export function getPrimaryStackType(stacks: StackOutput[]): string | null {
  if (stacks.length === 0) return null;
  const summary = aggregateStacksByType(stacks);
  let maxCount = 0;
  let primary: string | null = null;
  for (const [type, count] of Object.entries(summary)) {
    if (count > maxCount) {
      maxCount = count;
      primary = type;
    }
  }
  return primary;
}

/**
 * Get sorted stack types by count (descending).
 */
export function getStackTypesByCount(
  stacks: StackOutput[]
): Array<{ type: string; count: number }> {
  const summary = aggregateStacksByType(stacks);
  return Object.entries(summary)
    .map(([type, count]) => {
      return { type, count };
    })
    .toSorted((a, b) => b.count - a.count);
}
