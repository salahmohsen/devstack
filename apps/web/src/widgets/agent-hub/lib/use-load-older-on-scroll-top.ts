import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type UseLoadOlderOnScrollTopOptions = {
  enabled: boolean;
  hasMore: boolean;
  isLoading: boolean;
  loadOlder: () => Promise<void>;
  /** ThreadPrimitive.Viewport scroll element. */
  viewport: HTMLElement | null;
  /** Changes after prepend so we restore after the new rows paint. */
  messageCount: number;
  rootMargin?: string;
};

/**
 * IntersectionObserver on a top-of-thread sentinel. When it intersects,
 * load the next older page and restore `scrollTop` by the scrollHeight delta
 * so the first previously visible message stays put.
 */
export function useLoadOlderOnScrollTop({
  enabled,
  hasMore,
  isLoading,
  loadOlder,
  viewport,
  messageCount,
  rootMargin = "80px 0px 0px 0px"
}: UseLoadOlderOnScrollTopOptions): {
  sentinelRef: (node: HTMLElement | null) => void;
  loadError: boolean;
  retry: () => void;
} {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const pendingRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const loadOlderRef = useRef(loadOlder);

  useEffect(() => {
    loadOlderRef.current = loadOlder;
  }, [loadOlder]);

  const runLoad = useCallback(
    async (force = false) => {
      if (!hasMore || isLoading || loadingRef.current) return;
      if (loadError && !force) return;
      if (viewport) {
        pendingRestoreRef.current = {
          height: viewport.scrollHeight,
          top: viewport.scrollTop
        };
      }
      loadingRef.current = true;
      try {
        await loadOlderRef.current();
      } catch {
        pendingRestoreRef.current = null;
        setLoadError(true);
      }
      loadingRef.current = false;
    },
    [hasMore, isLoading, loadError, viewport]
  );

  useEffect(() => {
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void runLoad();
        }
      },
      {
        root: viewport,
        rootMargin,
        threshold: 0
      }
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [enabled, sentinel, viewport, rootMargin, runLoad]);

  useLayoutEffect(() => {
    if (isLoading) return;
    const snapshot = pendingRestoreRef.current;
    if (!snapshot) return;
    pendingRestoreRef.current = null;
    if (!viewport) return;
    const delta = viewport.scrollHeight - snapshot.height;
    if (delta === 0) return;
    viewport.scrollTo({ top: snapshot.top + delta, behavior: "instant" });
  }, [isLoading, messageCount, viewport]);

  const retry = useCallback(() => {
    setLoadError(false);
    void runLoad(true);
  }, [runLoad]);

  return { sentinelRef: setSentinel, loadError, retry };
}
