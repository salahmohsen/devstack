import { bind, play, setEnabled } from "cuelume";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "cuelume-enabled";

let toastWrapped = false;

export function readCuelumeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "false") return false;
  if (stored === "true") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function writeCuelumeEnabled(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  setEnabled(enabled);
  window.dispatchEvent(new Event("cuelume-enabled"));
}

function subscribeCuelumeEnabled(onStoreChange: () => void) {
  window.addEventListener("cuelume-enabled", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("cuelume-enabled", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function wrapToastSounds(): void {
  if (toastWrapped) return;
  toastWrapped = true;

  const success = toast.success.bind(toast);
  const error = toast.error.bind(toast);

  toast.success = ((...args: Parameters<typeof toast.success>) => {
    play("success");
    return success(...args);
  }) as typeof toast.success;

  toast.error = ((...args: Parameters<typeof toast.error>) => {
    play("error");
    return error(...args);
  }) as typeof toast.error;
}

/** Call once on the client: delegated `data-cuelume-*` + toast outcomes. */
export function startCuelume(): void {
  bind();
  setEnabled(readCuelumeEnabled());
  wrapToastSounds();
}

export function useCuelumeEnabled() {
  const enabled = useSyncExternalStore(subscribeCuelumeEnabled, readCuelumeEnabled, () => true);
  return [enabled, writeCuelumeEnabled] as const;
}
