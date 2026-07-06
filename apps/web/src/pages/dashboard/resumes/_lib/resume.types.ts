export const ResumeFilters = {
  All: "all"
} as const;

export type ResumeFilter = (typeof ResumeFilters)[keyof typeof ResumeFilters];
