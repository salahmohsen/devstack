// Projects don't have a tab dimension (no Live/Archived split) but the
// `createItemsUIStore` factory is generic over a Tab type, so we declare
// a single-valued union here. This keeps the experience and project
// pages on the same code path (same store, same nav hooks, same items
// widget) without forcing one of them to invent a fake tab set.
export const ProjectTabs = {
  All: "all"
} as const;

export type ProjectTab = (typeof ProjectTabs)[keyof typeof ProjectTabs];

export const ProjectFilters = {
  All: "all"
} as const;

export type ProjectFilter = (typeof ProjectFilters)[keyof typeof ProjectFilters];

export function isProjectTab(value: string): value is ProjectTab {
  return (Object.values(ProjectTabs) as string[]).includes(value);
}
