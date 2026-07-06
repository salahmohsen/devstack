import { type ExperienceOutput } from "@tsu-stack/core";

import { createItemsUIStore } from "@/widgets/items-page";

import { ExperienceFilters, type ExperienceFilter } from "./experience.types";

export const useExperienceStore = createItemsUIStore<ExperienceOutput, "default", ExperienceFilter>(
  {
    initialTab: "default",
    initialFilter: ExperienceFilters.All
  }
);
