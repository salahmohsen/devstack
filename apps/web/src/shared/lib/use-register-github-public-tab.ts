import { useLayoutEffect } from "react";

import { addTab, type Tab, type TabType } from "@/shared/lib/tab-store";

const TAB_ICON_COLORS: Partial<Record<TabType, string>> = {
  repo: "text-blue-500",
  pull: "text-green-500",
  issue: "text-green-500"
};

export type RegisterableGithubTab = {
  tabId?: string;
  iconColor?: string;
} & Omit<Tab, "id" | "iconColor"> & {
    type: TabType;
  };

/**
 * Opens / updates a topbar tab for the current page.
 * Uses layout effect so the tab appears before paint (no wait for overview query).
 */
export function useRegisterGithubPublicTab(tab: RegisterableGithubTab | null) {
  useLayoutEffect(() => {
    if (!tab?.title || !tab.url.startsWith("/")) {
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
      url: tab.url,
      number: tab.number,
      additions: tab.additions,
      deletions: tab.deletions,
      merged: tab.merged
    });
  }, [
    tab?.type,
    tab?.title,
    tab?.number,
    tab?.url,
    tab?.repo,
    tab?.iconColor,
    tab?.avatarUrl,
    tab?.additions,
    tab?.deletions,
    tab?.merged,
    tab?.tabId
  ]);
}
