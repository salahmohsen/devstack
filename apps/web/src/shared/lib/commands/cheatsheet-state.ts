import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function isShortcutCheatsheetOpen(): boolean {
  return open;
}

export function setShortcutCheatsheetOpen(value: boolean) {
  if (open === value) return;
  open = value;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useShortcutCheatsheetOpen() {
  return useSyncExternalStore(subscribe, isShortcutCheatsheetOpen, isShortcutCheatsheetOpen);
}
