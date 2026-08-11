import { type ContactOutput } from "@tsu-stack/core";

/**
 * Stable display order for profile contacts (DB `sort_order`, then type).
 * Use at every public/settings render path so client order matches dashboard drag order.
 */
export function sortContactsByOrder<T extends Pick<ContactOutput, "type" | "sortOrder">>(
  contacts: readonly T[]
): T[] {
  return [...contacts].toSorted((a, b) => {
    const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.type.localeCompare(b.type);
  });
}
