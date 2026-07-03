import { HomeIcon } from "lucide-react";

import { ArchiveIcon, SettingsIcon } from "@/lib/command-palette-icons";

import { type CommandItem } from "./types";

let commands: CommandItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function registerCommands(items: CommandItem[]): () => void {
  commands = [...commands, ...items];
  emit();
  return () => {
    const ids = new Set(items.map((i) => i.id));
    commands = commands.filter((c) => !ids.has(c.id));
    emit();
  };
}

export function getRegisteredCommands(): CommandItem[] {
  return commands;
}

export function subscribeCommands(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

registerCommands([
  {
    id: "nav:overview",
    label: "Go to Home",
    group: "Pages",
    icon: HomeIcon,
    keywords: ["home", "dashboard"],
    shortcut: ["G", "H"],
    action: { type: "navigate", to: "/" }
  },
  {
    id: "nav:repos",
    label: "Go to Repositories",
    group: "Pages",
    icon: ArchiveIcon,
    keywords: ["repos", "code"],
    shortcut: ["G", "O"],
    action: { type: "navigate", to: "/repos" }
  },
  {
    id: "admin:projects",
    label: "Edit projects",
    group: "Pages",
    icon: ArchiveIcon,
    keywords: ["admin", "dashboard", "projects"],
    shortcut: ["G", "P"],
    action: { type: "navigate", to: "/dashboard/projects" }
  },
  // {
  //   id: "nav:pulls",
  //   label: "Go to Pull Requests",
  //   group: "Pages",
  //   icon: GitPullRequestIcon,
  //   keywords: ["pr", "merge"],
  //   shortcut: ["G", "P"],
  //   action: { type: "navigate", to: "/pulls" }
  // },
  // {
  //   id: "nav:issues",
  //   label: "Go to Issues",
  //   group: "Pages",
  //   icon: IssuesIcon,
  //   keywords: ["bug", "task"],
  //   shortcut: ["G", "I"],
  //   action: { type: "navigate", to: "/issues" }
  // },
  // {
  //   id: "nav:reviews",
  //   label: "Go to Reviews",
  //   group: "Pages",
  //   icon: ReviewsIcon,
  //   keywords: ["review", "requested"],
  //   shortcut: ["G", "R"],
  //   action: { type: "navigate", to: "/reviews" }
  // },
  {
    id: "nav:dashboard",
    label: "Go to Dashboard",
    group: "Pages",
    icon: SettingsIcon,
    keywords: ["settings", "preferences", "config"],
    shortcut: ["G", "D"],
    action: { type: "navigate", to: "/dashboard" }
  }
  // {
  //   id: "action:open-current-page-on-github",
  //   label: "Open Current Page on GitHub",
  //   group: "Actions",
  //   icon: ExternalLinkIcon,
  //   keywords: ["github", "redirect", "current page", "open"],
  //   shortcut: ["G", "G"],
  //   action: {
  //     type: "execute",
  //     fn: () => {
  //       window.location.href = `${window.location.origin}/api/github/redirect${window.location.pathname}${window.location.search}`;
  //     }
  //   }
  // }
]);
