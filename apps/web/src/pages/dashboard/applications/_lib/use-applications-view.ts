"use client";

import { useCallback, useEffect, useState } from "react";

import { useHasMounted } from "@/shared/lib/use-has-mounted";

export type ApplicationsView = "board" | "list";

const STORAGE_KEY = "applications:view";

function readStoredView(): ApplicationsView | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "board" || raw === "list") return raw;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Board-first default; after mount, restore last choice from localStorage.
 * Avoids SSR/client hydration mismatch by ignoring storage until mounted.
 */
export function useApplicationsView() {
  const hasMounted = useHasMounted();
  const [view, setViewState] = useState<ApplicationsView>("board");

  useEffect(() => {
    if (!hasMounted) return;
    const stored = readStoredView();
    if (stored) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setViewState(stored);
    }
  }, [hasMounted]);

  const setView = useCallback((next: ApplicationsView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore quota / private mode
    }
  }, []);

  return { view, setView, hasMounted } as const;
}
