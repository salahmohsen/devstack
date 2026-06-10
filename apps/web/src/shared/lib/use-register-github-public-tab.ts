import { useEffect } from "react";

import { addTab, type Tab, type TabType } from "@/shared/lib/tab-store";

const TAB_ICON_COLORS: Partial<Record<TabType, string>> = {
  repo: "text-blue-500",
  pull: "text-green-500",
  issue: "text-green-500"
};

export function useRegisterGithubPublicTab(
  tab:
    | ({
        tabId?: string;
        iconColor?: string;
      } & Omit<Tab, "id" | "iconColor"> & {
          type: TabType;
        })
    | null
) {
  useEffect(() => {
    if (!tab?.title) {
      return;
    }

    const id = tab.tabId ?? `${tab.type}:${tab.repo}`;
    addTab({
      avatarUrl: tab.avatarUrl,
      id,
      iconColor: tab.iconColor ?? TAB_ICON_COLORS[tab.type] ?? "text-muted-foreground",
      repo: tab.repo,
      title: tab.title,
      type: tab.type,
      url: tab.url
    });
  }, [tab]);
}
