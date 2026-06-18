import { type ExperienceOutput } from "@tsu-stack/core/portfolio";

import { createItemsUIStore } from "@/widgets/items-page";

import {
  ExperienceFilters,
  ExperienceTabs,
  type ExperienceFilter,
  type ExperienceTab
} from "./experience.types";

export const useExperienceStore = createItemsUIStore<
  ExperienceOutput,
  ExperienceTab,
  ExperienceFilter
>({
  initialTab: ExperienceTabs.Live,
  initialFilter: ExperienceFilters.All
});
