import { type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Clip a column to `contentWidth` and tween the shell width.
 *
 * CSS width only — no Motion `layout` / `animate={{ width }}` (those scale-
 * distort children). Ease approximates stiffness 320 / damping 36.
 */
export const CLIP_WIDTH_MS = 420;
export const CLIP_WIDTH_TRANSITION =
  `width ${CLIP_WIDTH_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` as const;

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
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export function ClipWidth({
  open,
  contentWidth,
  unlockWhenOpen = false,
  unmountClosed = false,
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
  const shellRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef(contentWidth);

  useEffect(() => {
    contentWidthRef.current = contentWidth;
  }, [contentWidth]);

  if (open && !unlocked && lockWidth !== contentWidth) {
    setLockWidth(contentWidth);
    setWidth(contentWidth);
  }

  useEffect(() => {
    let cancelled = false;
    let timeout = 0;
    let frame2 = 0;
    const target = contentWidthRef.current;

    if (open) {
      const frame = requestAnimationFrame(() => {
        if (cancelled) return;
        setMounted(true);
        setUnlocked(false);
        setLockWidth(target);
        setWidth(0);
        frame2 = requestAnimationFrame(() => {
          if (!cancelled) setWidth(target);
        });
      });
      timeout = window.setTimeout(() => {
        if (!cancelled && unlockWhenOpen) setUnlocked(true);
      }, CLIP_WIDTH_MS);
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        cancelAnimationFrame(frame2);
        window.clearTimeout(timeout);
      };
    }

    if (unmountClosed && !shellRef.current) return;

    const measured = shellRef.current?.offsetWidth ?? 0;
    const current = measured > 0 ? measured : target;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      setUnlocked(false);
      setLockWidth(current);
      setWidth(current);
      frame2 = requestAnimationFrame(() => {
        if (cancelled) return;
        setWidth(0);
        if (!unmountClosed) return;
        timeout = window.setTimeout(() => {
          if (!cancelled) setMounted(false);
        }, CLIP_WIDTH_MS);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(frame2);
      window.clearTimeout(timeout);
    };
  }, [open, unlockWhenOpen, unmountClosed]);

  if (!mounted) return null;

  return (
    <div
      ref={shellRef}
      className={cn("min-h-0 shrink-0 overflow-hidden", className)}
      style={{
        width: unlocked ? undefined : width,
        transition: unlocked ? undefined : CLIP_WIDTH_TRANSITION,
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
