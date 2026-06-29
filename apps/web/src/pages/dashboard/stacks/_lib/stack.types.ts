// Stacks don't have a tab dimension (no Live/Archived split) but the
// `createItemsUIStore` factory is generic over a Tab type, so we declare
// a single-valued union here. This keeps the experience and stack
// pages on the same code path (same store, same nav hooks, same items
// widget) without forcing one of them to invent a fake tab set.
export const StackTabs = {
  All: "all"
} as const;

export type StackTab = (typeof StackTabs)[keyof typeof StackTabs];

export const StackFilters = {
  All: "all"
} as const;

export type StackFilter = (typeof StackFilters)[keyof typeof StackFilters];

export function isStackTab(value: string): value is StackTab {
  return (Object.values(StackTabs) as string[]).includes(value);
}
