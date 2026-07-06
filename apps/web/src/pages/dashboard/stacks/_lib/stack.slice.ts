import { type StackOutput } from "@tsu-stack/core";

import { createItemsUIStore } from "@/widgets/items-page";

import { StackFilters, StackTabs, type StackFilter, type StackTab } from "./stack.types";

export const useStackStore = createItemsUIStore<StackOutput, StackTab, StackFilter>({
  initialTab: StackTabs.All,
  initialFilter: StackFilters.All
});
