import { type RefObject, useEffect, useRef, useState } from "react";

export type UseInfiniteScrollOptions = {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  enabled?: boolean;
  rootMargin?: string;
  root?: Element | null;
};

/**
 * Observes a bottom-of-list sentinel and calls `fetchNextPage` when it is
 * visible and more pages are available. Re-triggers while the sentinel stays
 * in view after a fetch settles (IntersectionObserver only fires on change).
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enabled = true,
  rootMargin,
  root = null
}: UseInfiniteScrollOptions): { sentinelRef: RefObject<HTMLElement | null> } {
  const sentinelRef = useRef<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const fetchNextPageRef = useRef(fetchNextPage);

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
  }, [fetchNextPage]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !enabled) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setIsIntersecting(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(Boolean(entry?.isIntersecting));
      },
      {
        root,
        rootMargin,
        threshold: 0
      }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [enabled, root, rootMargin]);

  useEffect(() => {
    if (!enabled || !isIntersecting || !hasNextPage || isFetchingNextPage) {
      return;
    }
    fetchNextPageRef.current();
  }, [enabled, isIntersecting, hasNextPage, isFetchingNextPage]);

  return { sentinelRef };
}
