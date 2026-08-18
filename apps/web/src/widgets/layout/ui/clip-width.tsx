import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/** Panel/sidebar open — `--duration-slow`. */
export const CLIP_WIDTH_OPEN_MS = 400;
/** Panel/sidebar close — `--duration-medium`, faster than open. */
export const CLIP_WIDTH_CLOSE_MS = 350;
/** `--ease-smooth-out` */
export const CLIP_WIDTH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** @deprecated Use CLIP_WIDTH_OPEN_MS — kept for existing imports. */
export const CLIP_WIDTH_MS = CLIP_WIDTH_OPEN_MS;

export const CLIP_WIDTH_TRANSITION = `width ${CLIP_WIDTH_OPEN_MS}ms ${CLIP_WIDTH_EASE}` as const;

type ClipWidthProps = {
  open: boolean;
  /** Inner paint width while the shell tweens. */
  contentWidth: number;
  /**
   * After enter, drop the explicit width so a resizable child can size the
   * shell. Keep false when the inner width is always `contentWidth`.
   */
  unlockWhenOpen?: boolean;
  /** Unmount children after the close tween (skip work on public routes). */
  unmountClosed?: boolean;
  /**
   * Tween the in-flow slot width (so the main card shrinks/grows) and slide
   * the paint layer with transform. Same duration and easing both ways.
   */
  overlay?: boolean;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

function readShellWidth(el: HTMLElement | null, fallback: number): number {
  if (!el) return fallback;
  const rect = el.getBoundingClientRect().width;
  if (rect > 0.5) return rect;
  if (el.offsetWidth > 0) return el.offsetWidth;
  return fallback;
}

/**
 * Clip a column to `contentWidth` and tween the shell width.
 *
 * CSS width only — no Motion `layout` / `animate={{ width }}` (those scale-
 * distort children). Open 400ms / close 350ms, `--ease-smooth-out`.
 *
 * Close always re-locks a measured pixel width before collapsing so the main
 * card can expand when leaving routes that show a nav (dashboard → public).
 */
export function ClipWidth({
  open,
  contentWidth,
  unlockWhenOpen = false,
  unmountClosed = false,
  overlay = false,
  className,
  style,
  children,
  onTransitionEnd,
  ...shellProps
}: ClipWidthProps) {
  const [mounted, setMounted] = useState(open || !unmountClosed);
  const [width, setWidth] = useState(0);
  const [lockWidth, setLockWidth] = useState(contentWidth);
  const [unlocked, setUnlocked] = useState(false);
  const [durationMs, setDurationMs] = useState(open ? CLIP_WIDTH_OPEN_MS : CLIP_WIDTH_CLOSE_MS);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef(contentWidth);
  const lastWidthRef = useRef(open ? contentWidth : 0);
  const widthRef = useRef(0);
  const openRef = useRef(open);

  useEffect(() => {
    contentWidthRef.current = contentWidth;
  }, [contentWidth]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) lastWidthRef.current = next;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  // Enter: mount, lock, tween 0 → contentWidth, optionally unlock for resize.
  useLayoutEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timeout = 0;
    let frame = 0;
    const target = contentWidthRef.current;

    setMounted(true);
    setUnlocked(false);
    setLockWidth(target);
    setDurationMs(CLIP_WIDTH_OPEN_MS);
    lastWidthRef.current = target;

    if (widthRef.current <= 0) {
      setWidth(0);
      frame = requestAnimationFrame(() => {
        if (!cancelled) setWidth(target);
      });
    } else {
      setWidth(target);
    }

    timeout = window.setTimeout(() => {
      if (!cancelled && unlockWhenOpen) setUnlocked(true);
    }, CLIP_WIDTH_OPEN_MS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [open, unlockWhenOpen]);

  // Leave: re-lock measured pixel width (handles unlocked/auto), then tween → 0.
  // useLayoutEffect so the lock lands before paint — browsers can't transition from `auto`.
  useLayoutEffect(() => {
    if (open) return;

    const el = shellRef.current;
    if (!el) {
      // Never mounted (e.g. first paint on a public route with unmountClosed).
      return;
    }

    const fallback =
      lastWidthRef.current > 0
        ? lastWidthRef.current
        : widthRef.current > 0
          ? widthRef.current
          : contentWidthRef.current;
    const measured = readShellWidth(el, fallback);

    if (measured <= 0.5) {
      setUnlocked(false);
      setWidth(0);
      if (unmountClosed) setMounted(false);
      return;
    }

    let cancelled = false;
    let frame1 = 0;
    let frame2 = 0;
    let timeout = 0;

    setUnlocked(false);
    setLockWidth(measured);
    setDurationMs(CLIP_WIDTH_CLOSE_MS);
    setWidth(measured);
    lastWidthRef.current = measured;

    // Double rAF: commit the locked pixel width, then collapse so the
    // width transition actually runs (and the main card grows with it).
    frame1 = requestAnimationFrame(() => {
      if (cancelled) return;
      frame2 = requestAnimationFrame(() => {
        if (cancelled) return;
        setWidth(0);
        timeout = window.setTimeout(() => {
          if (!cancelled && unmountClosed && !openRef.current) {
            setMounted(false);
          }
        }, CLIP_WIDTH_CLOSE_MS);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      window.clearTimeout(timeout);
    };
  }, [open, unmountClosed]);

  // Keep lockWidth in sync if contentWidth changes while open and locked.
  useLayoutEffect(() => {
    if (!open || unlocked) return;
    if (lockWidth === contentWidth) return;
    setLockWidth(contentWidth);
    setWidth(contentWidth);
    lastWidthRef.current = contentWidth;
  }, [open, unlocked, contentWidth, lockWidth]);

  if (!mounted) return null;

  if (overlay) {
    const motionMs = open ? CLIP_WIDTH_OPEN_MS : CLIP_WIDTH_CLOSE_MS;
    const motion = `${motionMs}ms ${CLIP_WIDTH_EASE}`;
    return (
      <div
        className={cn("relative h-full min-h-0 shrink-0 overflow-hidden", className)}
        style={{
          width: open ? contentWidth : 0,
          transition: `width ${motion}`,
          ...style
        }}
        {...shellProps}
      >
        <div
          ref={shellRef}
          className="absolute inset-y-0 right-0 h-full min-h-0 overflow-hidden"
          style={{
            width: contentWidth,
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: `transform ${motion}`,
            willChange: "transform",
            contain: "layout paint"
          }}
          onTransitionEnd={(event) => {
            onTransitionEnd?.(event);
            if (event.target !== event.currentTarget) return;
            if (event.propertyName !== "transform") return;
            if (open && unlockWhenOpen) setUnlocked(true);
            if (!open && unmountClosed) setMounted(false);
          }}
        >
          <div className="h-full" style={{ width: contentWidth }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={cn("min-h-0 shrink-0 overflow-hidden", className)}
      style={{
        width: unlocked ? undefined : width,
        transition: unlocked ? undefined : `width ${durationMs}ms ${CLIP_WIDTH_EASE}`,
        willChange: unlocked ? undefined : "width",
        contain: "layout",
        ...style
      }}
      onTransitionEnd={(event) => {
        onTransitionEnd?.(event);
        if (event.target !== event.currentTarget) return;
        if (event.propertyName !== "width") return;
        if (open && unlockWhenOpen && width > 0) setUnlocked(true);
        if (!open && unmountClosed && width === 0) setMounted(false);
      }}
      {...shellProps}
    >
      <div className="h-full" style={unlocked ? undefined : { width: lockWidth }}>
        {children}
      </div>
    </div>
  );
}
