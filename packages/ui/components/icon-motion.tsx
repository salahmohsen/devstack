"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type IconMotionMode = "state" | "hover";

type SharedProps = {
  iconA: ReactNode;
  iconB?: ReactNode;
  /** When mode="state": false → A, true → B. */
  active?: boolean;
  /**
   * `hover`: reacts when an ancestor has `[data-hovered]` (set by Button)
   * or is `:hover` (button/a). Covers the whole control, not just the icon.
   * `state`: driven by the `active` prop only.
   */
  mode?: IconMotionMode;
  className?: string;
  iconClassName?: string;
};

function Root({
  im,
  mode,
  active,
  className,
  children
}: {
  im: "morph" | "slide" | "shake" | "rotate";
  mode: IconMotionMode;
  active: boolean;
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <span
      className={cn("t-im", `t-im-${im}`, className)}
      data-slot="icon-motion"
      data-im={im}
      data-im-mode={mode}
      data-im-ready={ready ? "" : undefined}
      data-state={mode === "state" ? (active ? "b" : "a") : undefined}
      aria-hidden
    >
      {children}
    </span>
  );
}

/**
 * Scale morph between two icons (copy↔check, send↔check, plus↔check, …).
 */
export function IconMorph({
  iconA,
  iconB,
  active = false,
  mode = "state",
  className,
  iconClassName
}: SharedProps & { iconB: React.ReactNode }): React.ReactElement {
  return (
    <Root im="morph" mode={mode} active={active} className={className}>
      <span data-part="a" className={cn("t-im-layer", iconClassName)}>
        {iconA}
      </span>
      <span data-part="b" className={cn("t-im-layer", iconClassName)}>
        {iconB}
      </span>
    </Root>
  );
}

/**
 * Vertical slide swap (github ↔ star). Optional sparkle on B.
 */
export function IconSlideSwap({
  iconA,
  iconB,
  active = false,
  mode = "hover",
  sparkle = false,
  className,
  iconClassName
}: SharedProps & { iconB: React.ReactNode; sparkle?: boolean }): React.ReactElement {
  return (
    <Root im="slide" mode={mode} active={active} className={className}>
      <span data-part="a" className={cn("t-im-layer", iconClassName)}>
        {iconA}
      </span>
      <span data-part="b" className={cn("t-im-layer relative", iconClassName)}>
        {iconB}
        {sparkle ? (
          <span data-part="sparkle" className="t-im-sparkle">
            <svg className="size-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.5-6.2 4.5 2.4-7.6L2 9.6h7.6z" />
            </svg>
          </span>
        ) : null}
      </span>
    </Root>
  );
}

/**
 * Shake on parent hover (delete).
 */
export function IconShake({
  children,
  className,
  active = false,
  mode = "hover"
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  mode?: IconMotionMode;
}): React.ReactElement {
  return (
    <Root im="shake" mode={mode} active={active} className={className}>
      <span data-part="icon" className="t-im-layer">
        {children}
      </span>
    </Root>
  );
}

/**
 * Rotate on parent hover (settings / reload).
 */
export function IconRotate({
  children,
  className,
  active = false,
  mode = "hover",
  degrees = 180
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  mode?: IconMotionMode;
  degrees?: number;
}): React.ReactElement {
  return (
    <Root im="rotate" mode={mode} active={active} className={className}>
      <span
        data-part="icon"
        className="t-im-layer"
        style={{ "--im-rotate-deg": `${degrees}deg` } as CSSProperties}
      >
        {children}
      </span>
    </Root>
  );
}
