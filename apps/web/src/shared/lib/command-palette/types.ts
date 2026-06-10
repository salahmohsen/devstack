import { type ComponentType } from "react";

export type CommandAction =
  | { type: "navigate"; to: string; params?: Record<string, string> }
  | { type: "execute"; fn: () => void | Promise<void> };

export type CommandItemMeta = {
  repo?: string;
  comments?: number;
  updatedAt?: string;
  language?: string;
  stars?: number;
};

export type CommandItem = {
  id: string;
  label: string;
  group: string;
  icon?: ComponentType<{ className?: string }>;
  iconClassName?: string;
  keywords?: string[];
  shortcut?: string[];
  action: CommandAction;
  priority?: number;
  meta?: CommandItemMeta;
};
