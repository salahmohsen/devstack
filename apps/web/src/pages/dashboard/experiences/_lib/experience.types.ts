export const ExperienceFilters = {
  All: "all"
} as const;

export type ExperienceFilter = (typeof ExperienceFilters)[keyof typeof ExperienceFilters];
