import { type ResumeOutput } from "@tsu-stack/core/resume";

import { createItemsUIStore } from "@/widgets/items-page";

import { ResumeFilters, type ResumeFilter } from "@/pages/dashboard/resumes/_lib/resume.types";

export const useResumeStore = createItemsUIStore<ResumeOutput, "default", ResumeFilter>({
  initialTab: "default",
  initialFilter: ResumeFilters.All
});
