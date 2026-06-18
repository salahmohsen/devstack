import { parseAsString, useQueryState } from "nuqs";

type UseItemsTabUrlSyncOptions<Tab extends string> = {
  paramName?: string;
  defaultTab: Tab;
  isValidTab: (tab: string) => tab is Tab;
};

/**
 * Two-way sync between `?tab=...` in the URL and the page's active tab.
 *
 * - On mount / URL change, `tab` returns the validated value.
 * - Calling `setTab(newTab)` updates the URL; the next render of `tab`
 *   reflects the validated value.
 */
export function useItemsTabUrlSync<Tab extends string>({
  paramName = "tab",
  defaultTab,
  isValidTab
}: UseItemsTabUrlSyncOptions<Tab>) {
  const parser = parseAsString.withDefault(defaultTab);
  const [tab, setTab] = useQueryState(paramName, parser);

  const tabFromUrl: Tab = isValidTab(tab) ? tab : defaultTab;

  const safeSetTab = (next: string) => {
    if (next === tab) return;
    if (!isValidTab(next)) return;
    void setTab(next);
  };

  return { tab: tabFromUrl, setTab: safeSetTab };
}
