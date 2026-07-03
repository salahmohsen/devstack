import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function isOpen(): boolean {
  return open;
}

export function setCommandPaletteOpen(value: boolean) {
  open = value;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCommandPaletteOpen() {
  return useSyncExternalStore(subscribe, isOpen, isOpen);
}
