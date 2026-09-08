import { type RefObject, useEffect, useState, useSyncExternalStore } from "react";

function subscribe(query: string, onChange: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * Container-query companion for JS gating: true once the observed element is at
 * least `minWidth` px wide (element width ≈ container width when the element
 * fills its `@container` cell). False until after mount/first measure, so
 * SSR/hydration stay stable.
 */
export function useElementMinWidth(ref: RefObject<HTMLElement | null>, minWidth: number) {
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ResizeObserver delivers an initial entry on observe(), so no sync
    // measure here — state updates arrive via the observer callback.
    const update = () => setIsWide(el.getBoundingClientRect().width >= minWidth);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minWidth, ref]);
  return isWide;
}

/** False until after mount so SSR/hydration do not flash a mobile overlay on desktop. */
export function useIsClient() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}
