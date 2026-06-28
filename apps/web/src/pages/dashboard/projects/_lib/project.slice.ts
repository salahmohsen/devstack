import { type ProjectOutput } from "@tsu-stack/core/portfolio";

import { createItemsUIStore } from "@/widgets/items-page";

import { ProjectFilters, ProjectTabs, type ProjectFilter, type ProjectTab } from "./project.types";

export const useProjectStore = createItemsUIStore<ProjectOutput, ProjectTab, ProjectFilter>({
  initialTab: ProjectTabs.All,
  initialFilter: ProjectFilters.All
});
