import { formatForDisplay, formatHotkeySequence } from "@tanstack/react-hotkeys";

import { type CommandBinding } from "./types";

export function bindingDisplayParts(binding: CommandBinding): string[] {
  if (binding.kind === "sequence") {
    return binding.sequence.map((step) => formatForDisplay(step));
  }

  return formatForDisplay(binding.hotkey)
    .split(/[\s+]+/)
    .filter(Boolean);
}

export function bindingAriaLabel(binding: CommandBinding): string {
  if (binding.kind === "sequence") {
    return formatHotkeySequence(binding.sequence);
  }

  return formatForDisplay(binding.hotkey);
}

export function sequenceIsPrefixOf(short: readonly string[], long: readonly string[]): boolean {
  if (short.length >= long.length) return false;
  return short.every((step, index) => step === long[index]);
}
