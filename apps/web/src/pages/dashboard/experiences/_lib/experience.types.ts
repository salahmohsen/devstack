export const ExperienceTabs = {
  Live: "live",
  Archived: "archived"
} as const;

export type ExperienceTab = (typeof ExperienceTabs)[keyof typeof ExperienceTabs];

export const ExperienceFilters = {
  All: "all"
} as const;

export type ExperienceFilter = (typeof ExperienceFilters)[keyof typeof ExperienceFilters];

export function isExperienceTab(value: string): value is ExperienceTab {
  return (Object.values(ExperienceTabs) as string[]).includes(value);
}
