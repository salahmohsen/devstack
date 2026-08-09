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
  /** Chord keys shown in the palette and bound as a global sequence (e.g. `["D", "H"]`). */
  shortcut?: string[];
  action: CommandAction;
  priority?: number;
  meta?: CommandItemMeta;
  /** When true, item is only listed and shortcut-bound for signed-in users. */
  authRequired?: boolean;
};
