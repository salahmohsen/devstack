import { type Hotkey, type HotkeySequence } from "@tanstack/react-hotkeys";

export type CommandScope = "global" | "palette-closed" | "tabs";

export type CommandId =
  | "palette.toggle"
  | "shortcuts.cheatsheet"
  | "panel.close"
  | "nav:home"
  | "nav:dashboard"
  | "nav:onboarding"
  | "nav:experiences"
  | "nav:projects"
  | "nav:stacks"
  | "nav:resumes"
  | "nav:new-jobs"
  | "nav:tracked-jobs"
  | "nav:mail"
  | "nav:settings"
  | "nav:settings-profile"
  | "nav:settings-account"
  | "nav:settings-domain"
  | "nav:settings-connections"
  | "nav:settings-rules"
  | "nav:settings-jobs"
  | "nav:settings-ai"
  | "nav:settings-notifications"
  | "nav:settings-invites"
  | "nav:settings-shortcuts"
  | "nav:playground"
  | "nav:playground-agent"
  | "nav:profile"
  | "nav:repos"
  | "tabs.close"
  | "tabs.prev"
  | "tabs.next"
  | "tabs.select-1"
  | "tabs.select-2"
  | "tabs.select-3"
  | "tabs.select-4"
  | "tabs.select-5"
  | "tabs.select-6"
  | "tabs.select-7"
  | "tabs.select-8"
  | "tabs.select-9";

export type CommandBinding =
  | { kind: "hotkey"; hotkey: Hotkey }
  | { kind: "sequence"; sequence: HotkeySequence };

export type CommandDefinition = {
  id: CommandId;
  label: string;
  description: string;
  group: string;
  scope: CommandScope;
  /** When true, stays disabled until a surface calls `setCommandEnabled`. */
  gated?: boolean;
};

export const COMMAND_SEQUENCE_TIMEOUT_MS = 800;
export const COMMAND_BINDINGS_STORAGE_KEY = "tsu.command-bindings.v1";
