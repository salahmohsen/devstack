import { useSyncExternalStore } from "react";

const DATA_ATTR = "mobileDockHidden";

/**
 * When true, the floating mobile dock hides (e.g. batch edit bar is up).
 * Uses a documentElement data attribute so the flag is process-wide (HMR-safe).
 */
export function setMobileDockHidden(hidden: boolean): void {
  if (typeof document === "undefined") return;
  if (hidden) {
    document.documentElement.dataset[DATA_ATTR] = "1";
  } else {
    delete document.documentElement.dataset[DATA_ATTR];
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [`data-mobile-dock-hidden`]
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset[DATA_ATTR] === "1";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMobileDockHidden(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
