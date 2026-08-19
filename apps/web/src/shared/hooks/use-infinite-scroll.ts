import { useEffect, useRef, useState, type RefCallback } from "react";

export type UseInfiniteScrollOptions = {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  enabled?: boolean;
  /** CSS margin around the root (default `"200px"`). */
  rootMargin?: string;
  /**
   * Scrollport for IntersectionObserver. When omitted, uses the nearest
   * `[data-slot=scroll-area-viewport]` (dashboard shell) or the browser viewport.
   */
  root?: Element | null;
};

function resolveScrollRoot(from: Element): Element | null {
  return from.closest("[data-slot=scroll-area-viewport]");
}

/** Parse a single-value `rootMargin` like `"200px"` into pixels (0 on failure). */
function rootMarginPx(rootMargin: string | undefined): number {
  if (!rootMargin) return 0;
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(rootMargin.trim());
  return match ? Number(match[1]) : 0;
}

/**
 * Geometry fallback when IntersectionObserver lags behind layout (e.g. sidepanel
 * squeeze moves the sentinel into view without an IO notification).
 */
function isSentinelInRoot(sentinel: Element, root: Element | null, marginPx: number): boolean {
  const tr = sentinel.getBoundingClientRect();
  const rr = root
    ? root.getBoundingClientRect()
    : ({
        top: 0,
        left: 0,
        bottom: window.innerHeight,
        right: window.innerWidth
      } as DOMRect);

  return (
    tr.top < rr.bottom + marginPx &&
    tr.bottom > rr.top - marginPx &&
    tr.left < rr.right + marginPx &&
    tr.right > rr.left - marginPx
  );
}

/**
 * Observes a bottom-of-list sentinel and calls `fetchNextPage` when it is
 * visible and more pages are available. Re-triggers while the sentinel stays
 * in view after a fetch settles (fills short viewports / compact layouts).
 *
 * Uses a callback ref so the observer binds after the sentinel mounts (skeleton
 * → list), and ResizeObserver so sidepanel layout changes re-check visibility.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enabled = true,
  rootMargin = "200px",
  root: rootProp
}: UseInfiniteScrollOptions): { sentinelRef: RefCallback<T> } {
  const [sentinel, setSentinel] = useState<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const fetchNextPageRef = useRef(fetchNextPage);

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
  }, [fetchNextPage]);

  useEffect(() => {
    if (!sentinel || !enabled) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setIsIntersecting(false);
      return;
    }

    const resolvedRoot = rootProp !== undefined ? rootProp : resolveScrollRoot(sentinel);
    const marginPx = rootMarginPx(rootMargin);

    const applyVisibility = (next: boolean) => {
      setIsIntersecting((prev) => (prev === next ? prev : next));
    };

    const measure = () => {
      applyVisibility(isSentinelInRoot(sentinel, resolvedRoot, marginPx));
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        applyVisibility(Boolean(entry?.isIntersecting));
      },
      {
        root: resolvedRoot,
        rootMargin,
        threshold: 0
      }
    );

    observer.observe(sentinel);
    // Immediate geometry pass — IO’s first callback can lag behind layout.
    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(sentinel);
    if (resolvedRoot instanceof Element) {
      resizeObserver.observe(resolvedRoot);
    }
    if (sentinel.parentElement) {
      resizeObserver.observe(sentinel.parentElement);
    }

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [enabled, rootProp, rootMargin, sentinel]);

  useEffect(() => {
    if (!enabled || !isIntersecting || !hasNextPage || isFetchingNextPage) {
      return;
    }
    fetchNextPageRef.current();
  }, [enabled, isIntersecting, hasNextPage, isFetchingNextPage]);

  return { sentinelRef: setSentinel };
}
